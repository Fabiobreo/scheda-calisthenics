import { Link } from 'react-router-dom';
import { useData } from '../../data/hooks';
import { longDate, shortDate, todayStr } from '../../lib/dates';
import { fmtScheme, fmtSets } from '../../lib/format';
import { byDay } from '../../lib/plan';
import { useLogger } from '../logger/Logger';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Oggi" in cima alla Home (audit A03): aprendo l'app in palestra la prima cosa è l'allenamento del giorno, con
 * "Registra" a un tocco. Senza programma oggi: il prossimo giorno in programma, o l'invito a preparare la settimana.
 * Solo per l'atleta: nella vista del trainer la Home dell'atleta non la mostra.
 */
export function TodayCard() {
  const { exercises, entries, plan } = useData();
  const openLogger = useLogger();
  const today = todayStr();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const visible = plan.filter((p) => byId.has(p.exerciseId));
  const items = visible.filter((p) => p.date === today).sort(byDay);
  const doneToday = (exerciseId: string) => entries.find((e) => e.exerciseId === exerciseId && e.kind === 'training' && e.date === today);
  const doneCount = items.filter((p) => doneToday(p.exerciseId)).length;

  if (!items.length) {
    const next = visible.filter((p) => p.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const nextCount = next ? visible.filter((p) => p.date === next.date).length : 0;
    return (
      <section className="card today" aria-labelledby="today-h">
        <div className="card-h">
          <h2 id="today-h">Oggi</h2>
          <Link className="btn small ghost" to="/scheda">
            Scheda
          </Link>
        </div>
        <p className="sub">
          {next
            ? `Riposo. Prossimo allenamento ${shortDate(next.date)}: ${nextCount} ${nextCount === 1 ? 'esercizio' : 'esercizi'}.`
            : 'Niente in programma: prepara la settimana dalla Scheda.'}
        </p>
      </section>
    );
  }

  return (
    <section className="card today" aria-labelledby="today-h">
      <div className="card-h">
        <h2 id="today-h">Oggi</h2>
        <span className={`today-count${doneCount === items.length ? ' all' : ''}`}>
          {doneCount === items.length ? 'Fatto ✓' : `${doneCount} di ${items.length}`}
        </span>
      </div>
      <p className="sub">{cap(longDate(today))}</p>
      <ul className="today-list">
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const saved = doneToday(ex.id);
          return (
            <li key={p.id} className={saved ? 'done' : undefined}>
              <span className="today-txt">
                <b>{ex.name}</b>
                <small>{saved ? `Registrato: ${fmtSets(saved.sets)}` : fmtScheme(p.scheme)}</small>
              </span>
              <button
                className={`btn small${saved ? ' ghost' : ''}`}
                onClick={() => openLogger(saved ? { entry: saved } : { exerciseId: ex.id, date: today, scheme: p.scheme, coachNote: p.note })}
                aria-label={`${saved ? 'Apri' : 'Registra'} ${ex.name}`}
              >
                {saved ? 'Apri' : 'Registra'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
