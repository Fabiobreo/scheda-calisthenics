import { useState } from 'react';
import { useToast } from '../../app/toast';
import { ConfirmButton, Field, Select, TypeChip } from '../../components/ui';
import { useArchiveExercise, useCreateExercise, useData, useDeleteExercise, useUpdateExercise } from '../../data/hooks';
import { EXERCISE_TYPES, TYPE_LABEL, type Exercise, type ExerciseType } from '../../data/types';

interface Form {
  id: string | null;
  name: string;
  type: ExerciseType;
  inRecords: boolean;
}

const blank: Form = { id: null, name: '', type: 'volume', inRecords: false };

const toForm = (e: Exercise): Form => ({
  id: e.id,
  name: e.name,
  type: e.type,
  inRecords: e.inRecords,
});

/** Confronto dei nomi come lo fa il database: maiuscole e spazi esterni non contano. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

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
    if (!name) return toast("Scrivi il nome dell'esercizio");
    if (name.length > 80) return toast('Nome troppo lungo');
    const twin = exercises.find((e) => e.id !== form.id && sameName(e.name, name));
    if (twin) return toast(twin.archivedAt ? `"${twin.name}" esiste già tra gli archiviati: ripristinalo` : `"${twin.name}" esiste già`);
    const body = { name, type: form.type, inRecords: form.inRecords };
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
      <p className="sub">Solo il movimento, senza serie e ripetizioni: quelle le scegli nel programma, giorno per giorno. Così i grafici seguono l'esercizio qualunque schema usi.</p>

      {form && (
        <div className="form" id="xform">
          <Field label="Nome" value={form.name} autoComplete="off" autoFocus maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
          <Select label="Tipo" value={form.type} options={EXERCISE_TYPES.map((t) => ({ v: t, l: TYPE_LABEL[t] }))} onChange={(type) => patch({ type })} />
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
