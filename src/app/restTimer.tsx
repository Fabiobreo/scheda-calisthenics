import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtDuration } from '../lib/format';

const KEY = 'scheda:rest-timer';

interface TimerState {
  /** epoch ms in cui il recupero finisce; null = fermo */
  endAt: number | null;
  total: number;
  label: string;
}

interface TimerApi {
  start(seconds: number, label?: string): void;
  stop(): void;
}

const Ctx = createContext<TimerApi>({ start() {}, stop() {} });

function read(): TimerState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerState | null;
    // un timer scaduto da più di un minuto non ha più senso
    if (s?.endAt && s.endAt > Date.now() - 60_000) return s;
  } catch {
    /* ignora */
  }
  return { endAt: null, total: 0, label: '' };
}

function write(s: TimerState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(read);
  const [now, setNow] = useState(Date.now());
  const audio = useRef<AudioContext | null>(null);
  const rang = useRef(false);

  const set = useCallback((s: TimerState) => {
    setState(s);
    write(s);
  }, []);

  const start = useCallback(
    (seconds: number, label = 'Recupero') => {
      // l'AudioContext va creato durante un gesto dell'utente, altrimenti il browser lo blocca
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      } catch {
        /* niente audio */
      }
      rang.current = false;
      setNow(Date.now());
      set({ endAt: Date.now() + seconds * 1000, total: seconds, label });
    },
    [set],
  );

  const stop = useCallback(() => set({ endAt: null, total: 0, label: '' }), [set]);
  const add = (sec: number) =>
    state.endAt && set({ ...state, endAt: Math.max(Date.now(), state.endAt + sec * 1000), total: Math.max(0, state.total + sec) });

  const remaining = state.endAt ? (state.endAt - now) / 1000 : 0;
  const done = state.endAt !== null && remaining <= 0;

  useEffect(() => {
    if (!state.endAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.endAt]);

  useEffect(() => {
    if (!done || rang.current) return;
    rang.current = true;
    navigator.vibrate?.([300, 120, 300]);
    beep(audio.current);
    const id = window.setTimeout(stop, 8000);
    return () => clearTimeout(id);
  }, [done, stop]);

  return (
    <Ctx.Provider value={{ start, stop }}>
      {children}
      {state.endAt && (
        <div className={`timer${done ? ' done' : ''}`} role="timer" aria-live={done ? 'assertive' : 'off'}>
          <div className="timer-bar" style={{ transform: `scaleX(${state.total ? Math.max(0, remaining) / state.total : 0})` }} />
          <div className="timer-body">
            <div>
              <div className="timer-label">{done ? 'Recupero finito' : state.label}</div>
              <div className="timer-time">{done ? 'Vai!' : fmtDuration(remaining)}</div>
            </div>
            <div className="row">
              {!done && (
                <>
                  <button className="btn small ghost" onClick={() => add(-15)} aria-label="Togli 15 secondi">
                    −15
                  </button>
                  <button className="btn small ghost" onClick={() => add(15)} aria-label="Aggiungi 15 secondi">
                    +15
                  </button>
                </>
              )}
              <button className="btn small" onClick={stop}>
                {done ? 'OK' : 'Stop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function beep(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* ignora */
  }
}

export const useRestTimer = () => useContext(Ctx);
