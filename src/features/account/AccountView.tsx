import { useState } from 'react';
import { useRepo, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { Avatar } from '../../components/Avatar';
import { Field, PageTitle, PasswordField, Seg } from '../../components/ui';
import { useData, useDeleteAccount, useLevel, useProfile, useUpdateProfile } from '../../data/hooks';
import { AVATAR_BODIES } from '../../lib/avatarFigure';
import { todayStr } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import { plural } from '../../lib/format';
import { authMessage } from '../auth/errors';
import { MyTrainerCard, TrainerModeCard } from './CoachingCards';

const CONFIRM_WORD = 'ELIMINA';

/** `inviteCode`: arrivando da un link d'invito, il codice è già compilato. */
export function AccountView({ inviteCode }: { inviteCode?: string }) {
  return (
    <>
      <PageTitle title={inviteCode ? 'Invito del trainer' : 'Account'} />
      {/* arrivando da un invito la cosa da fare è collegarsi: va in cima */}
      {inviteCode && <MyTrainerCard inviteCode={inviteCode} />}
      <ProfileCard />
      <AvatarCard />
      {!inviteCode && <MyTrainerCard />}
      <TrainerModeCard />
      <SecurityCard />
      <ExportCard />
      <DeleteCard />
      <AboutCard />
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
    update.mutate({ displayName: displayName || null }, { onSuccess: () => setName(null) });
  };

  return (
    <section className="card">
      <div className="card-h">
        <h2>Account</h2>
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
          hint="Quello che vedrà il tuo trainer, o i tuoi atleti."
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

/** Figura dell'avatar (ticket 11): uomo o donna, con l'anteprima al livello di oggi. */
function AvatarCard() {
  const profile = useProfile();
  const update = useUpdateProfile('Avatar salvato');
  const { summary } = useLevel();
  const body = profile.data?.avatarBody ?? null;
  return (
    <section className="card">
      <h2>Avatar</h2>
      <p className="sub">Cambia fisico ogni 10 livelli. Verso il livello 100 compare un'aura, in zona ELITE le scosse.</p>
      <div className="avatar-pick">
        <Avatar name={profile.data?.displayName} avatar={summary.avatar} elite={summary.zone === 'elite'} body={body} />
        <div className="fld">
          <span className="fld-l">Figura</span>
          <Seg label="Figura dell'avatar" value={body} options={AVATAR_BODIES} onChange={(v) => v !== body && update.mutate({ avatarBody: v })} />
          {!body && <span className="fld-hint">Finché non scegli, al posto della figura c'è la tua iniziale.</span>}
        </div>
      </div>
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
    try {
      const [c, bodyWeights, levelRecords] = await Promise.all([repo.exportCoaching(), repo.listBodyWeights(), repo.listLevelRecords()]);
      coaching = c;
      // peso corporeo e record di livello (ticket 09); il livello si ricalcola dai record
      levels = { bodyWeights, levelRecords };
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
        {plural(plan.length, 'esercizio', 'esercizi')} in programma, peso corporeo e record di livello, più schede e collegamenti con i trainer.
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
      <p className="sub">Cancella l'account con esercizi, registrazioni, programma, peso e record. Non si può annullare: se vuoi tenere i dati, esportali prima.</p>
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
