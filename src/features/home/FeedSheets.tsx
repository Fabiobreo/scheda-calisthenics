import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Field, Skeleton } from '../../components/ui';
import { useCatalog, useCopySharedWorkout, useData, useFeed, useMarkFeedRead, useSharedWorkout } from '../../data/hooks';
import type { FeedEvent } from '../../data/types';
import { longDate, shortDate, todayStr } from '../../lib/dates';
import { fmtSets, plural } from '../../lib/format';
import { copySteps } from '../../lib/share';
import { useToast } from '../../app/toast';
import { chainName, recordText } from '../livello/levelView';
import { NewsList } from './HomeView';
import { personName, recordNews, workoutName } from './socialView';

/** Quante novità mostra "Vedi tutte" (il database ne dà al massimo 100 per volta). */
const ALL_NEWS = 100;

/** "Vedi tutte": l'elenco completo delle novità. Aprirlo le segna come lette. */
export function NewsSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (e: FeedEvent) => void }) {
  const feed = useFeed(ALL_NEWS);
  const mark = useMarkFeedRead();
  const events = feed.data?.events ?? [];
  const unread = feed.data?.unread ?? 0;
  // Una volta, quando l'elenco è arrivato e c'è qualcosa di non letto. Le righe nuove restano evidenziate finché il
  // foglio è aperto, anche se nel frattempo l'elenco si rilegge e il server le dà per lette.
  const [fresh, setFresh] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (fresh || !feed.isSuccess || unread === 0) return;
    setFresh(new Set(events.filter((e) => e.unread).map((e) => e.id)));
    mark.mutate();
  }, [fresh, feed.isSuccess, unread, events, mark]);
  const shown = fresh ? events.map((e) => ({ ...e, unread: fresh.has(e.id) })) : events;

  return (
    <Sheet title="Novità" sub="Dalle persone che segui." className="nv-sheet" onClose={onClose}>
      {feed.isLoading && <Skeleton inline />}
      {feed.error && !feed.data && (
        <p className="empty" role="alert">
          Non riesco a leggere le novità. Controlla la connessione e riprova.
        </p>
      )}
      {feed.data && events.length === 0 && <p className="empty">Ancora nessuna novità.</p>}
      {shown.length > 0 && <NewsList events={shown} onOpen={onOpen} />}
      {events.length >= ALL_NEWS && <p className="hint mt-12">Qui ci sono le ultime {ALL_NEWS}.</p>}
    </Sheet>
  );
}

/** "Record": il record che un amico ha condiviso. Voce, valore, data e punti guadagnati; mai il suo peso corporeo. */
export function RecordNewsSheet({ event, onClose }: { event: FeedEvent; onClose: () => void }) {
  const r = recordNews(event);
  const name = personName(event.actorName);
  return (
    <Sheet title={r ? chainName(r.subId) : 'Record'} sub={`Record di ${name}`} className="nv-rec" onClose={onClose}>
      {r ? (
        <>
          <p className="nv-rec-v">{recordText(r)}</p>
          <dl className="nv-rec-d">
            {r.date && (
              <div>
                <dt>Quando</dt>
                <dd>{longDate(r.date)}</dd>
              </div>
            )}
            {r.gained !== null && r.gained > 0 && (
              <div>
                <dt>Punti guadagnati</dt>
                <dd>+{new Intl.NumberFormat('it-IT').format(r.gained)}</dd>
              </div>
            )}
          </dl>
          <p className="hint mt-12">È il record che {name} ha condiviso con chi lo segue. Il resto dei suoi record resta privato.</p>
        </>
      ) : (
        <p className="empty">Questo record non si può più aprire.</p>
      )}
    </Sheet>
  );
}

/**
 * "Vedi": un allenamento condiviso, in sola lettura (esercizi, serie, valori), con "Copia nella mia scheda" che lo
 * mette in un giorno del proprio programma. Gli esercizi che mancano tra i propri nascono dal catalogo (o come
 * personalizzati); quelli già in programma quel giorno non si aggiungono due volte.
 */
export function WorkoutSheet({ event, onClose }: { event: FeedEvent; onClose: () => void }) {
  const workout = useSharedWorkout(event.workoutId);
  const { exercises, plan } = useData();
  const catalog = useCatalog();
  const copy = useCopySharedWorkout();
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [dateErr, setDateErr] = useState<string | null>(null);
  const w = workout.data;
  const name = personName(event.actorName);

  const doCopy = () => {
    if (!w) return;
    if (!date) return setDateErr('Scegli il giorno');
    const steps = copySteps(w.items, exercises, catalog.data ?? [], plan.filter((p) => p.date === date));
    const todo = steps.filter((s) => s.kind !== 'skip').length;
    if (!todo) return toast(`Hai già questi esercizi in programma ${shortDate(date)}`);
    copy.mutate(
      { steps, date },
      {
        onSuccess: (n) => {
          toast(`${plural(n, 'esercizio copiato', 'esercizi copiati')} nella scheda di ${shortDate(date)}`);
          onClose();
        },
      },
    );
  };

  return (
    <Sheet title={w?.name ?? workoutName(event)} sub={`Allenamento di ${name}${w ? ` · ${shortDate(w.date)}` : ''}`} className="nv-wo" onClose={onClose}>
      {workout.isLoading && <Skeleton inline />}
      {workout.error && !w && (
        <p className="empty" role="alert">
          Non riesco a leggere l'allenamento. Controlla la connessione e riprova.
        </p>
      )}
      {workout.isSuccess && !w && <p className="empty">Questo allenamento non è più condiviso.</p>}
      {w && (
        <>
          <ol className="nv-wo-list">
            {w.items.map((it, i) => (
              <li key={i}>
                <b>{it.name}</b>
                <span>{fmtSets(it.sets)}</span>
              </li>
            ))}
          </ol>
          {w.items.length === 0 ? (
            <p className="empty">Non ci sono esercizi da mostrare.</p>
          ) : (
            <div className="form nv-wo-copy">
              <Field
                label="Copia nel giorno"
                type="date"
                value={date}
                error={dateErr ?? undefined}
                hint="Gli esercizi entrano nel tuo programma di quel giorno con serie, valori e recupero: poi li ritocchi dalla Scheda."
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateErr(null);
                }}
              />
              <button type="button" className="btn block" disabled={copy.isPending || catalog.isLoading} aria-busy={copy.isPending || undefined} onClick={doCopy}>
                Copia nella mia scheda
              </button>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
