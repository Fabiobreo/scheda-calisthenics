import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRestTimer } from '../../app/restTimer';
import { useToast } from '../../app/toast';
import { Field, Select, Seg } from '../../components/ui';
import { useCatalog, useCreateEntry, useData, useUpdateEntry } from '../../data/hooks';
import {
  DEFAULT_REST,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EXERCISE_TYPES,
  TYPE_LABEL,
  type CatalogExercise,
  type Difficulty,
  type Entry,
  type EntryKind,
  type Exercise,
  type ExerciseType,
  type PlanItem,
  type Scheme,
} from '../../data/types';
import { defaultType } from '../../lib/catalog';
import { shortDate, todayStr } from '../../lib/dates';
import { fmtSets, numInput, parseNum } from '../../lib/format';
import { lastTraining, personalBest, suggestedRest, suggestType } from '../../lib/stats';

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
  /**
   * forza, volume o tecnico: dalla scheda del giorno, altrimenti scelto qui.
   * null solo nelle bozze di versioni precedenti: se non lo sceglie l'utente, lo completa il database.
   */
  type: ExerciseType | null;
  date: string;
  rows: Row[];
  difficulty: Difficulty | null;
  /** secondi di recupero per il timer */
  rest: number;
  /** nota dell'atleta sulla sessione */
  note: string;
  /** indicazioni del trainer per questo esercizio in questo giorno */
  coachNote: string | null;
}

/**
 * `scheme`: schema del giorno del programma da cui si apre; senza, si parte dall'ultimo allenamento.
 * `coachNote`: nota del trainer su quel giorno, da tenere sotto gli occhi mentre ci si allena.
 */
type OpenOpts = { entry: Entry } | { exerciseId?: string; kind?: EntryKind; date?: string; scheme?: Scheme; coachNote?: string | null };

const Ctx = createContext<(o?: OpenOpts) => void>(() => {});
export const useLogger = () => useContext(Ctx);

function readDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null;
    // le bozze salvate da versioni precedenti non hanno tutti i campi
    return d && { ...d, rest: d.rest ?? DEFAULT_REST, note: d.note ?? '', coachNote: d.coachNote ?? null, type: d.type ?? null };
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

/**
 * Serie di partenza. Tentativo: una serie al peso del record attuale.
 * Allenamento: lo schema del giorno, altrimenti le serie dell'ultimo allenamento, altrimenti una serie da compilare.
 */
function startingRows(entries: Entry[], exerciseId: string, kind: EntryKind, scheme?: Scheme): Row[] {
  if (kind === 'attempt') return [{ weight: numInput(personalBest(entries, exerciseId)?.set.weight ?? 0), reps: '1', done: false }];
  if (scheme) return Array.from({ length: scheme.sets }, () => ({ weight: numInput(scheme.weight), reps: String(scheme.reps), done: false }));
  const last = lastTraining(entries, exerciseId);
  if (last) return last.sets.map((x) => ({ weight: numInput(x.weight), reps: String(x.reps), done: false }));
  return [{ weight: '0', reps: '', done: false }];
}

/** Tipo di partenza senza uno schema da cui si apre: i tentativi di record sono forza, il resto come in programma quel giorno. */
function startingType(plan: PlanItem[], entries: Entry[], catalog: CatalogExercise[], ex: Exercise, kind: EntryKind, date: string): ExerciseType {
  return kind === 'attempt' ? 'forza' : suggestType(plan, entries, ex.id, date, defaultType(catalog, ex));
}

export function LoggerProvider({ children }: { children: ReactNode }) {
  const { exercises, active, done, plan } = useData();
  const catalog = useCatalog().data ?? [];
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
          type: e.type,
          date: e.date,
          rows: e.sets.map((s) => ({ weight: numInput(s.weight), reps: String(s.reps), done: true })),
          difficulty: e.difficulty,
          rest: suggestedRest(plan, e.exerciseId),
          note: e.note ?? '',
          coachNote: plan.find((p) => p.exerciseId === e.exerciseId && p.date === e.date)?.note ?? null,
        });
        return;
      }
      const kind = o.kind ?? 'training';
      const pool = kind === 'attempt' ? active.filter((e) => e.inRecords) : active;
      // un esercizio chiesto per id si cerca anche tra gli archiviati: una riga del trainer può restare su uno di questi
      const asked = o.exerciseId ? exercises.find((e) => e.id === o.exerciseId) : undefined;
      const ex = (asked && (kind !== 'attempt' || asked.inRecords) ? asked : undefined) ?? pool[0];
      if (!ex) return;
      const date = o.date ?? todayStr();
      const saved = readDraft();
      // riapre la bozza in corso se è per lo stesso esercizio e lo stesso giorno
      if (saved && !saved.entryId && saved.exerciseId === ex.id && saved.kind === kind && saved.date === date) {
        setDraft(saved);
        return;
      }
      setDraft({
        entryId: null,
        exerciseId: ex.id,
        kind,
        type: o.scheme?.type ?? startingType(plan, done, catalog, ex, kind, date),
        date,
        rows: startingRows(done, ex.id, kind, o.scheme),
        difficulty: null,
        rest: o.scheme?.rest ?? suggestedRest(plan, ex.id),
        note: '',
        coachNote: o.coachNote ?? null,
      });
    },
    [exercises, active, done, plan, catalog, setDraft],
  );

  return (
    <Ctx.Provider value={open}>
      {children}
      {draft && <LoggerSheet draft={draft} setDraft={setDraft} />}
    </Ctx.Provider>
  );
}

function LoggerSheet({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft | null) => void }) {
  const { active, exercises, done, plan, isLoading } = useData();
  const catalog = useCatalog().data ?? [];
  const timer = useRestTimer();
  const toast = useToast();
  const create = useCreateEntry(draft.kind === 'attempt' ? 'Tentativo salvato' : 'Allenamento salvato');
  const update = useUpdateEntry('Modifica salvata');
  const ex = exercises.find((e) => e.id === draft.exerciseId);
  const editing = draft.entryId !== null;
  const attempt = draft.kind === 'attempt';
  const pool = attempt ? active.filter((e) => e.inRecords) : active;
  // l'esercizio aperto resta tra le scelte anche se è archiviato
  const choices = ex && !pool.includes(ex) ? [ex, ...pool] : pool;

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

  const last = attempt ? undefined : lastTraining(done, ex.id);
  const future = draft.date > todayStr();
  const rest = draft.rest;

  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const patchRow = (i: number, p: Partial<Row>) => patch({ rows: draft.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  const switchExercise = (id: string) => {
    const next = active.find((e) => e.id === id);
    if (next)
      patch({
        exerciseId: id,
        type: startingType(plan, done, catalog, next, draft.kind, draft.date),
        rows: startingRows(done, id, draft.kind),
        rest: suggestedRest(plan, id),
      });
  };

  const toggleDone = (i: number) => {
    const done = !draft.rows[i].done;
    patchRow(i, { done });
    if (done && rest > 0 && i < draft.rows.length - 1) timer.start(rest, `Recupero · ${ex.name}`);
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
    const note = draft.note.trim();
    if (note.length > 500) return toast('Nota troppo lunga (massimo 500 caratteri)');
    const body = { exerciseId: draft.exerciseId, kind: draft.kind, type: draft.type ?? undefined, date: draft.date || todayStr(), sets, difficulty: draft.difficulty, note: note || null };
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
          {!attempt && (last || rest > 0) && (
            <p className="hint">
              {last && `Ultima volta ${fmtSets(last.sets)} · ${shortDate(last.date)}`}
              {last && rest > 0 && ' · '}
              {rest > 0 && `recupero ${rest} s`}
            </p>
          )}
          <div className="fld">
            <span>Tipo</span>
            <Seg label="Tipo" value={draft.type} options={EXERCISE_TYPES.map((t) => ({ v: t, l: TYPE_LABEL[t] }))} onChange={(type) => patch({ type })} />
          </div>
          {draft.coachNote && (
            <p className="coach-note">
              <b>Dal trainer:</b> {draft.coachNote}
            </p>
          )}

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
              {rest > 0 && (
                <button className="btn small ghost" onClick={() => timer.start(rest, `Recupero · ${ex.name}`)}>
                  Avvia recupero
                </button>
              )}
            </div>
          )}

          <div className="grid2">
            <Field label="Data" type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          {future && <p className="hint">Data futura: resta in programma e conta nei record e nei grafici da quel giorno.</p>}
          <div className="fld">
            <span>Difficoltà</span>
            <Seg
              label="Difficoltà"
              value={draft.difficulty}
              options={DIFFICULTIES.map((d) => ({ v: d, l: DIFFICULTY_LABEL[d] }))}
              onChange={(d) => patch({ difficulty: draft.difficulty === d ? null : d })}
            />
          </div>
          <Field
            label="Nota (facoltativa)"
            value={draft.note}
            maxLength={500}
            placeholder="Com'è andata, sensazioni, dolori…"
            hint="La vede anche il tuo trainer."
            onChange={(e) => patch({ note: e.target.value })}
          />

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
