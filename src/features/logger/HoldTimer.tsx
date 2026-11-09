import { useEffect, useRef, useState } from 'react';
import { tone, vibrate } from '../../app/sound';
import { cues, DEFAULT_PREP, heldSeconds, PREP_CHOICES, type Cue } from '../../lib/hold';

const PREP_KEY = 'scheda:hold-prep';
const AUTO_KEY = 'scheda:hold-auto-stop';

function readNum(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key));
    return localStorage.getItem(key) !== null && Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* ignora */
  }
}

function play(c: Cue) {
  if (c === 'tick') {
    tone(660, 0.12);
    vibrate(60);
  } else if (c === 'go') {
    tone(990, 0.35);
    vibrate(300);
  } else {
    tone(990, 0.18);
    tone(1320, 0.3, 0.22);
    vibrate([200, 100, 200]);
  }
}

/**
 * Cronometro a schermo intero per una tenuta: preparazione con conto alla rovescia, poi i secondi che passano.
 * Bip e vibrazione al via, nei 3 secondi prima dell'obiettivo e all'obiettivo. Il pulsante grande occupa mezzo
 * schermo: si ferma anche toccando alla cieca. Con "ferma da solo" la serie finisce all'obiettivo.
 * Il tempo si calcola dall'orologio, non contando gli aggiornamenti: resta giusto anche se il telefono rallenta.
 *
 * `target`: secondi previsti (0 = nessun obiettivo). `onStop`: secondi interi tenuti.
 */
export function HoldTimer({ target, label, onStop, onCancel }: { target: number; label: string; onStop: (seconds: number) => void; onCancel: () => void }) {
  const [prep, setPrep] = useState(() => {
    const p = readNum(PREP_KEY, DEFAULT_PREP);
    return (PREP_CHOICES as readonly number[]).includes(p) ? p : DEFAULT_PREP;
  });
  const [autoStop, setAutoStop] = useState(() => readNum(AUTO_KEY, 1) === 1);
  const [startAt, setStartAt] = useState(() => Date.now() + prep * 1000);
  const [now, setNow] = useState(() => Date.now());
  // istante dell'ultimo aggiornamento: appena prima dell'inizio, così suona anche il via senza preparazione
  const last = useRef(-prep - 0.001);
  const finished = useRef(false);
  const mainBtn = useRef<HTMLButtonElement>(null);

  const t = (now - startAt) / 1000;
  const holding = t >= 0;
  const held = heldSeconds(t);
  const reached = target > 0 && held >= target;

  const finish = (seconds: number) => {
    if (finished.current) return;
    finished.current = true;
    onStop(seconds);
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // bip e vibrazioni dei secondi passati dall'ultimo aggiornamento
  useEffect(() => {
    for (const c of cues(last.current, t, target)) play(c);
    last.current = t;
  }, [t, target]);

  useEffect(() => {
    if (autoStop && target > 0 && t >= target) finish(target);
  });

  // lo schermo non si spegne durante la tenuta
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const take = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          const l = await navigator.wakeLock.request('screen');
          if (gone) void l.release();
          else lock = l;
        }
      } catch {
        /* non disponibile: pazienza */
      }
    };
    void take();
    document.addEventListener('visibilitychange', take);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', take);
      void lock?.release();
    };
  }, []);

  useEffect(() => {
    mainBtn.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    // in cattura: l'Escape chiude il cronometro, non il registratore sotto
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const changePrep = (p: number) => {
    setPrep(p);
    save(PREP_KEY, String(p));
    last.current = -p - 0.001;
    setStartAt(Date.now() + p * 1000);
  };

  const main = () => {
    if (!holding) {
      // parte subito, senza aspettare la preparazione
      last.current = -0.001;
      setStartAt(Date.now());
    } else finish(held);
  };

  const countdown = Math.ceil(-t);

  return (
    <div className={`hold${holding ? ' on' : ''}${reached ? ' reached' : ''}`} role="dialog" aria-modal="true" aria-label={`Cronometro · ${label}`}>
      <div className="hold-top">
        <div className="hold-label">{label}</div>
        <button className="btn small ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>

      <div className="hold-face" role="timer" aria-live="off">
        <div className="hold-phase">{holding ? (reached ? 'Obiettivo raggiunto' : 'Tieni') : 'Preparati'}</div>
        <div className="hold-time">{holding ? held : countdown}</div>
        <div className="hold-sub">{target > 0 ? `obiettivo ${target} s` : holding ? 'secondi' : 'parte tra poco'}</div>
        {target > 0 && (
          <div className="hold-bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${holding ? Math.min(1, t / target) : 0})` }} />
          </div>
        )}
      </div>

      {!holding && (
        <div className="hold-opts">
          <span>Preparazione</span>
          <div className="seg" role="group" aria-label="Secondi di preparazione">
            {PREP_CHOICES.map((p) => (
              <button key={p} type="button" className={p === prep ? 'on' : ''} aria-pressed={p === prep} onClick={() => changePrep(p)}>
                {p ? `${p} s` : 'No'}
              </button>
            ))}
          </div>
        </div>
      )}
      {target > 0 && (
        <label className="check-row hold-auto">
          <input
            type="checkbox"
            checked={autoStop}
            onChange={(e) => {
              setAutoStop(e.target.checked);
              save(AUTO_KEY, e.target.checked ? '1' : '0');
            }}
          />
          Ferma da solo a {target} s
        </label>
      )}

      <button ref={mainBtn} className="hold-main" onClick={main}>
        {holding ? `Stop · ${held} s` : 'Parti ora'}
      </button>
    </div>
  );
}
