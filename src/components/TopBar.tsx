import { useId, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLevel, useProfile } from '../data/hooks';

/**
 * Testata comune di tutte le pagine (ticket 33, al posto di marchio e riepilogo del 12): nome grande con il livello
 * sotto (toccandoli si va ad Account, l'icona accanto lo dice) e a destra il cerchio "Totale", che porta a Livello.
 * I numeri sono quelli del motore attuale (`useLevel`): il livello 0–100 riempie il cerchio, oltre è ELITE. Il motore
 * v2 (ticket 31) cambierà livello (Base…Leggenda) e percentuale, non la testata. Altezza fissa: il contenuto non salta
 * quando i dati arrivano.
 */
export function TopBar({ email, end }: { email: string | null; end?: ReactNode }) {
  const profile = useProfile().data;
  const { summary, isLoading } = useLevel();
  const name = profile?.displayName || email?.split('@')[0] || 'Il tuo profilo';
  const elite = summary.zone === 'elite';
  const level = isLoading ? null : summary.level;
  const levelText = level === null ? 'Livello' : `Livello ${level}${elite ? ' · ELITE' : ''}`;
  return (
    <>
      <NavLink to="/account" className="top-id" aria-label={`${name}, ${levelText}: apri l'account`}>
        <span className="top-name">
          <span>{name}</span>
          <IconUser />
        </span>
        <span className="top-level">{levelText}</span>
      </NavLink>
      <span className="top-end">
        {end}
        <TotalRing level={level} />
      </span>
    </>
  );
}

/** Cerchio "Totale": arco dorato pari al livello (pieno da 100 in su), numero al centro. Porta a Livello. */
function TotalRing({ level }: { level: number | null }) {
  const gid = useId();
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = level === null ? 0 : Math.min(Math.max(level, 0), 100) / 100;
  return (
    <NavLink to="/" end className="total" aria-label={level === null ? 'Totale: apri Livello' : `Totale ${level}: apri Livello`}>
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
        {level ?? '–'}
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
