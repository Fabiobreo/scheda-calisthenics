import { useId, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLevel, useProfile } from '../data/hooks';

/**
 * Testata comune di tutte le pagine (ticket 33, al posto di marchio e riepilogo del 12): nome grande con il livello
 * sotto (toccandoli si va ad Account, l'icona accanto lo dice) e a destra il cerchio "Totale", che porta a Livello.
 * I numeri sono quelli del motore v2 (`useLevel`): sotto il nome il livello complessivo col suo nome ("Avanzato"),
 * nel cerchio la % dentro quel livello (30, decisione 1). Altezza fissa: il contenuto non salta quando i dati arrivano.
 */
export function TopBar({ email, end }: { email: string | null; end?: ReactNode }) {
  const profile = useProfile().data;
  const { summary, isLoading } = useLevel();
  const name = profile?.displayName || email?.split('@')[0] || 'Il tuo profilo';
  const level = isLoading ? null : { name: summary.name, percent: summary.percent };
  return (
    <>
      <NavLink to="/account" className="top-id" aria-label={`${name}${level ? `, livello ${level.name}` : ''}: apri l'account`}>
        <span className="top-name">
          <span>{name}</span>
          <IconUser />
        </span>
        <span className="top-level">{level ? level.name : 'Livello'}</span>
      </NavLink>
      <span className="top-end">
        {end}
        <TotalRing level={level} />
      </span>
    </>
  );
}

/** Cerchio "Totale": arco dorato e numero al centro sono la % dentro il livello complessivo. Porta a Livello. */
function TotalRing({ level }: { level: { name: string; percent: number } | null }) {
  const gid = useId();
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = level === null ? 0 : level.percent / 100;
  return (
    <NavLink to="/livello" className="total" aria-label={level === null ? 'Totale: apri Livello' : `Totale: ${level.percent}% del livello ${level.name}. Apri Livello`}>
      <svg viewBox="0 0 68 68" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="tot-a" />
            <stop offset="1" className="tot-b" />
          </linearGradient>
        </defs>
        <circle className="tot-bg" cx="34" cy="34" r={r} />
        <circle className="tot-fg" cx="34" cy="34" r={r} stroke={`url(#${gid})`} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <b aria-hidden="true">
        <span>
          {level ? level.percent : '–'}
          {level && <i>%</i>}
        </span>
        <small>Totale</small>
      </b>
    </NavLink>
  );
}

/** Persona: dice che il nome porta ad Account. Decorativa. */
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
  </svg>
);
