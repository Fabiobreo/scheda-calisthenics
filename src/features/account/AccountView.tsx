import { useState } from 'react';
import { useRepo, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { Field } from '../../components/ui';
import { useData, useDeleteAccount, useProfile, useUpdateProfile } from '../../data/hooks';
import { todayStr } from '../../lib/dates';
import { plural } from '../../lib/format';
import { MyTrainerCard, TrainerModeCard } from './CoachingCards';

const CONFIRM_WORD = 'ELIMINA';

/** `inviteCode`: arrivando da un link d'invito, il codice è già compilato. */
export function AccountView({ inviteCode }: { inviteCode?: string }) {
  return (
    <>
      {/* arrivando da un invito la cosa da fare è collegarsi: va in cima */}
      {inviteCode && <MyTrainerCard inviteCode={inviteCode} />}
      <ProfileCard />
      {!inviteCode && <MyTrainerCard />}
      <TrainerModeCard />
      <ExportCard />
      <DeleteCard />
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
      <h2>Account</h2>
      <p className="sub">{session.status === 'ready' ? session.email : ''}</p>
      <div className="form" style={{ marginTop: 14 }}>
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

function ExportCard() {
  const { exercises, entries, plan } = useData();
  const profile = useProfile();
  const repo = useRepo();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    let coaching: Record<string, unknown[]>;
    try {
      coaching = await repo.exportCoaching();
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
        {plural(plan.length, 'esercizio', 'esercizi')} in programma, più schede e collegamenti con i trainer.
      </p>
      <div className="row" style={{ marginTop: 14 }}>
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
      <p className="sub">Cancella l'account con esercizi, registrazioni e programma. Non si può annullare: se vuoi tenere i dati, esportali prima.</p>
      {!open ? (
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn small ghost" onClick={() => setOpen(true)}>
            Elimina account…
          </button>
        </div>
      ) : (
        <div className="form" style={{ marginTop: 14 }}>
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
