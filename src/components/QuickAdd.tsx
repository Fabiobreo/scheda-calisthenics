import { useState } from 'react';
import { useToast } from '../app/toast';
import { CATEGORY_LABEL, EXERCISE_TYPES, TYPE_LABEL, type CatalogExercise, type ExerciseRef, type ExerciseType, type Measure } from '../data/types';
import { byCategory } from '../lib/catalog';
import { sharedPreset, type SharedScheme } from '../lib/editor';
import { isInt, numInput, parseNum, plural } from '../lib/format';
import { ExIcon } from './ExIcon';
import { Field, Seg } from './ui';

/** Minuscole, senza accenti: "pistol squàt" trova "Pistol squat" (come nella ricerca del catalogo). */
const fold = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Aggiunta di più esercizi in una volta (ticket 26): si spuntano dal catalogo, con ricerca, e si dà uno schema in
 * comune, precompilato dal tipo. Ripetizioni per gli esercizi a ripetizioni, secondi per le tenute. Gli esercizi già
 * nel giorno (`exclude`) non compaiono. I nomi personalizzati restano nell'aggiunta singola.
 */
export function MultiAdd({
  catalog,
  exclude,
  hint,
  busy,
  onAdd,
  onCancel,
}: {
  catalog: CatalogExercise[];
  exclude: (ref: ExerciseRef) => boolean;
  hint: string;
  busy?: boolean;
  onAdd: (picked: { ref: ExerciseRef; measure: Measure }[], shared: SharedScheme) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [type, setType] = useState<ExerciseType | null>(null);
  const [f, setF] = useState(() => fields(sharedPreset('volume')));
  const options = byCategory(catalog).filter((c) => !exclude({ catalogId: c.id, customName: null }));
  const q = fold(query);
  const shown = q ? options.filter((c) => [c.name, CATEGORY_LABEL[c.category], ...c.aliases].some((t) => fold(t).includes(q))) : options;
  const chosen = picked.map((id) => catalog.find((c) => c.id === id)).filter((c) => c !== undefined);
  const anyTime = chosen.some((c) => c.measure === 'time');
  const anyReps = !chosen.length || chosen.some((c) => c.measure !== 'time');
  // finché il trainer non sceglie il tipo vale quello del primo esercizio spuntato
  const shownType = type ?? chosen[0]?.defaultType ?? 'volume';

  const toggle = (c: CatalogExercise) => {
    const next = picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id];
    setPicked(next);
    if (type === null && !picked.length && next.length) setF((old) => ({ ...fields(sharedPreset(c.defaultType)), weight: old.weight }));
  };
  const pickType = (t: ExerciseType) => {
    setType(t);
    // il tipo riempie serie, ripetizioni, secondi e recupero; il peso resta
    setF((old) => ({ ...fields(sharedPreset(t)), weight: old.weight }));
  };

  const save = () => {
    if (!chosen.length) return toast('Spunta almeno un esercizio');
    const s: SharedScheme = {
      type: shownType,
      sets: Number(f.sets),
      reps: Number(f.reps),
      seconds: Number(f.seconds),
      weight: parseNum(f.weight || '0'),
      rest: Number(f.rest || '0'),
    };
    if (!(s.weight >= 0 && s.weight < 10000) || !isInt(s.sets, 1, 50)) return toast('Controlla peso e serie');
    if (anyReps && !isInt(s.reps, 1, 1000)) return toast('Ripetizioni tra 1 e 1000');
    if (anyTime && !isInt(s.seconds, 1, 3600)) return toast('Secondi di tenuta tra 1 e 3600');
    if (!isInt(s.rest, 0, 3600)) return toast('Recupero tra 0 e 3600 secondi');
    onAdd(chosen.map((c) => ({ ref: { catalogId: c.id, customName: null }, measure: c.measure })), s);
  };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="form multi-add span-all mt-8">
      <Field label="Cerca" type="search" placeholder="Nome, gruppo o sinonimo…" value={query} autoComplete="off" autoFocus onChange={(e) => setQuery(e.target.value)} />
      <div className="ma-list" role="group" aria-label="Esercizi da aggiungere">
        {shown.map((c, i) => (
          <div key={c.id}>
            {c.category !== shown[i - 1]?.category && <div className="ss-group">{CATEGORY_LABEL[c.category]}</div>}
            <label className={`check-row ma-row${picked.includes(c.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c)} />
              <ExIcon catalogId={c.id} />
              <span>{c.name}</span>
              {c.measure === 'time' && <small className="ma-time">a tempo</small>}
            </label>
          </div>
        ))}
        {!shown.length && <p className="hint">Nessun esercizio con questo nome: per un nome tuo usa l'aggiunta singola.</p>}
      </div>
      <p className="ma-sum" aria-live="polite">
        {chosen.length ? `${plural(chosen.length, 'esercizio scelto', 'esercizi scelti')}: ${chosen.map((c) => c.name).join(', ')}` : 'Nessun esercizio scelto'}
      </p>
      <div className="fld">
        <span>Tipo</span>
        <Seg label="Tipo" value={shownType} options={EXERCISE_TYPES.map((t) => ({ v: t, l: TYPE_LABEL[t] }))} onChange={pickType} />
      </div>
      <div className="grid3">
        <Field label="Serie" inputMode="numeric" value={f.sets} onChange={set('sets')} />
        {anyReps && <Field label="Rip." inputMode="numeric" value={f.reps} onChange={set('reps')} />}
        {anyTime && <Field label="Secondi" inputMode="numeric" value={f.seconds} onChange={set('seconds')} />}
        <Field label="Peso (kg)" inputMode="decimal" value={f.weight} onChange={set('weight')} />
        <Field label="Recupero (s)" inputMode="numeric" value={f.rest} onChange={set('rest')} />
      </div>
      <p className="hint">{hint} Lo schema vale per tutti; poi ritocchi il singolo con Modifica.</p>
      <div className="row">
        <button className="btn" disabled={busy || !chosen.length} onClick={save}>
          {chosen.length ? `Aggiungi ${chosen.length}` : 'Aggiungi'}
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}

const fields = (s: SharedScheme) => ({ sets: String(s.sets), reps: String(s.reps), seconds: String(s.seconds), weight: numInput(s.weight), rest: String(s.rest) });

/**
 * Duplica un giorno in altri giorni della stessa settimana (ticket 26). `days`: i sette giorni con etichetta breve,
 * nome lungo e numero di esercizi; `from` è il giorno da copiare.
 */
export function DuplicateDay({
  from,
  days,
  busy,
  onDuplicate,
  onCancel,
}: {
  from: number;
  days: { short: string; long: string; count: number }[];
  busy?: boolean;
  onDuplicate: (to: number[]) => void;
  onCancel: () => void;
}) {
  const [to, setTo] = useState<number[]>([]);
  return (
    <div className="form dup-day span-all mt-8">
      <div className="fld">
        <span>Copia {days[from].long.toLowerCase()} in</span>
        <div className="days dup" role="group" aria-label="Giorni in cui copiare">
          {days.map((d, i) =>
            i === from ? (
              <span key={d.short} className="day src" aria-hidden="true">
                <span>{d.short}</span>
                <small>da qui</small>
              </span>
            ) : (
              <button
                key={d.short}
                type="button"
                className={`day${to.includes(i) ? ' on' : ''}`}
                aria-pressed={to.includes(i)}
                aria-label={`${d.long}${d.count ? `, ha già ${plural(d.count, 'esercizio', 'esercizi')}` : ''}`}
                onClick={() => setTo(to.includes(i) ? to.filter((x) => x !== i) : [...to, i].sort())}
              >
                <span>{d.short}</span>
                <small>{to.includes(i) ? '✓' : d.count ? `${d.count} es.` : '–'}</small>
              </button>
            ),
          )}
        </div>
      </div>
      <p className="hint">Esercizi, schemi e note. Se un giorno ha già lo stesso esercizio, quello resta com'è.</p>
      <div className="row">
        <button className="btn" disabled={busy || !to.length} onClick={() => onDuplicate(to)}>
          {to.length ? `Duplica in ${plural(to.length, 'giorno', 'giorni')}` : 'Duplica'}
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
