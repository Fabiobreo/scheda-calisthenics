import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { TYPE_LABEL, type ExerciseType } from '../data/types';

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

export function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label className="fld" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...input} />
    </label>
  );
}

export function Select<T extends string>({ label, value, options, onChange, hideLabel }: {
  label: string;
  value: T;
  options: { v: T; l: string }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <label className="fld" htmlFor={id}>
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
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
