import { useState } from 'react';
import { useToast } from '../app/toast';
import { EXERCISE_TYPES, MEASURE_LABEL, MEASURES, TYPE_LABEL, type ExerciseType, type Measure, type Scheme } from '../data/types';
import { isInt, numInput, parseNum } from '../lib/format';
import { Field, Seg } from './ui';

/**
 * Tipo, serie, ripetizioni (o secondi), peso e recupero di un esercizio in un giorno (del calendario o di una scheda).
 * `measure`: come si misura l'esercizio. `measureEditable`: si può scegliere qui (nome personalizzato nuovo),
 * partendo da `measure`.
 * `note`: mostra anche il campo della nota del trainer, partendo da questo valore.
 */
export function SchemeForm({
  initial,
  hint,
  saveLabel,
  onSave,
  onCancel,
  note,
  measure: initialMeasure,
  measureEditable = false,
}: {
  initial: Scheme;
  measure: Measure;
  measureEditable?: boolean;
  hint: string;
  saveLabel: string;
  onSave: (s: Scheme, note: string | null) => void;
  onCancel: () => void;
  note?: string | null;
}) {
  const toast = useToast();
  const [type, setType] = useState<ExerciseType>(initial.type);
  const [weight, setWeight] = useState(numInput(initial.weight));
  const [sets, setSets] = useState(String(initial.sets));
  const [chosen, setMeasure] = useState<Measure>(initialMeasure);
  const measure = measureEditable ? chosen : initialMeasure;
  // ripetizioni o secondi: lo stesso numero se si cambia misura
  const [reps, setReps] = useState(String(initial.seconds || initial.reps));
  const [rest, setRest] = useState(String(initial.rest));
  const [text, setText] = useState(note ?? '');
  const withNote = note !== undefined;

  const save = () => {
    const n = Number(reps);
    const timed = measure === 'time';
    const scheme: Scheme = {
      type,
      weight: parseNum(weight || '0'),
      sets: Number(sets),
      reps: timed ? 0 : n,
      seconds: timed ? n : 0,
      rest: Number(rest || '0'),
    };
    if (!(scheme.weight >= 0 && scheme.weight < 10000) || !isInt(scheme.sets, 1, 50))
      return toast(timed ? 'Controlla peso e serie' : 'Controlla peso, serie e ripetizioni');
    if (timed ? !isInt(n, 1, 3600) : !isInt(n, 1, 1000))
      return toast(timed ? 'Secondi di tenuta tra 1 e 3600' : 'Ripetizioni tra 1 e 1000');
    if (!isInt(scheme.rest, 0, 3600)) return toast('Recupero tra 0 e 3600 secondi');
    if (text.trim().length > 500) return toast('Nota troppo lunga (massimo 500 caratteri)');
    onSave(scheme, withNote ? text.trim() || null : null);
  };

  return (
    <div className="form span-all mt-8">
      <div className="fld">
        <span>Tipo</span>
        <Seg label="Tipo" value={type} options={EXERCISE_TYPES.map((t) => ({ v: t, l: TYPE_LABEL[t] }))} onChange={setType} />
      </div>
      {measureEditable && (
        <div className="fld">
          <span>Si misura in</span>
          <Seg label="Si misura in" value={measure} options={MEASURES.map((m) => ({ v: m, l: MEASURE_LABEL[m] }))} onChange={setMeasure} />
        </div>
      )}
      <div className="grid3">
        <Field label="Peso (kg)" inputMode="decimal" value={weight} autoFocus onChange={(e) => setWeight(e.target.value)} />
        <Field label="Serie" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
        <Field label={measure === 'time' ? 'Secondi' : 'Rip.'} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
      </div>
      <div className="grid2">
        <Field label="Recupero (s)" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
      </div>
      {withNote && (
        <Field
          label="Nota per l'atleta"
          value={text}
          maxLength={500}
          placeholder="Tecnica, tempi, varianti…"
          onChange={(e) => setText(e.target.value)}
        />
      )}
      <p className="hint">{hint} Peso 0 kg vuol dire corpo libero, recupero 0 niente timer.</p>
      <div className="row">
        <button className="btn small" onClick={save}>
          {saveLabel}
        </button>
        <button className="btn small ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
