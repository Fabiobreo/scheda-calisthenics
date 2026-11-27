import { useSyncExternalStore } from 'react';
import type { BandId } from '../lib/levels';

/**
 * Aspetto dell'app (ticket 43): il fondo (Notte, quello di sempre, o Marmo, chiaro) e il metallo che fa da oro.
 * Sono due attributi su <html>, `data-ground` e `data-metal`: i colori stanno tutti in styles.css. La scelta vale per
 * questo dispositivo (localStorage, niente server) e resta anche uscendo dall'account. Al primo disegno la applica lo
 * script in index.html, che legge la stessa chiave: se cambi `KEY` o i nomi, cambiali anche lì.
 */
export type Ground = 'notte' | 'marmo';
export type Metal = 'oro' | 'rame' | 'argento' | 'cobalto' | 'ametista';
export type Look = { ground: Ground; metal: Metal };

export const GROUNDS: readonly { v: Ground; l: string }[] = [
  { v: 'notte', l: 'Notte' },
  { v: 'marmo', l: 'Marmo' },
];

/** `from`: il livello complessivo da cui il metallo si può scegliere; senza, è libero. */
export const METALS: readonly { v: Metal; l: string; from?: BandId }[] = [
  { v: 'oro', l: 'Oro' },
  { v: 'rame', l: 'Rame' },
  { v: 'argento', l: 'Argento' },
  { v: 'cobalto', l: 'Cobalto' },
  { v: 'ametista', l: 'Ametista', from: 'elite' },
];

const KEY = 'scheda:look';
const DEFAULT: Look = { ground: 'notte', metal: 'oro' };
/** Colore della barra del browser e della finestra installata: il fondo della pagina (--bg). */
const THEME_COLOR: Record<Ground, string> = { notte: '#0b0b0d', marmo: '#ebe6dc' };
const ORDER: readonly BandId[] = ['base', 'intermedio', 'avanzato', 'elite', 'titano', 'leggenda'];

/** Vero se con quel livello complessivo il metallo si può scegliere. */
export function metalUnlocked(metal: Metal, band: BandId): boolean {
  const from = METALS.find((m) => m.v === metal)?.from;
  return !from || ORDER.indexOf(band) >= ORDER.indexOf(from);
}

/** Legge una scelta salvata; valori sconosciuti (una versione più nuova, un file rovinato) tornano a quelli di partenza. */
export function parseLook(raw: string | null): Look {
  try {
    const s = JSON.parse(raw ?? 'null') as Partial<Look> | null;
    return {
      ground: GROUNDS.some((g) => g.v === s?.ground) ? (s!.ground as Ground) : DEFAULT.ground,
      metal: METALS.some((m) => m.v === s?.metal) ? (s!.metal as Metal) : DEFAULT.metal,
    };
  } catch {
    return DEFAULT;
  }
}

function stored(): Look {
  try {
    return parseLook(localStorage.getItem(KEY));
  } catch {
    return DEFAULT;
  }
}

let current: Look | null = null;
const listeners = new Set<() => void>();
const get = () => (current ??= stored());

function apply(look: Look) {
  const html = document.documentElement;
  html.dataset.ground = look.ground;
  html.dataset.metal = look.metal;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[look.ground]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', look.ground === 'marmo' ? 'light' : 'dark');
}

export function setLook(change: Partial<Look>) {
  current = { ...get(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* senza spazio o in navigazione privata: vale fino alla chiusura */
  }
  apply(current);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** La scelta corrente: chi la usa si ridisegna quando cambia. */
export const useLook = (): Look => useSyncExternalStore(subscribe, get);
