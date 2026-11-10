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

/**
 * Testata di una scheda (ticket 21): titolo piccolo, azioni a destra e, se c'è, la spiegazione dietro una "?" invece
 * di righe sempre visibili. `big`: titolo grande, per la scheda protagonista della pagina.
 */
export function CardHead({ title, help, big, children }: { title: string; help?: ReactNode; big?: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="card-h">
        <span className="card-t">
          <h2 className={big ? 'big' : undefined}>{title}</h2>
          {help && (
            <button type="button" className="help" aria-expanded={open} aria-controls={id} aria-label={open ? `Nascondi la spiegazione di ${title}` : `Cos'è ${title}`} onClick={() => setOpen(!open)}>
              <span aria-hidden="true">?</span>
            </button>
          )}
        </span>
        {children}
      </div>
      {help && open && (
        <p className="sub help-txt" id={id}>
          {help}
        </p>
      )}
    </>
  );
}

/** Serie come blocchetti (ticket 21): `total` previste, `done` registrate, nel colore del tipo. Decorativo. */
export function SetBlocks({ total, done, type }: { total: number; done: number; type: ExerciseType }) {
  const n = Math.min(Math.max(total, done), 12);
  if (!n) return null;
  return (
    <span className={`blocks ${type}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < done ? 'on' : undefined} />
      ))}
    </span>
  );
}

/** Anello di avanzamento: `done` su `total`, verde quando è pieno. */
export function Ring({ done, total, label }: { done: number; total: number; label: string }) {
  const r = 31;
  const c = 2 * Math.PI * r;
  const full = total > 0 && done >= total;
  return (
    <div className={`ring${full ? ' full' : ''}`} role="img" aria-label={label}>
      <svg viewBox="0 0 74 74" aria-hidden="true">
        <circle className="ring-bg" cx="37" cy="37" r={r} />
        <circle className="ring-fg" cx="37" cy="37" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - (total ? Math.min(done, total) / total : 0))} />
      </svg>
      <b aria-hidden="true">
        {full ? '✓' : `${done}/${total}`}
        <small>{full ? 'fatto' : 'fatti'}</small>
      </b>
    </div>
  );
}

/** Stato vuoto (ticket 21): un disegno, cosa comparirà qui e cosa fare per arrivarci. */
export function EmptyState({ art, title, children, actions, small }: { art?: ReactNode; title: string; children: ReactNode; actions?: ReactNode; /** dentro una card, sotto un titolo: più raccolto */ small?: boolean }) {
  return (
    <div className={`empty-state${small ? ' sm' : ''}`}>
      {art ?? <EmptyChart />}
      <h3>{title}</h3>
      <p>{children}</p>
      {actions && <div className="empty-act">{actions}</div>}
    </div>
  );
}

/** Grafico tratteggiato che sale verso un punto ambra: "qui vedrai i progressi". */
export function EmptyChart() {
  return (
    <svg className="empty-art" viewBox="0 0 240 140" aria-hidden="true">
      <path className="ea-axis" d="M10 130H230" />
      <path className="ea-grid" d="M10 95H230M10 60H230M10 25H230" />
      <path className="ea-line" d="M14 118 L60 104 L100 108 L140 78 L180 70 L226 34" />
      <circle className="ea-dot" cx="226" cy="34" r="7" />
    </svg>
  );
}

/** Tre figure stilizzate: "qui vedrai i tuoi atleti". */
export function EmptyPeople() {
  return (
    <svg className="empty-art" viewBox="0 0 240 140" aria-hidden="true">
      {[60, 120, 180].map((x, i) => (
        <g key={x} className={i === 1 ? 'ea-main' : 'ea-side'}>
          <circle cx={x} cy={i === 1 ? 44 : 58} r={i === 1 ? 16 : 12} />
          <path d={i === 1 ? `M${x - 30} 122 q30 -56 60 0` : `M${x - 22} 122 q22 -42 44 0`} />
        </g>
      ))}
    </svg>
  );
}

/* ---------- Movimento (V02) ---------- */

const lessMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Numero intero che sale fino al valore (V02): da zero alla prima comparsa, dal valore di prima quando cambia.
 * Fermo se il telefono chiede meno movimento.
 */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(() => (lessMotion() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (lessMotion() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/** Scintille che esplodono dal centro del contenitore, una volta: record e livelli nuovi (V02). */
export function Sparks() {
  return (
    <span className="sparks" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/* ---------- Dati disegnati, secondo giro (V05) ---------- */

/** Anello piccolo con una percentuale al centro: il rispetto del programma di un atleta nell'elenco. */
export function MiniRing({ pct, label }: { pct: number | null; label: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const v = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span className={`mini-ring${pct !== null && pct >= 80 ? ' good' : ''}`} role="img" aria-label={label}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle className="ring-bg" cx="20" cy="20" r={r} />
        <circle className="ring-fg" cx="20" cy="20" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <b aria-hidden="true">{pct === null ? '–' : `${pct}%`}</b>
    </span>
  );
}

/** Barre verticali, una per settimana dalla più vecchia: quante volte un esercizio è stato registrato. */
export function ActivityBars({ counts, label }: { counts: number[]; label: string }) {
  const max = Math.max(1, ...counts);
  const w = 8;
  const gap = 3;
  return (
    <svg className="bars" viewBox={`0 0 ${counts.length * (w + gap) - gap} 40`} role="img" aria-label={label}>
      {counts.map((n, i) => {
        const h = n ? 6 + (34 * n) / max : 3;
        return <rect key={i} className={n ? 'on' : undefined} x={i * (w + gap)} y={40 - h} width={w} height={h} rx="2" />;
      })}
    </svg>
  );
}

/** Settimane come blocchetti: disegno dello stato vuoto delle schede modello. */
export function EmptyWeeks() {
  return (
    <svg className="empty-art" viewBox="0 0 240 120" aria-hidden="true">
      {Array.from({ length: 4 }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => (
          <rect key={`${w}-${d}`} className={d % 2 === 0 && d < 6 ? (w === 3 ? 'ea-hot' : 'ea-on') : 'ea-off'} x={14 + d * 31} y={8 + w * 28} width="24" height="20" rx="5" />
        )),
      )}
    </svg>
  );
}
