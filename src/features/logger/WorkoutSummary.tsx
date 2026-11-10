import { useEffect } from 'react';
import { CountUp, Ring, Sparks } from '../../components/ui';
import type { Exercise, PlanItem } from '../../data/types';
import { durationMin, isFinished, type WorkoutSession } from '../../lib/workout';

/**
 * Riepilogo a fine sessione (ticket 25): anello del giorno, esercizi, serie, record battuti e minuti;
 * sotto, i record uno per uno e cosa è rimasto da fare.
 */
export function WorkoutSummary({ session, planById, exercises, onClose }: {
  session: WorkoutSession;
  planById: Map<string, PlanItem>;
  exercises: Exercise[];
  onClose: () => void;
}) {
  const nameOf = (planId: string) => exercises.find((e) => e.id === planById.get(planId)?.exerciseId)?.name;
  const names = (ids: string[]) => ids.map(nameOf).filter((n): n is string => !!n);
  const skipped = names(session.skipped);
  // chiusa con "Termina" prima della fine: quello che restava in coda
  const left = names(session.queue);
  const dayDone = session.before.length + session.done.length;
  const dayTotal = dayDone + session.skipped.length + session.queue.length;
  const records = session.records.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('locked');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
    };
  }, [onClose]);

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet wo-sum" role="dialog" aria-modal="true" aria-labelledby="wo-sum-title">
        <div className="card-h">
          <h2 id="wo-sum-title">{isFinished(session) ? 'Allenamento finito' : 'Allenamento chiuso'}</h2>
          <button className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>

        <div className="wo-hero">
          {records > 0 && <Sparks />}
          <Ring done={dayDone} total={dayTotal} label={`${dayDone} di ${dayTotal} esercizi del giorno fatti`} />
        </div>

        <div className="stats wo-stats">
          <div className="stat">
            <b>
              <CountUp value={session.done.length} />
            </b>
            <small>{session.done.length === 1 ? 'esercizio' : 'esercizi'}</small>
          </div>
          <div className="stat">
            <b>
              <CountUp value={session.sets} />
            </b>
            <small>serie</small>
          </div>
          <div className="stat">
            <b className={records ? 'fire' : undefined}>
              <CountUp value={records} />
            </b>
            <small>record</small>
          </div>
          <div className="stat">
            <b>
              <CountUp value={durationMin(session)} />
            </b>
            <small>minuti</small>
          </div>
        </div>

        {records > 0 && (
          <ul className="wo-rec" aria-label="Record battuti">
            {session.records.map((r, i) => (
              <li key={i}>
                <span aria-hidden="true">★</span> <b>{r.name}</b> {r.text}
              </li>
            ))}
          </ul>
        )}
        {skipped.length > 0 && <p className="hint">Saltati: {skipped.join(', ')}</p>}
        {left.length > 0 && <p className="hint">Da fare: {left.join(', ')}</p>}

        <button className="btn block" onClick={onClose}>
          Fatto
        </button>
      </div>
    </div>
  );
}
