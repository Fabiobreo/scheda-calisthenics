/** Cronometro delle tenute: logica pura, senza tempo reale né audio (si prova con i test). */

/** Segnali del cronometro: `tick` breve, `go` all'inizio della tenuta, `target` all'obiettivo raggiunto. */
export type Cue = 'tick' | 'go' | 'target';

/** Secondi di preparazione tra cui scegliere. */
export const PREP_CHOICES = [0, 3, 5, 10] as const;
export const DEFAULT_PREP = 5;

/**
 * Segnali da dare passando dall'istante `t0` all'istante `t1` (secondi dall'inizio della tenuta: negativi durante la
 * preparazione). Nella preparazione un tick a -3, -2, -1 e il via a 0; con un obiettivo, un tick nei 3 secondi prima
 * e il segnale all'obiettivo. Ogni secondo intero tra t0 (escluso) e t1 (compreso) suona una volta sola, anche se il
 * telefono ha saltato qualche aggiornamento.
 */
export function cues(t0: number, t1: number, target: number): Cue[] {
  const out: Cue[] = [];
  for (let k = Math.floor(t0) + 1; k <= Math.floor(t1); k++) {
    if (k >= -3 && k <= -1) out.push('tick');
    else if (k === 0) out.push('go');
    else if (target > 0 && k === target) out.push('target');
    else if (target > 0 && k > 0 && k >= target - 3 && k < target) out.push('tick');
  }
  return out;
}

/** Secondi interi di tenuta dopo `elapsed` secondi: quelli compiuti, mai negativi. */
export const heldSeconds = (elapsed: number) => Math.max(0, Math.floor(elapsed + 1e-6));
