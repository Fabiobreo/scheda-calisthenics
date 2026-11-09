import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
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
/** Dentro un'altra schermata (vista del trainer): niente due colonne proprie, c'è già quella di fuori. */
export const useNested = () => useContext(Nested);
export const NestedView = ({ children }: { children: ReactNode }) => <Nested.Provider value>{children}</Nested.Provider>;

/** Solo il titolo della scheda del browser, per le schermate che hanno già un `h1` visibile. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    document.title = title ? `${title} · Scheda Calisthenics` : 'Scheda Calisthenics';
  }, [title]);
}

/**
 * Segnaposto mentre i dati arrivano (audit A13): la forma della pagina al posto di "Caricamento…", così non c'è uno
 * schermo vuoto e il contenuto non salta quando appare. `inline` = poche righe dentro una scheda già disegnata.
 */
export function Skeleton({ inline }: { inline?: boolean }) {
  return inline ? (
    <div className="skel skel-in" role="status" aria-label="Caricamento">
      <i />
      <i />
      <i />
    </div>
  ) : (
    <div className="skel" role="status" aria-label="Caricamento">
      <i className="skel-hero" />
      <i className="skel-card" />
      <i className="skel-row" />
      <i className="skel-row" />
    </div>
  );
}

/** Schermo largo (desktop, tablet orizzontale): da qui l'app passa a due colonne e alla barra laterale (audit A06). */
export const WIDE_QUERY = '(min-width: 1024px)';
const wideMq = typeof window !== 'undefined' ? window.matchMedia(WIDE_QUERY) : null;
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      wideMq?.addEventListener('change', cb);
      return () => wideMq?.removeEventListener('change', cb);
    },
    () => wideMq?.matches ?? false,
  );
}

/**
 * Due colonne su schermo largo, una sola sul telefono (le colonne "spariscono" e le schede restano in fila, come
 * prima). `even` = colonne di pari larghezza invece della sinistra più larga.
 */
export function Cols({ left, right, even }: { left: ReactNode; right: ReactNode; even?: boolean }) {
  return (
    <div className={`cols${even ? ' even' : ''}`}>
      <div className="col">{left}</div>
      <div className="col">{right}</div>
    </div>
  );
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

type SelectOption<T> = {
  v: T;
  l: string;
  /** opzioni consecutive con lo stesso gruppo finiscono in un optgroup */
  group?: string;
  /** altri nomi con cui si trova cercando (SearchSelect), es. "pull up" per Trazioni */
  keywords?: string[];
};

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
      <i className={`dot ${type}`} />
      {TYPE_LABEL[type]}
    </span>
  );
}

/** Minuscole, senza accenti e spazi doppi: "Pistol  squàt" e "pistol squat" sono la stessa ricerca. */
const fold = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Scelta da un elenco lungo con ricerca (audit A17): si scrive e l'elenco si restringe, per nome, gruppo o sinonimo.
 * Stesse opzioni e gruppi di `Select`. Combobox ARIA: frecce per muoversi, Invio per scegliere, Esc per chiudere.
 */
export function SearchSelect<T extends string>({ label, value, options, onChange, hideLabel, placeholder = 'Cerca…' }: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // in fondo alla pagina l'elenco si apre verso l'alto, invece di finire sotto la barra in basso
  const [up, setUp] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((o) => o.v === value);
  const q = query === null ? '' : fold(query);
  const shown = q
    ? options.filter((o) => [o.l, o.group ?? '', ...(o.keywords ?? [])].some((t) => fold(t).includes(q)))
    : options;
  const act = Math.min(active, Math.max(shown.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${act}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [act, open]);

  const choose = (o: SelectOption<T>) => {
    onChange(o.v);
    setQuery(null);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive(Math.max(0, Math.min(shown.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (shown[act]) choose(shown[act]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setQuery(null);
      setOpen(false);
    }
  };

  // intestazioni di gruppo quando cambia il gruppo, come gli optgroup
  const items: ReactNode[] = [];
  shown.forEach((o, i) => {
    if (o.group && o.group !== shown[i - 1]?.group)
      items.push(
        <li key={`g-${o.group}-${i}`} className="ss-group" role="presentation">
          {o.group}
        </li>,
      );
    items.push(
      <li
        key={o.v}
        id={`${id}-o${i}`}
        data-i={i}
        role="option"
        aria-selected={o.v === value}
        className={`ss-opt${i === act ? ' act' : ''}${o.v === value ? ' on' : ''}`}
        // mousedown e non click: l'input non perde il fuoco prima della scelta
        onMouseDown={(e) => {
          e.preventDefault();
          choose(o);
        }}
      >
        {o.l}
      </li>,
    );
  });

  return (
    <div className="fld ss">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'fld-l'}>
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[act] ? `${id}-o${act}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query ?? selected?.l ?? ''}
        onFocus={(e) => {
          e.target.select();
          const r = e.target.getBoundingClientRect();
          const below = window.innerHeight - r.bottom - (document.querySelector('.tabbar')?.getBoundingClientRect().height ?? 0);
          setUp(below < 280 && r.top > below);
          setActive(Math.max(0, shown.findIndex((o) => o.v === value)));
          setOpen(true);
        }}
        onBlur={() => {
          setQuery(null);
          setOpen(false);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKey}
      />
      {open && (
        <ul className={`ss-list${up ? ' up' : ''}`} id={listId} role="listbox" aria-label={label} ref={listRef}>
          {items.length ? items : <li className="ss-none">Nessun esercizio con questo nome</li>}
        </ul>
      )}
    </div>
  );
}
