import { useState } from 'react';
import { useToast } from '../../app/toast';
import { ConfirmButton, Field, Select, TypeChip } from '../../components/ui';
import { useArchiveExercise, useCreateExercise, useData, useDeleteExercise, useUpdateExercise } from '../../data/hooks';
import { EXERCISE_TYPES, TYPE_LABEL, type Exercise, type ExerciseType } from '../../data/types';
import { fmt, numInput, parseNum } from '../../lib/format';

interface Form {
  id: string | null;
  name: string;
  weight: string;
  sets: string;
  reps: string;
  rest: string;
  type: ExerciseType;
  inRecords: boolean;
}

const blank: Form = { id: null, name: '', weight: '0', sets: '3', reps: '8', rest: '90', type: 'volume', inRecords: false };

const toForm = (e: Exercise): Form => ({
  id: e.id,
  name: e.name,
  weight: numInput(e.targetWeight),
  sets: String(e.targetSets),
  reps: String(e.targetReps),
  rest: String(e.restSeconds),
  type: e.type,
  inRecords: e.inRecords,
});

const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

export function EserciziView() {
  const { exercises, active, entries } = useData();
  const create = useCreateExercise();
  const update = useUpdateExercise('Modifiche salvate');
  const archive = useArchiveExercise();
  const del = useDeleteExercise();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const archived = exercises.filter((e) => e.archivedAt);

  const patch = (p: Partial<Form>) => form && setForm({ ...form, ...p });

  const save = () => {
    if (!form) return;
    const name = form.name.trim();
    const weight = parseNum(form.weight || '0');
    const sets = Number(form.sets);
    const reps = Number(form.reps);
    const rest = Number(form.rest || '0');
    if (!name) return toast("Scrivi il nome dell'esercizio");
    if (name.length > 80) return toast('Nome troppo lungo');
    if (!(weight >= 0 && weight < 10000) || !isInt(sets, 1, 50) || !isInt(reps, 1, 1000)) return toast('Controlla peso, serie e ripetizioni');
    if (!isInt(rest, 0, 3600)) return toast('Recupero tra 0 e 3600 secondi');
    const body = { name, type: form.type, targetSets: sets, targetReps: reps, targetWeight: weight, restSeconds: rest, inRecords: form.inRecords };
    if (form.id) update.mutate({ id: form.id, patch: body });
    else create.mutate(body);
    setForm(null);
  };

  const count = (id: string) => entries.filter((e) => e.exerciseId === id).length;

  return (
    <section className="card">
      <div className="card-h">
        <h2>Esercizi</h2>
        <button className="btn small" onClick={() => setForm(blank)}>
          + Nuovo
        </button>
      </div>
      <p className="sub">Schema predefinito (peso, serie, ripetizioni), tipo e recupero: nel programma puoi cambiarlo giorno per giorno. Peso 0 kg vuol dire corpo libero.</p>

      {form && (
        <div className="form" id="xform">
          <Field label="Nome" value={form.name} autoComplete="off" autoFocus maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
          <div className="grid3">
            <Field label="Peso (kg)" inputMode="decimal" value={form.weight} onChange={(e) => patch({ weight: e.target.value })} />
            <Field label="Serie" inputMode="numeric" value={form.sets} onChange={(e) => patch({ sets: e.target.value })} />
            <Field label="Rip." inputMode="numeric" value={form.reps} onChange={(e) => patch({ reps: e.target.value })} />
          </div>
          <div className="grid2">
            <Select label="Tipo" value={form.type} options={EXERCISE_TYPES.map((t) => ({ v: t, l: TYPE_LABEL[t] }))} onChange={(type) => patch({ type })} />
            <Field label="Recupero (s)" inputMode="numeric" value={form.rest} onChange={(e) => patch({ rest: e.target.value })} />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={form.inRecords} onChange={(e) => patch({ inRecords: e.target.checked })} />
            Mostra nei record personali
          </label>
          <div className="row">
            <button className="btn" onClick={save}>
              {form.id ? 'Salva modifiche' : 'Aggiungi esercizio'}
            </button>
            <button className="btn ghost" onClick={() => setForm(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {!active.length && !form && <p className="empty">Il catalogo è vuoto. Aggiungi il tuo primo esercizio.</p>}
      {active.map((e) => (
        <div className="entry" key={e.id}>
          <div>
            <b>{e.name}</b>
            <div className="pmeta">
              {e.targetSets} serie × {e.targetReps} rip. · {fmt(e.targetWeight)} kg · recupero {e.restSeconds} s
            </div>
            <div className="chips">
              <TypeChip type={e.type} />
              {e.inRecords && <span className="chip mut">Nei record</span>}
            </div>
          </div>
          <div className="pact col">
            <button
              className="btn small ghost"
              onClick={() => {
                setForm(toForm(e));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Modifica
            </button>
            <ConfirmButton confirmLabel="Archivia?" onConfirm={() => archive.mutate({ id: e.id, archived: true })}>
              Archivia
            </ConfirmButton>
          </div>
        </div>
      ))}
      {active.length > 0 && <p className="hint" style={{ marginTop: 12 }}>Archiviare toglie l'esercizio da programma e liste, ma conserva lo storico e i grafici.</p>}

      {archived.length > 0 && (
        <>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn small ghost" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Nascondi archiviati' : `Archiviati (${archived.length})`}
            </button>
          </div>
          {showArchived &&
            archived.map((e) => {
              const n = count(e.id);
              return (
                <div className="entry" key={e.id}>
                  <div>
                    <b>{e.name}</b>
                    <div className="pmeta">{n ? `${n} registrazioni nello storico` : 'Nessuna registrazione'}</div>
                  </div>
                  <div className="pact col">
                    <button className="btn small ghost" onClick={() => archive.mutate({ id: e.id, archived: false })}>
                      Ripristina
                    </button>
                    <ConfirmButton confirmLabel={n ? `Elimina anche ${n} reg.` : 'Conferma'} onConfirm={() => del.mutate(e.id)} />
                  </div>
                </div>
              );
            })}
        </>
      )}
    </section>
  );
}
