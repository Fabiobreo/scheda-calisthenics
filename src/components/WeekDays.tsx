import type { ReactNode } from 'react';
import { DAY_SHORT, addDays, longDate, mondayOf, parseDate, todayStr, weekLabel, weekdayIndex } from '../lib/dates';
import { plural } from '../lib/format';

/**
 * Settimana del calendario con frecce, "Torna a oggi" e i sette giorni con quanti esercizi hanno.
 * `onChange(monday, day)`: cambio di settimana (frecce, oggi) o di giorno.
 */
export function WeekDays({
  monday,
  day,
  count,
  onChange,
  detail,
}: {
  monday: string;
  /** 0 = lunedì ... 6 = domenica */
  day: number;
  /** esercizi programmati in una data YYYY-MM-DD */
  count: (date: string) => number;
  onChange: (monday: string, day: number) => void;
  /** contenuto di ogni giorno sotto la data: con questo la settimana diventa una tavola a 7 colonne (desktop) */
  detail?: (date: string) => ReactNode;
}) {
  const today = todayStr();
  const thisMonday = mondayOf(today);

  return (
    <>
      <div className="weeknav">
        <button className="x" onClick={() => onChange(addDays(monday, -7), day)} aria-label="Settimana precedente">
          ‹
        </button>
        <div className="weeknav-t">
          <b>{weekLabel(monday)}</b>
          {monday === thisMonday ? (
            <span>Questa settimana</span>
          ) : (
            <button className="link small" onClick={() => onChange(thisMonday, weekdayIndex())}>
              Torna a oggi
            </button>
          )}
        </div>
        <button className="x" onClick={() => onChange(addDays(monday, 7), day)} aria-label="Settimana successiva">
          ›
        </button>
      </div>
      <div className={`days${detail ? ' board' : ''}`}>
        {DAY_SHORT.map((d, i) => {
          const dt = addDays(monday, i);
          const n = count(dt);
          return (
            <button
              key={d}
              className={`day${i === day ? ' on' : ''}${dt === today ? ' today' : ''}`}
              onClick={() => onChange(monday, i)}
              aria-label={`${longDate(dt)}, ${plural(n, 'esercizio', 'esercizi')}`}
              aria-pressed={i === day}
            >
              <span>{d}</span>
              <i>{parseDate(dt).getDate()}</i>
              {detail ? detail(dt) : <small>{n ? `${n} es.` : '–'}</small>}
            </button>
          );
        })}
      </div>
    </>
  );
}
