import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useToast } from '../../app/toast';
import { Field, SearchField, Seg } from '../../components/ui';
import { useCreateExercise, useUpdateExercise } from '../../data/hooks';
import { CATEGORY_LABEL, MEASURE_LABEL, MEASURES, type CatalogExercise, type Exercise, type Measure } from '../../data/types';
import { byCategory, matchCatalog, searchCatalog } from '../../lib/catalog';

/**
 * Foglio dal basso della pagina Esercizi (ticket 35), come quello del record: Esc o un tocco fuori chiudono, il fuoco
 * entra sul titolo (mai su un campo: sul telefono la tastiera non si apre da sola) e alla chiusura torna dov'era.
 * `alert`: una domanda a cui rispondere (conferma di eliminazione).
 */
export function Sheet({ title, onClose, alert, className, children }: { title: string; onClose: () => void; alert?: boolean; className?: string; children: ReactNode }) {
  const id = useId();
  const head = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    head.current?.focus();
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
      back?.focus?.();
    };
  }, []);

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ex-sheet${className ? ` ${className}` : ''}`} role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={id}>
        <div className="card-h">
          <h2 id={id} ref={head} tabIndex={-1}>
            {title}
          </h2>
          <button type="button" className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Confronto dei nomi come lo fa il database: maiuscole e spazi esterni non contano. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

type Tab = 'catalog' | 'custom';

/**
 * "+ Aggiungi": il catalogo per gruppi con la ricerca vuota e senza fuoco, subito scorrevole; un tocco su una voce la
 * aggiunge e il foglio resta aperto per sceglierne altre. "Personalizzato" è la seconda scheda: lì il fuoco va sul nome.
 */
export function AddSheet({ catalog, exercises, onClose }: { catalog: CatalogExercise[]; exercises: Exercise[]; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateExercise();
  const [tab, setTab] = useState<Tab>('catalog');
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  // voci che l'utente aveva già all'apertura (gli archiviati contano: si ripristinano dalla lista): non compaiono.
  // Quelle aggiunte da qui restano in elenco, segnate, così la riga toccata non sparisce da sotto il dito.
  const [had] = useState(() => new Set(exercises.map((e) => e.catalogId)));
  const [sending, setSending] = useState<string[]>([]);
  const mine = new Set(exercises.map((e) => e.catalogId));
  const free = byCategory(catalog.filter((c) => !had.has(c.id)));
  const shown = searchCatalog(free, query, (c) => CATEGORY_LABEL[c.category]);
  const groups = shown.reduce<{ label: string; items: CatalogExercise[] }[]>((acc, c) => {
    const label = CATEGORY_LABEL[c.category];
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(c);
    else acc.push({ label, items: [c] });
    return acc;
  }, []);

  const add = (c: CatalogExercise) => {
    if (mine.has(c.id) || sending.includes(c.id)) return;
    setSending((s) => [...s, c.id]);
    create.mutate({ catalogId: c.id, name: c.name, inRecords: false, measure: c.measure }, { onSettled: () => setSending((s) => s.filter((x) => x !== c.id)) });
  };

  return (
    <Sheet title="Aggiungi esercizio" onClose={onClose} className={tab === 'catalog' ? 'cat' : undefined}>
      <Seg
        label="Da dove"
        value={tab}
        options={[
          { v: 'catalog', l: 'Catalogo' },
          { v: 'custom', l: 'Personalizzato' },
        ]}
        onChange={setTab}
      />
      {tab === 'catalog' ? (
        <>
          <SearchField label="Cerca nel catalogo" hideLabel placeholder="Cerca nel catalogo…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="cat-list">
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h3 className="ss-group">{g.label}</h3>
                <ul>
                  {g.items.map((c) => {
                    const done = mine.has(c.id);
                    return (
                      <li key={c.id}>
                        <button type="button" className={`cat-row${done ? ' done' : ''}`} aria-disabled={done || undefined} onClick={() => add(c)}>
                          <span className="cat-name">
                            {c.name}
                            {c.measure === 'time' && <small>A tempo</small>}
                          </span>
                          <span className="cat-add" aria-hidden={!done}>
                            {done ? 'Aggiunto' : '+'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!shown.length &&
              (free.length ? (
                <div className="cat-none">
                  <p className="hint">Nessun esercizio con questo nome nel catalogo.</p>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => {
                      setCustom(query.trim().slice(0, 80));
                      setTab('custom');
                    }}
                  >
                    Crealo come personalizzato
                  </button>
                </div>
              ) : (
                <p className="hint cat-none">Hai già tutti gli esercizi del catalogo. Per altri movimenti scegli "Personalizzato".</p>
              ))}
          </div>
        </>
      ) : (
        <ExerciseForm
          initialName={custom}
          exercises={exercises}
          catalog={catalog}
          saveLabel="Aggiungi esercizio"
          hint="Solo per movimenti che non sono nel catalogo."
          onCancel={onClose}
          onSave={(v) => {
            // un nome del catalogo va preso dal catalogo: stesso esercizio per tutti, grafici confrontabili
            const known = matchCatalog(catalog, v.name);
            if (known) {
              create.mutate({ catalogId: known.id, name: known.name, inRecords: v.inRecords, measure: known.measure });
              toast(`"${known.name}" è nel catalogo: l'ho aggiunto da lì`);
            } else create.mutate({ catalogId: null, ...v });
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

/** "Modifica" dal menu "⋯": nome e misura per i personalizzati, per tutti "Mostra nei record personali". */
export function EditSheet({ exercise, exercises, catalog, hasEntries, onClose }: { exercise: Exercise; exercises: Exercise[]; catalog: CatalogExercise[]; hasEntries: boolean; onClose: () => void }) {
  const update = useUpdateExercise('Modifiche salvate');
  return (
    <Sheet title="Modifica esercizio" onClose={onClose}>
      <ExerciseForm
        editing={exercise}
        measureLocked={hasEntries}
        exercises={exercises}
        catalog={catalog}
        saveLabel="Salva modifiche"
        onCancel={onClose}
        onSave={(v) => {
          // un esercizio del catalogo tiene nome e misura della voce
          update.mutate({ id: exercise.id, patch: exercise.catalogId ? { inRecords: v.inRecords } : v });
          onClose();
        }}
      />
    </Sheet>
  );
}

function ExerciseForm({
  editing,
  initialName = '',
  measureLocked = false,
  exercises,
  catalog,
  saveLabel,
  hint,
  onSave,
  onCancel,
}: {
  editing?: Exercise;
  initialName?: string;
  /** con delle registrazioni la misura resta quella: storico e grafici restano coerenti */
  measureLocked?: boolean;
  exercises: Exercise[];
  catalog: CatalogExercise[];
  saveLabel: string;
  hint?: string;
  onSave: (v: { name: string; inRecords: boolean; measure: Measure }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? initialName);
  const [measure, setMeasure] = useState<Measure>(editing?.measure ?? 'reps');
  const [inRecords, setInRecords] = useState(editing?.inRecords ?? false);
  const [err, setErr] = useState<string | null>(null);
  const fromCatalog = !!editing?.catalogId;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromCatalog) return onSave({ name: editing!.name, inRecords, measure: editing!.measure });
    const n = name.trim();
    if (!n) return setErr("Scrivi il nome dell'esercizio");
    if (n.length > 80) return setErr('Nome troppo lungo');
    const twin = exercises.find((x) => x.id !== editing?.id && sameName(x.name, n));
    if (twin) return setErr(twin.archivedAt ? `"${twin.name}" esiste già tra gli archiviati: ripristinalo` : `"${twin.name}" esiste già`);
    if (!editing) {
      const known = matchCatalog(catalog, n);
      const got = known && exercises.find((x) => x.catalogId === known.id);
      if (got) return setErr(got.archivedAt ? `"${got.name}" ce l'hai già tra gli archiviati: ripristinalo` : `"${got.name}" ce l'hai già`);
    }
    onSave({ name: n, inRecords, measure: measureLocked && editing ? editing.measure : measure });
  };

  return (
    <form className="form" onSubmit={save} noValidate>
      {fromCatalog ? (
        <p className="pname">
          {editing!.name}
          <small className="ex-tag">{['Dal catalogo', editing!.measure === 'time' && 'A tempo'].filter(Boolean).join(' · ')}</small>
        </p>
      ) : (
        <>
          <Field
            label="Nome"
            value={name}
            autoComplete="off"
            // qui il fuoco sul nome ha senso: chi apre questa scheda vuole scrivere
            autoFocus={!editing}
            maxLength={80}
            hint={hint}
            error={err ?? undefined}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
          />
          <div className="fld">
            <span>Si misura in</span>
            {measureLocked ? (
              <>
                <p className="pname">{MEASURE_LABEL[measure]}</p>
                <span className="fld-hint">Ha già delle registrazioni: la misura non si cambia più, così storico e grafici restano coerenti.</span>
              </>
            ) : (
              <>
                <Seg label="Si misura in" value={measure} options={MEASURES.map((m) => ({ v: m, l: MEASURE_LABEL[m] }))} onChange={setMeasure} />
                <span className="fld-hint">Secondi per le tenute (plank, L-sit, verticale…). Dopo la prima registrazione non si cambia più.</span>
              </>
            )}
          </div>
        </>
      )}
      <label className="check-row">
        <input type="checkbox" checked={inRecords} onChange={(e) => setInRecords(e.target.checked)} />
        Mostra nei record personali
      </label>
      <div className="row">
        <button className="btn">{saveLabel}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </form>
  );
}
