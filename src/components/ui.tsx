import { createContext, useContext, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { TYPE_LABEL, type ExerciseType } from '../data/types';

/**
 * Titolo della schermata (audit A02): un `h1` per gli screen reader (la testata mostra già nome dell'app o riepilogo)
 * e il titolo della scheda del browser, diverso per ogni schermata.
 */
export function PageTitle({ title }: { title: string }) {
  const nested = useContext(Nested);
  usePageTitle(nested ? null : title);
  return nested ? null : <h1 className="sr-only">{title}</h1>;
}

/** Una schermata mostrata dentro un'altra (Livello e Grafici dell'atleta nella vista del trainer): il titolo resta quello di fuori. */
const Nested = createContext(false);
export const NestedView = ({ children }: { children: ReactNode }) => <Nested.Provider value>{children}</Nested.Provider>;

/** Solo il titolo della scheda del browser, per le schermate che hanno già un `h1` visibile. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    document.title = title ? `${title} · Scheda Calisthenics` : 'Scheda Calisthenics';
  }, [title]);
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** Primo tocco chiede conferma, secondo esegue. Torna normale dopo 3 s. */
export function ConfirmButton({ onConfirm, children = 'Elimina', confirmLabel = 'Conferma' }: {
  onConfirm: () => void;
  children?: ReactNode;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`btn small ${armed ? 'danger' : 'ghost'}`}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

type FieldProps = {
  label: string;
  /** testo d'aiuto sotto il campo, letto dagli screen reader */
  hint?: ReactNode;
  /** errore del campo: lo segna come non valido */
  error?: string;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

/** id e attributi aria per collegare suggerimento ed errore all'input. */
function useDescribed(hint: ReactNode, error?: string) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return {
    id,
    aria: { 'aria-invalid': error ? true : undefined, 'aria-describedby': [errId, hintId].filter(Boolean).join(' ') || undefined },
    below: (
      <>
        {error && (
          <span className="fld-err" id={errId}>
            {error}
          </span>
        )}
        {hint && (
          <span className="fld-hint" id={hintId}>
            {hint}
          </span>
        )}
      </>
    ),
  };
}

export function Field({ label, hint, error, ...input }: FieldProps) {
  const d = useDescribed(hint, error);
  return (
    <div className="fld">
      <label className="fld-l" htmlFor={d.id}>
        {label}
      </label>
      <input id={d.id} {...d.aria} {...input} />
      {d.below}
    </div>
  );
}

/** Campo password con pulsante per mostrarla. `aside` va a destra dell'etichetta (es. "Password dimenticata?"). */
export function PasswordField({ label, aside, hint, error, ...input }: FieldProps & { aside?: ReactNode }) {
  const d = useDescribed(hint, error);
  const [show, setShow] = useState(false);
  return (
    <div className="fld">
      <div className="fld-h">
        <label className="fld-l" htmlFor={d.id}>
          {label}
        </label>
        {aside}
      </div>
      <div className="pw">
        <input id={d.id} {...d.aria} {...input} type={show ? 'text' : 'password'} />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Nascondi password' : 'Mostra password'}
          aria-pressed={show}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {show && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {d.below}
    </div>
  );
}

type SelectOption<T> = { v: T; l: string; /** opzioni consecutive con lo stesso gruppo finiscono in un optgroup */ group?: string };

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  const opt = (o: SelectOption<T>) => (
    <option key={o.v} value={o.v}>
      {o.l}
    </option>
  );
  // raggruppa le opzioni consecutive con lo stesso `group`; senza gruppo restano libere
  const blocks: { group?: string; items: SelectOption<T>[] }[] = [];
  for (const o of options) {
    const last = blocks[blocks.length - 1];
    if (last && last.group === o.group) last.items.push(o);
    else blocks.push({ group: o.group, items: [o] });
  }
  return (
    <label className="fld" htmlFor={id}>
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {blocks.map((b, i) =>
          b.group ? (
            <optgroup key={`${b.group}-${i}`} label={b.group}>
              {b.items.map(opt)}
            </optgroup>
          ) : (
            b.items.map(opt)
          ),
        )}
      </select>
    </label>
  );
}

export function TypeChip({ type }: { type: ExerciseType }) {
  return (
    <span className="chip">
      <i className="dot" style={{ background: `var(--${type})` }} />
      {TYPE_LABEL[type]}
    </span>
  );
}
