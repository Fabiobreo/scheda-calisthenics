/**
 * Logica di presentazione della Home social (ticket 39): livello e luogo di una persona, testo e bottone di una
 * novità, "3 h fa". Nessun dato nuovo: di un'altra persona arrivano solo nome, fascia del livello e ciò che condivide.
 */
import type { FeedEvent, FollowState, PersonCard, RankingMetric } from '../../data/types';
import { shortDate } from '../../lib/dates';
import { BANDS } from '../../lib/levels';
import { countryName, province } from '../../lib/places';
import { METRICS, metricName } from '../classifiche/rankingView';
import { recordText } from '../livello/levelView';

/** Nome del livello dalla fascia che dà il database (0 = Base … 5 = Leggenda). */
export function bandName(band: number): string {
  const bands = BANDS.complessivo;
  return bands[Math.min(Math.max(Math.trunc(band) || 0, 0), bands.length - 1)].name;
}

/** Dove si allena una persona, se lo posso vedere: la provincia in Italia, altrimenti la nazione. */
export function personPlace(p: Pick<PersonCard, 'country' | 'province'>): string | null {
  return province(p.province)?.name ?? (p.country ? countryName(p.country) : null);
}

/** Riga sotto il nome: "Avanzato · Milano", o solo "Avanzato" per un profilo privato che non seguo. */
export const personSub = (p: Pick<PersonCard, 'band' | 'country' | 'province'>): string => [bandName(p.band), personPlace(p)].filter(Boolean).join(' · ');

export const personName = (name: string | null): string => name?.trim() || 'Senza nome';

/** Iniziale per il tondo accanto al nome. */
export const initial = (name: string | null): string => (name?.trim().charAt(0) || '?').toLocaleUpperCase('it');

/**
 * Il bottone per seguire: che cosa dice e se si può toccare. "Segui" anche per un profilo privato (come su
 * Instagram): lì parte una richiesta, e il bottone diventa "Richiesta inviata".
 */
export function followButton(relation: FollowState): { label: string; disabled: boolean } {
  if (relation === 'accepted') return { label: 'Segui già', disabled: true };
  if (relation === 'pending') return { label: 'Richiesta inviata', disabled: true };
  return { label: 'Segui', disabled: false };
}

const text = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const number = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

export interface RecordNews {
  subId: string;
  stage: string;
  value: number;
  /** YYYY-MM-DD */
  date: string | null;
  /** punti guadagnati nel complessivo col record */
  gained: number | null;
}

/** Il record di una novità, se è scritto come ci si aspetta. Il peso corporeo non c'è: il database non lo manda. */
export function recordNews(e: Pick<FeedEvent, 'kind' | 'payload'>): RecordNews | null {
  if (e.kind !== 'record') return null;
  const subId = text(e.payload.subId);
  const stage = text(e.payload.stage);
  const value = number(e.payload.value);
  if (!subId || !stage || value === null) return null;
  return { subId, stage, value, date: text(e.payload.date), gained: number(e.payload.gained) };
}

/** La classifica del sorpasso, se è una di quelle che l'app conosce. */
export function overtakeMetric(e: Pick<FeedEvent, 'kind' | 'payload'>): RankingMetric | null {
  if (e.kind !== 'overtake') return null;
  return METRICS.find((m) => m === e.payload.metric) ?? null;
}

/** Nome dato all'allenamento condiviso. */
export const workoutName = (e: Pick<FeedEvent, 'payload'>): string => text(e.payload.name)?.trim() || 'Allenamento';

export interface NewsLine {
  /** quello che è successo, senza il nome di chi l'ha fatto: "nuovo record: Straddle · 8 s" */
  text: string;
  /** il bottone: "Record", "Vedi", "Classifica"; null se la novità non si può aprire */
  action: 'Record' | 'Vedi' | 'Classifica' | null;
}

/** Testo e bottone di una novità. Una novità di un tipo che questa versione dell'app non conosce resta leggibile. */
export function newsLine(e: Pick<FeedEvent, 'kind' | 'payload' | 'workoutId'>): NewsLine {
  if (e.kind === 'record') {
    const r = recordNews(e);
    return r ? { text: `nuovo record: ${recordText(r)}`, action: 'Record' } : { text: 'ha fatto un nuovo record', action: null };
  }
  if (e.kind === 'workout') return { text: `ha condiviso l'allenamento «${workoutName(e)}»`, action: e.workoutId ? 'Vedi' : null };
  if (e.kind === 'overtake') {
    const m = overtakeMetric(e);
    return m ? { text: `ti ha superato in classifica: ${metricName(m)}`, action: 'Classifica' } : { text: 'ti ha superato in classifica', action: null };
  }
  return { text: 'ha una novità', action: null };
}

/** Quando: "adesso", "5 min fa", "3 h fa", "ieri", "4 g fa", poi la data. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const min = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (!Number.isFinite(min)) return '';
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ieri';
  if (d < 7) return `${d} g fa`;
  return shortDate(`${then.getFullYear()}-${String(then.getMonth() + 1).padStart(2, '0')}-${String(then.getDate()).padStart(2, '0')}`);
}

/** "Carla vuole seguirti", "Carla e Dario vogliono seguirti", "Carla e altre 2 persone vogliono seguirti". */
export function requestsText(names: (string | null)[]): string {
  const [a, b] = names.map(personName);
  if (names.length === 1) return `${a} vuole seguirti`;
  if (names.length === 2) return `${a} e ${b} vogliono seguirti`;
  return `${a} e altre ${names.length - 1} persone vogliono seguirti`;
}

/** Indirizzo del link "seguimi" da condividere. */
export const followLink = (origin: string, code: string) => `${origin}/segui/${code}`;
