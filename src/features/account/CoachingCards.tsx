import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { ConfirmButton, Field } from '../../components/ui';
import { useAcceptInvite, useEndLink, useInviteCode, useLinks, useProfile, useRotateInvite, useUpdateProfile } from '../../data/hooks';
import { shortDate } from '../../lib/dates';

/** Cosa vede un trainer: detto uguale all'atleta prima di collegarsi e al trainer quando attiva la modalità. */
const TRAINER_SEES = 'registrazioni, grafici, record e programma';

export const inviteLink = (code: string) => `${location.origin}/invito/${code}`;

/** Lato atleta: il trainer che ti segue, oppure il codice per collegarti a uno. */
export function MyTrainerCard({ inviteCode }: { inviteCode?: string }) {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const profile = useProfile();
  const links = useLinks();
  const repo = useRepo();
  const accept = useAcceptInvite();
  const end = useEndLink('Scollegato dal trainer');
  const toast = useToast();
  const [code, setCode] = useState(inviteCode ?? '');
  const [preview, setPreview] = useState<{ code: string; trainerName: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  const mine = links.data?.find((l) => l.athleteId === myId);
  const noName = !profile.data?.displayName;

  const check = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast("Scrivi il codice d'invito");
    setChecking(true);
    try {
      const p = await repo.previewInvite(c);
      if (!p) return toast('Codice non valido. Chiedine uno nuovo al tuo trainer.');
      setPreview({ code: c, trainerName: p.trainerName });
    } catch {
      toast('Non riesco a controllare il codice. Riprova.');
    } finally {
      setChecking(false);
    }
  };

  // arrivando dal link d'invito il codice c'è già: la domanda "Collegarti a …?" compare subito, senza "Continua"
  const autoChecked = useRef(false);
  useEffect(() => {
    if (!inviteCode || autoChecked.current || links.isLoading || mine) return;
    autoChecked.current = true;
    void check();
  });

  return (
    <section className="card">
      <h2>Il tuo trainer</h2>
      {mine ? (
        <>
          <p className="sub">
            Ti segue <b>{mine.trainerName ?? 'un trainer senza nome'}</b> dal {shortDate(mine.createdAt.slice(0, 10))}: vede {TRAINER_SEES}, senza
            poterli modificare.
          </p>
          <div className="row mt-14">
            <ConfirmButton confirmLabel="Scollegare?" onConfirm={() => end.mutate(mine.id)}>
              Scollega
            </ConfirmButton>
          </div>
        </>
      ) : preview ? (
        <>
          <p className="sub">
            Collegarti a <b>{preview.trainerName ?? 'questo trainer'}</b>? Potrà vedere {TRAINER_SEES}. Puoi scollegarti quando vuoi, e i dati
            restano tuoi.
          </p>
          <div className="row mt-14">
            <button
              className="btn small"
              disabled={accept.isPending}
              onClick={() => accept.mutate(preview.code, { onSuccess: () => setPreview(null) })}
            >
              Collegati
            </button>
            <button className="btn small ghost" onClick={() => setPreview(null)}>
              Annulla
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sub">Hai un trainer? Inserisci il codice d'invito che ti ha dato, o apri il suo link.</p>
          <div className="form mt-14">
            <Field
              label="Codice d'invito"
              value={code}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              hint={noName ? 'Prima scegli il tuo nome qui sopra: è quello che vedrà il trainer.' : undefined}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="row">
              <button className="btn small" disabled={noName || checking || !code.trim()} onClick={check}>
                {checking ? 'Controllo…' : 'Continua'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** Lato trainer: attivare la modalità e condividere il link d'invito. */
export function TrainerModeCard() {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const profile = useProfile();
  const setMode = useUpdateProfile('Modalità trainer aggiornata');
  const links = useLinks();
  const invite = useInviteCode();
  const rotate = useRotateInvite();
  const toast = useToast();

  if (!profile.data) return null;
  const athletes = links.data?.filter((l) => l.trainerId === myId) ?? [];
  const code = invite.data;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      toast('Link copiato');
    } catch {
      toast('Non riesco a copiare: seleziona il link a mano');
    }
  };

  if (!profile.data.isTrainer)
    return (
      <section className="card">
        <h2>Modalità trainer</h2>
        <p className="sub">
          Segui altri atleti: li inviti con un link e vedi {TRAINER_SEES}. I loro dati restano loro, e possono scollegarsi quando vogliono.
        </p>
        {!profile.data.displayName && <p className="hint mt-10">Prima scegli il tuo nome qui sopra: è quello che vedranno gli atleti.</p>}
        <div className="row mt-14">
          <button className="btn small ghost" disabled={!profile.data.displayName} onClick={() => setMode.mutate({ isTrainer: true })}>
            Attiva modalità trainer
          </button>
        </div>
      </section>
    );

  return (
    <section className="card">
      <h2>Modalità trainer</h2>
      <p className="sub">
        {athletes.length ? (
          <>
            Segui {athletes.length} {athletes.length === 1 ? 'atleta' : 'atleti'}: li trovi in <Link to="/atleti">Atleti</Link>.
          </>
        ) : (
          'Nessun atleta per ora. Manda il link qui sotto a chi vuoi seguire.'
        )}
      </p>
      <div className="form mt-14">
        {code ? (
          <>
            <div className="fld">
              <span>Link d'invito</span>
              <input readOnly value={inviteLink(code)} onFocus={(e) => e.target.select()} aria-label="Link d'invito" />
              <span className="fld-hint">
                Oppure il codice <b className="code">{code}</b>, da inserire in Account → Il tuo trainer.
              </span>
            </div>
            <div className="row">
              <button className="btn small" onClick={copy}>
                Copia link
              </button>
              <ConfirmButton confirmLabel="Il vecchio smette di valere" onConfirm={() => rotate.mutate(undefined)}>
                Nuovo codice
              </ConfirmButton>
            </div>
          </>
        ) : (
          <div className="row">
            <button className="btn small" disabled={rotate.isPending || invite.isLoading} onClick={() => rotate.mutate(undefined)}>
              Crea link d'invito
            </button>
          </div>
        )}
        <div className="row">
          <button
            className="link small"
            disabled={athletes.length > 0}
            onClick={() => setMode.mutate({ isTrainer: false })}
            title={athletes.length ? 'Prima scollega i tuoi atleti' : undefined}
          >
            Disattiva modalità trainer
          </button>
          {athletes.length > 0 && <span className="hint">Prima scollega i tuoi atleti.</span>}
        </div>
      </div>
    </section>
  );
}
