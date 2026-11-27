/**
 * Logica di presentazione delle classifiche (ticket 38): nomi di metriche e ambiti, testo dei riquadri, righe con i
 * salti. Nessun conto di punti o posizioni: arrivano dal database (`ranking`), i livelli dal motore.
 */
import type { Profile, RankingMetric, RankingPlace, RankingRow, RankingScope } from '../../data/types';
import { bandPosition, CATEGORIES } from '../../lib/levels';
import { countryName, province } from '../../lib/places';

/**
 * Pastiglie della metrica, nell'ordine del mockup "Home": Generale, poi le categorie come nella pagina Livello
 * (HB, SS, FS, ST, FT). "Generale" è il punteggio complessivo (Michael, 24 novembre 2026).
 */
export const METRICS: readonly RankingMetric[] = ['generale', 'handbalance', 'skill-spinta', 'fondamentali-spinta', 'skill-tirata', 'fondamentali-tirata'];

export const metricName = (m: RankingMetric): string => (m === 'generale' ? 'Generale' : (CATEGORIES.find((c) => c.id === m)?.name ?? m));

const SCOPE_KIND: Record<RankingScope, string> = { amici: 'Amici', provincia: 'Provincia', regione: 'Regione', nazione: 'Nazione', mondo: 'Mondo' };

/** Che cosa è l'ambito ("Provincia"). */
export const scopeKind = (s: RankingScope): string => SCOPE_KIND[s];

type Place = Pick<Profile, 'country' | 'province' | 'region'>;

/** Il luogo dell'ambito per questo utente ("Milano", "Lombardia", "Italia"); null se l'ambito non ha un luogo o manca. */
export function scopePlace(s: RankingScope, profile: Place | undefined): string | null {
  if (!profile) return null;
  if (s === 'provincia') return province(profile.province)?.name ?? null;
  if (s === 'regione') return profile.region;
  if (s === 'nazione') return profile.country ? countryName(profile.country) : null;
  return null;
}

/** Titolo di una classifica: "Milano", "Italia", "Amici", "Mondo". */
export const scopeTitle = (s: RankingScope, profile: Place | undefined): string => scopePlace(s, profile) ?? scopeKind(s);

const NUM = new Intl.NumberFormat('it-IT');
export const fmtInt = (n: number) => NUM.format(n);

/** Testo di un riquadro: posizione grande e riga sotto. "—" quando l'ambito non vale o non c'è una posizione. */
export function tileText(p: RankingPlace | undefined): { big: string; small: string } {
  if (!p) return { big: '…', small: '' };
  if (!p.available) return { big: '—', small: 'non disponibile' };
  if (p.position === null) return { big: '—', small: p.participants ? `su ${fmtInt(p.participants)}` : 'ancora nessuno' };
  return { big: `#${fmtInt(p.position)}`, small: `su ${fmtInt(p.participants)}` };
}

/** Lo stesso, per chi ascolta: "Provincia, Milano: posizione 4 su 12". */
export function tileLabel(s: RankingScope, profile: Place | undefined, p: RankingPlace | undefined): string {
  const place = scopePlace(s, profile);
  const head = place ? `${scopeKind(s)}, ${place}` : scopeKind(s);
  if (!p) return head;
  if (!p.available) return `${head}: non disponibile`;
  if (p.position === null) return `${head}: nessuna posizione, ${fmtInt(p.participants)} partecipanti`;
  return `${head}: posizione ${fmtInt(p.position)} su ${fmtInt(p.participants)}`;
}

/** Perché un ambito non è disponibile, e cosa fare. */
export function unavailableText(s: RankingScope, profile: Place | undefined): string {
  if (!profile?.country) return 'Indica dove ti alleni per entrare in questa classifica.';
  if (s === 'provincia' || s === 'regione') return 'Province e regioni esistono solo per chi si allena in Italia.';
  return 'Questa classifica non è disponibile.';
}

/** Livello con nome dei punti di una riga ("Avanzato"), con le fasce della metrica. */
export const rowLevel = (metric: RankingMetric, score: number): string => bandPosition(metric === 'generale' ? 'complessivo' : metric, score).name;

export type ListItem = { kind: 'row'; row: RankingRow } | { kind: 'gap'; key: string };

/**
 * Le righe da disegnare: tra due righe non consecutive (le prime 3 e i vicini, o un profilo privato in mezzo) va un
 * segno di salto. A pari punti la posizione è la stessa: non è un salto.
 */
export function withGaps(rows: readonly RankingRow[]): ListItem[] {
  const out: ListItem[] = [];
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    // quante righe stanno tra le due: chi è a pari punti con la precedente occupa le posizioni successive
    if (prev && row.position - prev.position > 1 + ties(rows, i - 1)) out.push({ kind: 'gap', key: `gap-${row.userId}` });
    out.push({ kind: 'row', row });
  });
  return out;
}

/** Quante righe mostrate prima di `i` (compresa) hanno la stessa posizione di `rows[i]`, meno una. */
function ties(rows: readonly RankingRow[], i: number): number {
  let n = 0;
  for (let k = i - 1; k >= 0 && rows[k].position === rows[i].position; k--) n++;
  return n;
}

/**
 * Le righe della classifica tra amici che stanno nella Home: le prime `max`; se la mia è più giù prende il posto
 * dell'ultima (il salto lo segna `withGaps`).
 */
export function homeRows(rows: readonly RankingRow[], max: number): RankingRow[] {
  const top = rows.slice(0, max);
  const me = rows.find((r) => r.me);
  if (!me || top.includes(me)) return top;
  return [...top.slice(0, max - 1), me];
}
