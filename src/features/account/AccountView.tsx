import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { PlaceForm } from '../../components/PlaceFields';
import { Field, PageTitle, PasswordField } from '../../components/ui';
import { useData, useDeleteAccount, useProfile, useUpdateProfile } from '../../data/hooks';
import { todayStr } from '../../lib/dates';
import { publicProfilesEnabled } from '../../lib/privacy';
import { supabase } from '../../lib/supabase';
import { plural } from '../../lib/format';
import { authMessage } from '../auth/errors';
import { MyTrainerCard, TrainerModeCard } from './CoachingCards';

const CONFIRM_WORD = 'ELIMINA';

/** `inviteCode`: arrivando da un link d'invito, il codice è già compilato. */
export function AccountView({ inviteCode }: { inviteCode?: string }) {
  return (
    <>
      <PageTitle show title={inviteCode ? 'Invito del trainer' : 'Account'} />
      {/* arrivando da un invito la cosa da fare è collegarsi: va in cima */}
      {inviteCode && <MyTrainerCard inviteCode={inviteCode} />}
      {/* su schermo largo le schede vanno su due colonne (audit A06) */}
      <div className="masonry">
        <ProfileCard />
        <RankingCard />
        {!inviteCode && <MyTrainerCard />}
        <TrainerModeCard />
        <SecurityCard />
        <ExportCard />
        <DeleteCard />
        <AboutCard />
      </div>
    </>
  );
}

function ProfileCard() {
  const session = useSession();
  const profile = useProfile();
  const update = useUpdateProfile();
  const toast = useToast();
  // null = nessuna modifica in corso: mostra il nome salvato
  const [name, setName] = useState<string | null>(null);
  const saved = profile.data?.displayName ?? '';
  const value = name ?? saved;

  const save = () => {
    const displayName = value.trim();
    if (displayName.length > 60) return toast('Nome troppo lungo');
    // un profilo pubblico compare col nome nelle classifiche: non può restare senza (ticket 38)
    if (!displayName && profile.data && !profile.data.isPrivate) return toast('Un profilo pubblico ha bisogno del nome: prima torna privato');
    update.mutate({ displayName: displayName || null }, { onSuccess: () => setName(null) });
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>Profilo</h2>
        <button className="btn small ghost" onClick={() => supabase.auth.signOut()}>
          Esci
        </button>
      </div>
      <p className="sub">{session.status === 'ready' ? session.email : ''}</p>
      <div className="form mt-14">
        <Field
          label="Nome"
          value={value}
          maxLength={60}
          autoComplete="name"
          disabled={profile.isLoading}
          hint="Quello che vedono il tuo trainer, i tuoi atleti, chi ti cerca per nome e chi ti trova nelle classifiche."
          onChange={(e) => setName(e.target.value)}
        />
        <div className="row">
          <button className="btn small" onClick={save} disabled={name === null || value.trim() === saved}>
            Salva
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Luogo e visibilità nelle classifiche (ticket 38). Il profilo nasce privato; si diventa pubblici solo da qui, con una
 * conferma che dice che cosa diventa visibile, e solo se c'è un nome e l'informativa sulla privacy è completa
 * (`publicProfilesEnabled`). Tornare privati è sempre possibile, senza conferma. Dal ticket 39 anche l'interruttore
 * "Condividi i nuovi record con gli amici" (acceso di partenza: lo vedono solo le persone che seguono l'utente).
 */
function RankingCard() {
  const profile = useProfile();
  const update = useUpdateProfile('Visibilità salvata');
  const share = useUpdateProfile('Condivisione dei record salvata');
  const [confirm, setConfirm] = useState(false);
  const p = profile.data;
  const isPublic = p ? !p.isPrivate : false;
  const enabled = publicProfilesEnabled();
  const blocked = !p ? null : isPublic ? null : !enabled ? 'I profili pubblici si potranno attivare quando l’informativa sulla privacy sarà completa.' : !p.displayName ? 'Per diventare pubblico scegli prima il tuo nome, qui sopra.' : null;

  const toggle = () => {
    if (!p) return;
    if (isPublic) update.mutate({ isPrivate: true });
    else setConfirm(true);
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>Luogo, classifiche e amici</h2>
        <Link className="btn small ghost" to="/persone">
          Persone
        </Link>
      </div>
      <p className="sub">Dove ti alleni decide in quali classifiche entri. Lo scegli da un elenco: l'app non usa la posizione del telefono.</p>
      <PlaceForm />
      <label className="check-row mt-16">
        <input type="checkbox" checked={isPublic} disabled={!p || update.isPending || (!isPublic && blocked !== null)} onChange={toggle} />
        Profilo pubblico
      </label>
      <p className="hint mt-8">
        {isPublic
          ? 'Chi usa l’app vede il tuo nome e i tuoi punti nelle classifiche, e può seguirti senza chiedere. Peso corporeo e record che non condividi restano solo tuoi.'
          : 'Ora sei privato: nelle classifiche il tuo nome lo vede solo chi ti segue, e per seguirti serve una richiesta che accetti tu. Per gli altri sei una posizione senza nome.'}
      </p>
      {blocked && <p className="hint mt-8">{blocked}</p>}
      {confirm && (
        <div className="notice mt-12" role="alertdialog" aria-label="Conferma profilo pubblico">
          <p>
            Rendendo pubblico il profilo, <b>{p?.displayName}</b> e i tuoi punti saranno visibili a chiunque usi l'app nelle classifiche del mondo e del tuo luogo, chiunque potrà seguirti subito e le richieste in attesa saranno accettate. Puoi tornare privato quando vuoi: chi ti segue già resta.
          </p>
          <div className="row mt-10">
            <button
              type="button"
              className="btn small"
              disabled={update.isPending}
              onClick={() => update.mutate({ isPrivate: false }, { onSettled: () => setConfirm(false) })}
            >
              Rendi pubblico
            </button>
            <button type="button" className="btn small ghost" onClick={() => setConfirm(false)}>
              Annulla
            </button>
          </div>
        </div>
      )}
      <label className="check-row mt-16">
        <input type="checkbox" checked={p?.shareRecords ?? true} disabled={!p || share.isPending} onChange={() => p && share.mutate({ shareRecords: !p.shareRecords })} />
        Condividi i nuovi record con gli amici
      </label>
      <p className="hint mt-8">
        {(p?.shareRecords ?? true)
          ? 'Quando un record migliora il tuo punteggio, chi ti segue lo trova tra le novità: esercizio e valore, mai il tuo peso corporeo. Salvando un record puoi scegliere di non condividerlo.'
          : 'I tuoi nuovi record non compaiono tra le novità di chi ti segue.'}
      </p>
      <p className="hint mt-12">
        <Link to="/privacy">Informativa sulla privacy</Link>
      </p>
    </section>
  );
}

/**
 * Cambio password ed email da dentro l'app (audit A05). La password chiede quella attuale: un telefono lasciato
 * sbloccato non basta per prendersi l'account. L'email nuova vale solo dopo la conferma da entrambi gli indirizzi.
 */
function SecurityCard() {
  const session = useSession();
  const email = session.status === 'ready' ? session.email : null;
  const [open, setOpen] = useState<'password' | 'email' | null>(null);
  return (
    <section className="card">
      <h2>Accesso e sicurezza</h2>
      <p className="sub">La password e l'email con cui entri.</p>
      {open === null && (
        <div className="row mt-14">
          <button className="btn small ghost" onClick={() => setOpen('password')}>
            Cambia password
          </button>
          <button className="btn small ghost" onClick={() => setOpen('email')}>
            Cambia email
          </button>
        </div>
      )}
      {open === 'password' && email && <PasswordForm email={email} onDone={() => setOpen(null)} />}
      {open === 'email' && email && <EmailForm email={email} onDone={() => setOpen(null)} />}
    </section>
  );
}

function PasswordForm({ email, onDone }: { email: string; onDone: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: typeof errors = {};
    if (!current) errs.current = 'Scrivi la password attuale.';
    if (next.length < 8) errs.next = 'Almeno 8 caratteri.';
    else if (next === current) errs.next = 'Deve essere diversa da quella attuale.';
    setErrors(errs);
    if (errs.current || errs.next) return;
    setBusy(true);
    try {
      // la password attuale si verifica rientrando con lei: stesso utente, sessione rinnovata
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error)
        return setErrors({ current: check.error.code === 'invalid_credentials' ? 'Password attuale sbagliata.' : authMessage(check.error) });
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return setErrors({ next: authMessage(error) });
      toast('Password cambiata');
      onDone();
    } catch {
      setErrors({ next: 'Connessione non riuscita. Controlla la rete e riprova.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form mt-14" onSubmit={submit} noValidate>
      <fieldset disabled={busy}>
        {/* per il gestore password: a quale account appartiene la password nuova */}
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <PasswordField label="Password attuale" autoComplete="current-password" value={current} error={errors.current} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordField label="Nuova password" autoComplete="new-password" value={next} hint="Almeno 8 caratteri." error={errors.next} onChange={(e) => setNext(e.target.value)} />
        <div className="row">
          <button className="btn small" aria-busy={busy || undefined}>
            Cambia password
          </button>
          <button type="button" className="btn small ghost" onClick={onDone}>
            Annulla
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function EmailForm({ email, onDone }: { email: string; onDone: () => void }) {
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = next.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setError('Indirizzo email non valido.');
    if (v.toLowerCase() === email.toLowerCase()) return setError("È già l'email del tuo account.");
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: location.origin });
      if (error) return setError(authMessage(error));
      setSent(v);
    } catch {
      setError('Connessione non riuscita. Controlla la rete e riprova.');
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <div className="notice mt-14" role="status">
        <p>
          Ti abbiamo scritto a <b>{email}</b> e a <b>{sent}</b>: apri il link in <b>entrambe</b> le email. Fino ad allora entri
          ancora con {email}.
        </p>
        <button className="link" onClick={onDone}>
          Ok
        </button>
      </div>
    );

  return (
    <form className="form mt-14" onSubmit={submit} noValidate>
      <fieldset disabled={busy}>
        <Field
          label="Nuova email"
          type="email"
          autoComplete="email"
          value={next}
          error={error || undefined}
          hint="Arriverà un link di conferma sia qui sia all'indirizzo attuale."
          onChange={(e) => {
            setNext(e.target.value);
            setError('');
          }}
        />
        <div className="row">
          <button className="btn small" aria-busy={busy || undefined}>
            Cambia email
          </button>
          <button type="button" className="btn small ghost" onClick={onDone}>
            Annulla
          </button>
        </div>
      </fieldset>
    </form>
  );
}

/** Versione dell'app e contatto del supporto (audit A05). L'email del supporto è facoltativa: `VITE_SUPPORT_EMAIL`. */
function AboutCard() {
  const support = import.meta.env.VITE_SUPPORT_EMAIL;
  return (
    <section className="card">
      <h2>Informazioni</h2>
      <p className="sub">
        Scheda Calisthenics · versione {__APP_VERSION__}
        {__APP_COMMIT__ && ` (${__APP_COMMIT__})`}
      </p>
      <p className="sub">
        <Link to="/privacy">Informativa sulla privacy</Link>
      </p>
      {support && (
        <p className="sub">
          Problemi o idee? Scrivi a <a href={`mailto:${support}?subject=${encodeURIComponent(`Scheda Calisthenics ${__APP_VERSION__}`)}`}>{support}</a>.
        </p>
      )}
    </section>
  );
}

function ExportCard() {
  const { exercises, entries, plan } = useData();
  const profile = useProfile();
  const repo = useRepo();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    let coaching: Record<string, unknown[]>;
    let levels: Record<string, unknown[]>;
    let social: Record<string, unknown[]>;
    try {
      const [c, levelRecords, s] = await Promise.all([repo.exportCoaching(), repo.listLevelRecords(), repo.exportSocial()]);
      coaching = c;
      // chi segui e chi ti segue, i blocchi, gli allenamenti che hai condiviso (ticket 39)
      social = s;
      // record di livello, ognuno col suo peso corporeo dove serve (ticket 32); il livello si ricalcola dai record
      levels = { levelRecords };
    } catch {
      setBusy(false);
      return toast('Non riesco a leggere tutti i dati. Riprova.');
    }
    setBusy(false);
    const name = new Map(exercises.map((e) => [e.id, e.name]));
    const data = {
      exportedAt: new Date().toISOString(),
      profile: profile.data ?? null,
      exercises,
      // il nome accanto all'id: il file si legge anche senza l'app
      entries: entries.map((e) => ({ ...e, exercise: name.get(e.exerciseId) ?? null })),
      plan: plan.map((p) => ({ ...p, exercise: name.get(p.exerciseId) ?? null })),
      // schede (come trainer), assegnazioni e collegamenti, anche quelli chiusi
      ...levels,
      ...coaching,
      ...social,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `scheda-calisthenics-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card">
      <h2>I tuoi dati</h2>
      <p className="sub">
        Scarica tutto in un file JSON: {plural(exercises.length, 'esercizio', 'esercizi')}, {plural(entries.length, 'registrazione', 'registrazioni')},{' '}
        {plural(plan.length, 'esercizio', 'esercizi')} in programma e record di livello, più schede, collegamenti con i trainer, chi segui e gli allenamenti condivisi.
      </p>
      <div className="row mt-14">
        <button className="btn small ghost" disabled={busy} onClick={download}>
          {busy ? 'Preparo il file…' : 'Esporta i dati'}
        </button>
      </div>
    </section>
  );
}

function DeleteCard() {
  const del = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');

  return (
    <section className="card">
      <h2>Elimina account</h2>
      <p className="sub">Cancella l'account con esercizi, registrazioni, programma, record, chi segui e quello che hai condiviso. Non si può annullare: se vuoi tenere i dati, esportali prima.</p>
      {!open ? (
        <div className="row mt-14">
          <button className="btn small ghost" onClick={() => setOpen(true)}>
            Elimina account…
          </button>
        </div>
      ) : (
        <div className="form mt-14">
          <Field
            label={`Scrivi ${CONFIRM_WORD} per confermare`}
            value={word}
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            onChange={(e) => setWord(e.target.value)}
          />
          <div className="row">
            <button className="btn small danger" disabled={word.trim().toUpperCase() !== CONFIRM_WORD || del.isPending} onClick={() => del.mutate()}>
              {del.isPending ? 'Elimino…' : 'Elimina definitivamente'}
            </button>
            <button
              className="btn small ghost"
              onClick={() => {
                setOpen(false);
                setWord('');
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
