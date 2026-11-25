import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './toast';

/** Ogni quanto, con l'app aperta, si chiede al server se c'è una versione nuova. */
const CHECK_EVERY = 30 * 60 * 1000;
/** Appena aperta e non ancora toccata: entro questo tempo la versione nuova si applica subito. */
const FRESH = 10_000;

const loadedAt = Date.now();
let touched = false;
if (typeof window !== 'undefined') {
  const mark = () => (touched = true);
  window.addEventListener('pointerdown', mark, { once: true, capture: true });
  window.addEventListener('keydown', mark, { once: true, capture: true });
}

/**
 * Aggiornamento dell'app senza il pulsante "Aggiorna". La versione nuova si applica (ricaricando la pagina) in un
 * momento in cui non disturba:
 * - subito, se l'app è appena stata aperta e non l'hai ancora toccata (il caso più comune: la apri, trova la versione
 *   nuova, ricarica in un attimo);
 * - altrimenti quando esci dall'app (passi a un'altra app, blocchi il telefono, cambi scheda): al ritorno è già nuova.
 *   Nel frattempo un messaggio lo dice, con "Aggiorna ora" per chi non vuole aspettare.
 * Ricaricare non perde niente: allenamento in corso, bozza, timer e salvataggi in coda sono già sul telefono.
 * Va montato una volta sola (main.tsx), non dentro le pagine.
 */
export function AutoUpdate() {
  const toast = useToast();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // la PWA aperta a lungo (o tenuta in background) non si accorgerebbe da sola delle versioni nuove
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void reg.update().catch(() => {});
      };
      setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', check);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    const apply = () => void updateServiceWorker(true);
    if (document.visibilityState === 'hidden' || (!touched && Date.now() - loadedAt < FRESH)) return apply();
    toast('Nuova versione pronta: arriva la prossima volta che apri l’app', { label: 'Aggiorna ora', run: apply });
    const onHide = () => {
      if (document.visibilityState === 'hidden') apply();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [needRefresh, updateServiceWorker, toast]);

  return null;
}
