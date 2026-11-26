import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';

/** Evento di Chrome/Edge/Samsung Internet (Android e desktop): non è nei tipi standard di TypeScript. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Quando l'utente chiude il foglio senza installare: non lo si ripropone prima di questo tempo. */
const KEY = 'install-dismissed-at';
const SNOOZE = 30 * 24 * 60 * 60 * 1000;
/** Il foglio arriva dopo un attimo: prima l'utente deve vedere l'app, non un popup. */
const DELAY = 4000;

// L'evento può arrivare prima che React monti il componente: lo si tiene da parte fin dal caricamento del modulo.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // niente mini-barra del browser: lo proponiamo noi, col nostro foglio
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone/iPad (anche l'iPad che si presenta come Mac) e Safari su Mac non hanno l'evento: si spiega come fare a mano. */
function manualKind(): 'ios' | 'mac' | null {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return 'ios';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\/|Firefox|OPR\//.test(ua)) return 'mac';
  return null;
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(KEY));
    return at > 0 && Date.now() - at < SNOOZE;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage non disponibile: al prossimo avvio si ripropone, pazienza */
  }
}

/**
 * Foglio "Installa l'app": compare una volta, poco dopo l'apertura, a chi usa il sito dal browser.
 * - Chrome, Edge, Samsung Internet (Android e desktop): il pulsante apre la finestra di installazione del browser.
 * - iPhone/iPad e Safari su Mac: non c'è un pulsante possibile, si spiegano i due passaggi a mano.
 * - Firefox desktop e gli altri browser senza installazione: niente foglio.
 * Chiuso con "Non ora" torna dopo 30 giorni; installata l'app (o aperta come app) non compare più.
 */
export function InstallPrompt() {
  const [, rerender] = useState(0);
  const [open, setOpen] = useState(false);
  const [manual] = useState(manualKind);

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  const can = !!deferred || !!manual;

  useEffect(() => {
    if (!can || open || standalone() || snoozed()) return;
    let t: number;
    // non sopra un altro foglio né sopra il timer di recupero: si riprova poco dopo
    const tryOpen = () => {
      if (document.querySelector('.sheet-back, .timer')) t = window.setTimeout(tryOpen, DELAY);
      else setOpen(true);
    };
    t = window.setTimeout(tryOpen, DELAY);
    return () => clearTimeout(t);
  }, [can, open]);

  if (!open) return null;
  if (!deferred && !manual) return null; // installata nel frattempo

  const close = () => {
    snooze();
    setOpen(false);
  };

  const install = async () => {
    const e = deferred;
    if (!e) return;
    deferred = null;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'dismissed') snooze();
    setOpen(false);
  };

  return (
    <Sheet title="Installa l’app" sub="Si apre dalla schermata Home come un’app vera: a tutto schermo, più veloce, e funziona anche offline." className="inst-sheet" onClose={close}>
      {deferred ? (
        <div className="row inst-act">
          <button type="button" className="btn" onClick={() => void install()}>
            Installa
          </button>
          <button type="button" className="btn ghost" onClick={close}>
            Non ora
          </button>
        </div>
      ) : (
        <>
          <ol className="inst-steps">
            {manual === 'ios' ? (
              <>
                <li>
                  Tocca <ShareIcon /> <b>Condividi</b> nella barra del browser
                </li>
                <li>
                  Scegli <b>Aggiungi alla schermata Home</b>
                </li>
              </>
            ) : (
              <>
                <li>
                  Nel menu <b>File</b> di Safari (oppure <ShareIcon /> Condividi)
                </li>
                <li>
                  Scegli <b>Aggiungi al Dock</b>
                </li>
              </>
            )}
          </ol>
          <button type="button" className="btn ghost block" onClick={close}>
            Ho capito
          </button>
        </>
      )}
    </Sheet>
  );
}

function ShareIcon() {
  return (
    <svg className="inst-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
