import { Sparks } from '../components/ui';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/** Pulsante nel messaggio, per esempio "Annulla" dopo aver tolto qualcosa (audit A04). */
export interface ToastAction {
  label: string;
  run: () => void;
}

/** `record`: messaggio in ambra con le scintille, per un nuovo record (V02). */
export type ToastTone = 'record';

type Toast = (msg: string, action?: ToastAction, tone?: ToastTone) => void;

const Ctx = createContext<Toast>(() => {});

/** Con un'azione il messaggio resta più a lungo: deve esserci il tempo di leggerlo e di toccarla. */
const SHORT = 2200;
const WITH_ACTION = 6000;
const RECORD = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [action, setAction] = useState<ToastAction | null>(null);
  const [show, setShow] = useState(false);
  const [tone, setTone] = useState<ToastTone | null>(null);
  // cambia a ogni messaggio: l'animazione d'ingresso riparte anche se il messaggio è lo stesso
  const [seq, setSeq] = useState(0);
  const timer = useRef<number>(undefined);

  const toast = useCallback<Toast>((m, a, t) => {
    setMsg(m);
    setTone(t ?? null);
    setSeq((n) => n + 1);
    setAction(a ?? null);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), a ? WITH_ACTION : t ? RECORD : SHORT);
  }, []);

  const act = () => {
    clearTimeout(timer.current);
    setShow(false);
    action?.run();
    setAction(null);
  };

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div id="toast" className={`${show ? 'show' : ''}${action ? ' act' : ''}${tone ? ` ${tone}` : ''}`} role="status" aria-live="polite">
        {tone === 'record' && show && <Sparks key={seq} />}
        <span>{msg}</span>
        {action && (
          <button type="button" className="toast-act" onClick={act} tabIndex={show ? 0 : -1}>
            {action.label}
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
