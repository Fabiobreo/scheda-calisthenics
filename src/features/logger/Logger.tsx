import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRestTimer } from '../../app/restTimer';
import { useToast } from '../../app/toast';
import { Field, Select, Seg } from '../../components/ui';
import { useCreateEntry, useData, useUpdateEntry } from '../../data/hooks';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty, type Entry, type EntryKind, type Exercise } from '../../data/types';
import { todayStr } from '../../lib/dates';
import { fmt, numInput, parseNum } from '../../lib/format';
import { lastTraining } from '../../lib/stats';

const DRAFT_KEY = 'scheda:logger-draft';

interface Row {
  weight: string;
  reps: string;
  done: boolean;
}

interface Draft {
  /** id della registrazione in modifica; null = nuova */
  entryId: string | null;
  exerciseId: string;
  kind: EntryKind;
  date: string;
  rows: Row[];
  difficulty: Difficulty | null;
}

type OpenOpts = { entry: Entry } | { exerciseId?: string; kind?: EntryKind; date?: string };

const Ctx = createContext<(o?: OpenOpts) => void>(() => {});
export const useLogger = () => useContext(Ctx);

function readDraft(): Draft | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignora */
  }
}

/** Serie di partenza: quelle dell'ultimo allenamento, altrimenti l'obiettivo dell'esercizio. */
function startingRows(ex: Exercise, entries: Entry[], kind: EntryKind): Row[] {
  if (kind === 'attempt') return [{ weight: numInput(ex.targetWeight), reps: '1', done: false }];
  const last = lastTraining(entries, ex.id);
  if (last) return last.sets.map((s) => ({ weight: numInput(s.weight), reps: String(s.reps), done: false }));
  return Array.from({ length: ex.targetSets }, () => ({ weight: numInput(ex.targetWeight), reps: String(ex.targetReps), done: false }));
}

export function LoggerProvider({ children }: { children: ReactNode }) {
  const { active, entries } = useData();
  // la bozza sopravvive al ricaricamento della pagina: un allenamento a metà non va perso
  const [draft, setDraftState] = useState<Draft | null>(readDraft);

  const setDraft = useCallback((d: Draft | null) => {
    setDraftState(d);
    writeDraft(d);
  }, []);

  const open = useCallback(
    (o: OpenOpts = {}) => {
      if ('entry' in o) {
        const e = o.entry;
        setDraft({
          entryId: e.id,
          exerciseId: e.exerciseId,
          kind: e.kind,
          date: e.date,
          rows: e.sets.map((s) => ({ weight: numInput(s.weight), reps: String(s.reps), done: true })),
          difficulty: e.difficulty,
        });
        return;
      }
      const kind = o.kind ?? 'training';
      const pool = kind === 'attempt' ? active.filter((e) => e.inRecords) : active;
      const ex = pool.find((e) => e.id === o.exerciseId) ?? pool[0];
      if (!ex) return;
      const saved = readDraft();
      // riapre la bozza in corso se è per lo stesso esercizio
      if (saved && !saved.entryId && saved.exerciseId === ex.id && saved.kind === kind) {
        setDraft(saved);
        return;
      }
      setDraft({ entryId: null, exerciseId: ex.id, kind, date: o.date ?? todayStr(), rows: startingRows(ex, entries, kind), difficulty: null });
    },
    [active, entries, setDraft],
  );

  return (
    <Ctx.Provider value={open}>
      {children}
      {draft && <LoggerSheet draft={draft} setDraft={setDraft} />}
    </Ctx.Provider>
  );
}

function LoggerSheet({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft | null) => void }) {
  const { active, exercises, entries, isLoading } = useData();
  const timer = useRestTimer();
  const toast = useToast();
  const create = useCreateEntry(draft.kind === 'attempt' ? 'Tentativo salvato' : 'Allenamento salvato');
  const update = useUpdateEntry('Modifica salvata');
  const ex = exercises.find((e) => e.id === draft.exerciseId);
  const editing = draft.entryId !== null;
  const attempt = draft.kind === 'attempt';
  const choices = attempt ? active.filter((e) => e.inRecords) : active;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    document.body.classList.add('locked');
    return () => document.body.classList.remove('locked');
  }, []);

  // bozza rimasta per un esercizio che nel frattempo è stato eliminato
  useEffect(() => {
    if (!isLoading && !ex) setDraft(null);
  }, [isLoading, ex, setDraft]);

  if (!ex) return null;

  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const patchRow = (i: number, p: Partial<Row>) => patch({ rows: draft.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  const switchExercise = (id: string) => {
    const next = active.find((e) => e.id === id);
    if (next) patch({ exerciseId: id, rows: startingRows(next, entries, draft.kind) });
  };

  const toggleDone = (i: number) => {
    const done = !draft.rows[i].done;
    patchRow(i, { done });
    if (done && ex.restSeconds > 0 && i < draft.rows.length - 1) timer.start(ex.restSeconds, `Recupero · ${ex.name}`);
  };

  function close() {
    const started = !editing && draft.rows.some((r) => r.done);
    if (started && !window.confirm('Chiudere senza salvare? Le serie segnate andranno perse.')) return;
    setDraft(null);
  }

  const save = () => {
    const sets = draft.rows.map((r) => ({ weight: parseNum(r.weight || '0'), reps: Number(r.reps) }));
    if (!sets.length) return toast('Aggiungi almeno una serie');
    if (sets.some((s) => !(s.weight >= 0 && s.weight < 10000) || !Number.isInteger(s.reps) || s.reps < 1))
      return toast('Controlla peso e ripetizioni di ogni serie');
    const body = { exerciseId: draft.exerciseId, kind: draft.kind, date: draft.date || todayStr(), sets, difficulty: draft.difficulty };
    if (draft.entryId) update.mutate({ id: draft.entryId, patch: body });
    else create.mutate(body);
    setDraft(null);
  };

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="logger-title">
        <div className="card-h">
          <h2 id="logger-title">{editing ? 'Modifica' : attempt ? 'Tentativo di record' : 'Registra'}</h2>
          <button className="x" onClick={close} aria-label="Chiudi">
            ×
          </button>
        </div>

        <div className="form">
          {editing ? (
            <p className="pname">{ex.name}</p>
          ) : (
            <Select label="Esercizio" value={draft.exerciseId} options={choices.map((e) => ({ v: e.id, l: e.name }))} onChange={switchExercise} />
          )}
          <p className="hint">
            Obiettivo {ex.targetSets} × {ex.targetReps} · {fmt(ex.targetWeight)} kg
            {!attempt && ex.restSeconds > 0 && ` · recupero ${ex.restSeconds} s`}
          </p>

          <div className="sets">
            <div className="set-h" aria-hidden="true">
              <span>#</span>
              <span>Peso (kg)</span>
              <span>Rip.</span>
              <span />
            </div>
            {draft.rows.map((r, i) => (
              <div className={`set${r.done ? ' done' : ''}`} key={i}>
                <span className="set-n">{i + 1}</span>
                <input aria-label={`Peso serie ${i + 1}`} inputMode="decimal" value={r.weight} placeholder="0" onChange={(e) => patchRow(i, { weight: e.target.value })} />
                <input aria-label={`Ripetizioni serie ${i + 1}`} inputMode="numeric" value={r.reps} onChange={(e) => patchRow(i, { reps: e.target.value })} />
                <div className="set-act">
                  {!attempt && (
                    <button className={`check${r.done ? ' on' : ''}`} onClick={() => toggleDone(i)} aria-pressed={r.done} aria-label={`Serie ${i + 1} fatta`}>
                      ✓
                    </button>
                  )}
                  {draft.rows.length > 1 && (
                    <button className="x" onClick={() => patch({ rows: draft.rows.filter((_, j) => j !== i) })} aria-label={`Togli serie ${i + 1}`}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!attempt && (
            <div className="row">
              <button
                className="btn small ghost"
                onClick={() => {
                  const last = draft.rows[draft.rows.length - 1];
                  patch({ rows: [...draft.rows, { weight: last?.weight ?? '0', reps: last?.reps ?? '1', done: false }] });
                }}
              >
                + Serie
              </button>
              {ex.restSeconds > 0 && (
                <button className="btn small ghost" onClick={() => timer.start(ex.restSeconds, `Recupero · ${ex.name}`)}>
                  Avvia recupero
                </button>
              )}
            </div>
          )}

          <div className="grid2">
            <Field label="Data" type="date" value={draft.date} max={todayStr()} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="fld">
            <span>Difficoltà</span>
            <Seg
              label="Difficoltà"
              value={draft.difficulty}
              options={DIFFICULTIES.map((d) => ({ v: d, l: DIFFICULTY_LABEL[d] }))}
              onChange={(d) => patch({ difficulty: draft.difficulty === d ? null : d })}
            />
          </div>

          <div className="row">
            <button className="btn" onClick={save}>
              {editing ? 'Salva modifiche' : attempt ? 'Salva tentativo' : 'Salva allenamento'}
            </button>
            <button className="btn ghost" onClick={close}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
