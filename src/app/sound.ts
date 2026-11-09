/** Suoni brevi e vibrazione per il cronometro delle tenute. */

let ctx: AudioContext | null = null;

/**
 * Prepara l'audio. Va chiamata durante un tocco dell'utente: fuori da un gesto il browser (soprattutto iOS) tiene
 * l'audio bloccato.
 */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    /* niente audio */
  }
}

/** Un bip: `freq` in Hz, `dur` in secondi, `at` secondi da adesso. */
export function tone(freq: number, dur: number, at = 0) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* ignora */
  }
}

export const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignora */
  }
};
