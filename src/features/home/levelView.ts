/**
 * Logica di presentazione della Home "Livello" (ticket 10): ordine degli assi, scala del pentagono, testi dei record
 * e messaggi di celebrazione. Nessuna formula di punteggio: i numeri arrivano tutti dal motore (`src/lib/levels`).
 */
import { CATEGORIES, subRule, type CategoryId, type LevelSummary, type StageOption } from '../../lib/levels';

/** Assi del pentagono in senso orario dall'alto, come nell'esempio del documento. */
export const AXES: readonly CategoryId[] = ['fondamentali-spinta', 'fondamentali-tirata', 'skill-tirata', 'skill-spinta', 'handbalance'];

export const categoryName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

/** Quota del raggio dove sta il 100: la zona base occupa la parte grande del pentagono, l'ELITE l'anello esterno. */
export const BASE_RING = 0.72;

/**
 * Distanza dal centro (0–1) di un valore 0–200. Scala a due tratti: 0–100 fino all'anello del 100, 101–200 nell'anello
 * esterno. Così chi è sotto 100 (quasi tutti) non resta schiacciato al centro.
 */
export function radial(value: number): number {
  const v = Math.max(0, Math.min(200, value));
  return v <= 100 ? (v / 100) * BASE_RING : BASE_RING + ((v - 100) / 100) * (1 - BASE_RING);
}

/** Percentuale di un sotto-esercizio come si legge: "40%" o "ELITE 66%". */
export const subPercentText = (s: { zone: 'base' | 'elite'; percent: number }) => (s.zone === 'elite' ? `ELITE ${s.percent}%` : `${s.percent}%`);

const UNIT: Record<StageOption['measure'], string> = { reps: 'rip.', seconds: 's', kg: 'kg' };

const num = (n: number) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);

/** Unità della progressione di un record ("rip.", "s", "kg"). */
export function stageUnit(subId: string, stageId: string): string {
  const stage = subRule(subId)?.stages.find((s) => s.id === stageId);
  return stage ? UNIT[stage.measure] : '';
}

/** Testo di un record: "Straddle · 5 s", "OAP · 2 rip.", "Zavorra 30 kg", "Bilanciere 60 kg". */
export function recordText(r: { subId: string; stage: string; value: number }): string {
  const stage = subRule(r.subId)?.stages.find((s) => s.id === r.stage);
  if (!stage) return `${r.stage} · ${num(r.value)}`;
  if (stage.measure === 'kg') return `${stage.name} ${num(r.value)} kg`;
  return `${stage.name} · ${num(r.value)} ${UNIT[stage.measure]}`;
}

/**
 * Cosa festeggiare passando da `before` a `after` (record nuovo o corretto): livello salito, categoria entrata in
 * ELITE, ELITE sbloccata in un sotto-esercizio. Vuoto se non è cambiato niente di bello.
 */
export function celebrations(before: LevelSummary, after: LevelSummary): string[] {
  const out: string[] = [];
  if (after.level > before.level) out.push(after.zone === 'elite' && before.zone !== 'elite' ? `Livello ${after.level}: sei in zona ELITE!` : `Livello ${after.level}!`);
  for (const cat of after.categories) {
    const prev = before.categories.find((c) => c.categoryId === cat.categoryId);
    if (cat.zone === 'elite' && prev?.zone !== 'elite') out.push(`${categoryName(cat.categoryId)} in zona ELITE`);
    for (const s of cat.subs) {
      const was = prev?.subs.find((p) => p.subId === s.subId);
      if (s.unlocked && !was?.unlocked) out.push(`ELITE sbloccata: ${subRule(s.subId)?.name ?? s.subId}`);
    }
  }
  return out;
}

/** Messaggio per un errore di `validateRecord`, coi limiti della progressione scelta. */
export function validationMessage(err: string, opt: StageOption | undefined): string {
  const unit = opt ? UNIT[opt.measure] : '';
  switch (err) {
    case 'not-a-number':
      return 'Inserisci un numero';
    case 'not-integer':
      return 'Solo numeri interi';
    case 'below-min':
      return opt ? `Il minimo è ${num(opt.min)} ${unit}` : 'Valore troppo basso';
    case 'above-max':
    case 'locked':
      return opt ? `Il massimo è ${num(opt.max)} ${unit}` : 'Progressione non ancora sbloccata';
    case 'bodyweight-out-of-range':
      return 'Controlla il peso corporeo';
    default:
      return 'Progressione non valida';
  }
}
