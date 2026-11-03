import { useState } from 'react';
import { useToast } from '../app/toast';
import type { Scheme } from '../data/types';
import { numInput, parseNum } from '../lib/format';
import { Field } from './ui';

const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/**
 * Serie, ripetizioni, peso e recupero di un esercizio in un giorno (del calendario o di una scheda).
 * `note`: mostra anche il campo della nota del trainer, partendo da questo valore.
 */
export function SchemeForm({
  initial,
  hint,
  saveLabel,
  onSave,
  onCancel,
  note,
}: {
  initial: Scheme;
  hint: string;
  saveLabel: string;
  onSave: (s: Scheme, note: string | null) => void;
  onCancel: () => void;
  note?: string | null;
}) {
  const toast = useToast();
  const [weight, setWeight] = useState(numInput(initial.weight));
  const [sets, setSets] = useState(String(initial.sets));
  const [reps, setReps] = useState(String(initial.reps));
  const [rest, setRest] = useState(String(initial.rest));
  const [text, setText] = useState(note ?? '');
  const withNote = note !== undefined;

  const save = () => {
    const scheme = { weight: parseNum(weight || '0'), sets: Number(sets), reps: Number(reps), rest: Number(rest || '0') };
    if (!(scheme.weight >= 0 && scheme.weight < 10000) || !isInt(scheme.sets, 1, 50) || !isInt(scheme.reps, 1, 1000))
      return toast('Controlla peso, serie e ripetizioni');
    if (!isInt(scheme.rest, 0, 3600)) return toast('Recupero tra 0 e 3600 secondi');
    if (text.trim().length > 500) return toast('Nota troppo lunga (massimo 500 caratteri)');
    onSave(scheme, withNote ? text.trim() || null : null);
  };

  return (
    <div className="form" style={{ gridColumn: '1 / -1', marginTop: 8 }}>
      <div className="grid3">
        <Field label="Peso (kg)" inputMode="decimal" value={weight} autoFocus onChange={(e) => setWeight(e.target.value)} />
        <Field label="Serie" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />
        <Field label="Rip." inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
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
