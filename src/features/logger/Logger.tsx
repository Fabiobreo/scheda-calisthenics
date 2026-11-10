import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRestTimer } from '../../app/restTimer';
import { unlockAudio } from '../../app/sound';
import { useToast } from '../../app/toast';
import { ConfirmButton, Field, Select, Seg } from '../../components/ui';
import { useCatalog, useCreateEntry, useData, useDeleteEntry, useUpdateEntry } from '../../data/hooks';
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
  type Measure,
  type PlanItem,
  type Scheme,
  type WorkSet,
} from '../../data/types';
import { defaultType } from '../../lib/catalog';
import { shortDate, todayStr } from '../../lib/dates';
import { fmt, fmtSets, numInput, parseNum } from '../../lib/format';
import { bestSet, compareSets, lastTraining, personalBest, suggestedRest, suggestType } from '../../lib/stats';
import { byDay } from '../../lib/plan';
import {
  REST_BETWEEN_EXERCISES,
  completeCurrent,
  current,
  isFinished,
  position,
  reconcile,
  skipCurrent,
  startSession,
  totalItems,
  upNext,
  type SessionRecord,
  type WorkoutSession,
} from '../../lib/workout';
import { HoldTimer } from './HoldTimer';
import { WorkoutSummary } from './WorkoutSummary';

const DRAFT_KEY = 'scheda:logger-draft';
const WORKOUT_KEY = 'scheda:workout';

interface Row {
  weight: string;
  /** ripetizioni o secondi, secondo la misura dell'esercizio */
  value: string;
  done: boolean;
}

/** Ripetizioni o secondi di una serie salvata. */
const setValue = (s: WorkSet) => String(s.seconds > 0 ? s.seconds : s.reps);

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
  /** riga del programma aperta dalla modalità sessione (ticket 25); null fuori dalla sessione */
  planId: string | null;
}

/**
 * `scheme`: schema del giorno del programma da cui si apre; senza, si parte dall'ultimo allenamento.
 * `coachNote`: nota del trainer su quel giorno, da tenere sotto gli occhi mentre ci si allena.
 */
type OpenOpts = { entry: Entry } | { exerciseId?: string; kind?: EntryKind; date?: string; scheme?: Scheme; coachNote?: string | null; planId?: string };

const Ctx = createContext<(o?: OpenOpts) => void>(() => {});
export const useLogger = () => useContext(Ctx);

/** Sessione salvata: `ended` = chiusa a mano con "Termina", si vede il riepilogo. */
type StoredSession = WorkoutSession & { ended?: boolean };

interface WorkoutApi {
  session: StoredSession | null;
  /** avvia l'allenamento di oggi e apre il primo esercizio da fare */
  start(): void;
  /** riapre l'esercizio a cui si era arrivati */
  resume(): void;
  /** chiude la sessione prima della fine: compare il riepilogo */
  end(): void;
}

const WorkoutCtx = createContext<WorkoutApi>({ session: null, start() {}, resume() {}, end() {} });
/** Modalità sessione (ticket 25): l'allenamento del giorno guidato esercizio dopo esercizio. */
export const useWorkout = () => useContext(WorkoutCtx);

function readSession(): StoredSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(WORKOUT_KEY) ?? 'null') as StoredSession | null;
    // una sessione di un altro giorno non si riprende
    return s && s.date === todayStr() ? s : null;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession | null) {
  try {
    if (s) localStorage.setItem(WORKOUT_KEY, JSON.stringify(s));
    else localStorage.removeItem(WORKOUT_KEY);
  } catch {
    /* ignora */
  }
}

function readDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null;
    // le bozze salvate da versioni precedenti non hanno tutti i campi
    if (!d) return null;
    // prima del ticket 03 il valore della serie si chiamava `reps`
    const rows = d.rows.map((r) => ({ weight: r.weight, value: r.value ?? (r as Row & { reps?: string }).reps ?? '', done: r.done }));
    return { ...d, rows, rest: d.rest ?? DEFAULT_REST, note: d.note ?? '', coachNote: d.coachNote ?? null, type: d.type ?? null, planId: d.planId ?? null };
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

/** Una serie in breve per il messaggio del record: "20 kg × 5", "12 rip.", "45 s". */
const recordText = (s: WorkSet) => {
  const n = s.seconds > 0 ? `${s.seconds} s` : `${s.reps} rip.`;
  return s.weight > 0 ? `${fmt(s.weight)} kg × ${s.seconds > 0 ? `${s.seconds} s` : s.reps}` : n;
};

/**
 * Serie di partenza. Tentativo: una serie al peso del record attuale (a tempo i secondi si misurano col cronometro).
 * Allenamento: lo schema del giorno, altrimenti le serie dell'ultimo allenamento, altrimenti una serie da compilare.
 */
function startingRows(entries: Entry[], exerciseId: string, kind: EntryKind, measure: Measure, scheme?: Scheme): Row[] {
  if (kind === 'attempt')
    return [{ weight: numInput(personalBest(entries, exerciseId)?.set.weight ?? 0), value: measure === 'time' ? '' : '1', done: false }];
  if (scheme) {
    const value = String(scheme.seconds || scheme.reps);
    return Array.from({ length: scheme.sets }, () => ({ weight: numInput(scheme.weight), value, done: false }));
  }
  const last = lastTraining(entries, exerciseId);
  if (last) return last.sets.map((x) => ({ weight: numInput(x.weight), value: setValue(x), done: false }));
  return [{ weight: '0', value: '', done: false }];
}

/** Tipo di partenza senza uno schema da cui si apre: i tentativi di record sono forza, il resto come in programma quel giorno. */
function startingType(plan: PlanItem[], entries: Entry[], catalog: CatalogExercise[], ex: Exercise, kind: EntryKind, date: string): ExerciseType {
  return kind === 'attempt' ? 'forza' : suggestType(plan, entries, ex.id, date, defaultType(catalog, ex));
}

export function LoggerProvider({ children }: { children: ReactNode }) {
  const { exercises, active, done, plan, entries, isLoading } = useData();
  const catalog = useCatalog().data ?? [];
  const timer = useRestTimer();
  // la bozza sopravvive al ricaricamento della pagina: un allenamento a metà non va perso
  const [draft, setDraftState] = useState<Draft | null>(readDraft);
  // come la bozza: chiudere la pagina a metà allenamento non perde la sessione
  const [session, setSessionState] = useState<StoredSession | null>(readSession);

  const setSession = useCallback((s: StoredSession | null) => {
    setSessionState(s);
    writeSession(s);
  }, []);

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
          rows: e.sets.map((s) => ({ weight: numInput(s.weight), value: setValue(s), done: true })),
          difficulty: e.difficulty,
          rest: suggestedRest(plan, e.exerciseId),
          note: e.note ?? '',
          coachNote: plan.find((p) => p.exerciseId === e.exerciseId && p.date === e.date)?.note ?? null,
          planId: null,
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
        setDraft({ ...saved, planId: o.planId ?? null });
        return;
      }
      setDraft({
        entryId: null,
        exerciseId: ex.id,
        kind,
        type: o.scheme?.type ?? startingType(plan, done, catalog, ex, kind, date),
        date,
        rows: startingRows(done, ex.id, kind, ex.measure, o.scheme),
        difficulty: null,
        rest: o.scheme?.rest ?? suggestedRest(plan, ex.id),
        note: '',
        coachNote: o.coachNote ?? null,
        planId: o.planId ?? null,
      });
    },
    [exercises, active, done, plan, catalog, setDraft],
  );

  /* ---------- modalità sessione (ticket 25) ---------- */

  const visible = useMemo(() => new Set(exercises.map((e) => e.id)), [exercises]);
  const planById = useMemo(() => new Map(plan.map((p) => [p.id, p])), [plan]);
  // riga del programma già registrata quel giorno, dentro o fuori dalla sessione
  const isDone = useCallback(
    (planId: string) => {
      const p = planById.get(planId);
      return !!p && entries.some((e) => e.exerciseId === p.exerciseId && e.kind === 'training' && e.date === p.date);
    },
    [planById, entries],
  );
  const exists = useCallback(
    (planId: string) => {
      const p = planById.get(planId);
      return !!p && visible.has(p.exerciseId);
    },
    [planById, visible],
  );

  const openItem = useCallback(
    (planId: string | null) => {
      const p = planId ? planById.get(planId) : undefined;
      if (!p) return setDraft(null);
      open({ exerciseId: p.exerciseId, date: p.date, scheme: p.scheme, coachNote: p.note, planId: p.id });
    },
    [planById, open, setDraft],
  );

  // il programma o le registrazioni cambiano (anche da un altro dispositivo): la coda si riallinea
  useEffect(() => {
    if (!session || isLoading || session.ended) return;
    const next = reconcile(session, exists, isDone);
    if (next !== session) setSession(next);
  }, [session, isLoading, exists, isDone, setSession]);

  const workout = useMemo<WorkoutApi>(
    () => ({
      session,
      start() {
        const date = todayStr();
        const ids = plan.filter((p) => p.date === date && visible.has(p.exerciseId)).sort(byDay).map((p) => p.id);
        const s = startSession(date, ids, isDone);
        if (isFinished(s)) return;
        unlockAudio();
        setSession(s);
        openItem(current(s));
      },
      resume() {
        if (session && !session.ended) openItem(current(session));
      },
      end() {
        if (!session) return;
        setDraft(null);
        timer.stop();
        setSession({ ...session, ended: true });
      },
    }),
    [session, plan, visible, isDone, setSession, openItem, setDraft, timer],
  );

  /** La riga aperta è stata salvata: recupero di 2 minuti e via col prossimo, o il riepilogo. */
  const sessionSaved = (sets: number, record?: SessionRecord) => {
    if (!session) return setDraft(null);
    const next = completeCurrent(session, sets, record);
    setSession(next);
    const id = current(next);
    if (!id) {
      timer.stop();
      return setDraft(null);
    }
    const name = exercises.find((e) => e.id === planById.get(id)?.exerciseId)?.name;
    timer.start(REST_BETWEEN_EXERCISES, name ? `Recupero · poi ${name}` : 'Recupero');
    openItem(id);
  };

  /** Salta la riga aperta: va in fondo alla coda, la seconda volta esce. */
  const sessionSkip = () => {
    if (!session) return;
    const next = skipCurrent(session);
    setSession(next);
    // saltato l'ultimo: il recupero verso un esercizio che non c'è più non serve
    if (isFinished(next)) timer.stop();
    openItem(current(next));
  };

  const inSession = !!draft && !!session && !session.ended && draft.planId !== null && draft.planId === current(session);
  const nextId = inSession ? upNext(session!) : null;
  const nextName = nextId ? exercises.find((e) => e.id === planById.get(nextId)?.exerciseId)?.name : undefined;

  return (
    <Ctx.Provider value={open}>
      <WorkoutCtx.Provider value={workout}>
        {children}
        {draft && (
          <LoggerSheet
            key={`${draft.planId ?? ''}:${draft.exerciseId}:${draft.entryId ?? ''}`}
            draft={draft}
            setDraft={setDraft}
            session={
              inSession
                ? { pos: position(session!), total: totalItems(session!), next: nextName ?? null, onSaved: sessionSaved, onSkip: sessionSkip }
                : null
            }
          />
        )}
        {!draft && session && (session.ended || isFinished(session)) && (
          <WorkoutSummary session={session} planById={planById} exercises={exercises} onClose={() => setSession(null)} />
        )}
      </WorkoutCtx.Provider>
    </Ctx.Provider>
  );
}

/** Cosa sa il registratore della sessione in corso. */
interface SheetSession {
  pos: number;
  total: number;
  /** nome del prossimo esercizio; null se questo è l'ultimo */
  next: string | null;
  onSaved(sets: number, record?: SessionRecord): void;
  onSkip(): void;
}

function LoggerSheet({ draft, setDraft, session }: { draft: Draft; setDraft: (d: Draft | null) => void; session: SheetSession | null }) {
  const { active, exercises, done, plan, isLoading } = useData();
  const catalog = useCatalog().data ?? [];
  const timer = useRestTimer();
  const toast = useToast();
  const create = useCreateEntry(draft.kind === 'attempt' ? 'Tentativo salvato' : 'Allenamento salvato');
  const update = useUpdateEntry('Modifica salvata');
  const del = useDeleteEntry();
  const ex = exercises.find((e) => e.id === draft.exerciseId);
  const editing = draft.entryId !== null;
  const attempt = draft.kind === 'attempt';
  const pool = attempt ? active.filter((e) => e.inRecords) : active;
  // l'esercizio aperto resta tra le scelte anche se è archiviato
  const choices = ex && !pool.includes(ex) ? [ex, ...pool] : pool;
  // serie che si sta cronometrando
  const [holding, setHolding] = useState<number | null>(null);
  // ultima serie segnata come fatta: solo lei fa il salto della spunta (V02), non quelle già fatte all'apertura
  const [pop, setPop] = useState<number | null>(null);

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
  const timed = ex.measure === 'time';
  const unit = timed ? 'Secondi' : 'Ripetizioni';

  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const patchRow = (i: number, p: Partial<Row>) => patch({ rows: draft.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  const switchExercise = (id: string) => {
    const next = active.find((e) => e.id === id);
    if (next)
      patch({
        exerciseId: id,
        type: startingType(plan, done, catalog, next, draft.kind, draft.date),
        rows: startingRows(done, id, draft.kind, next.measure),
        rest: suggestedRest(plan, id),
      });
  };

  const startRest = (i: number) => {
    if (!attempt && rest > 0 && i < draft.rows.length - 1) timer.start(rest, `Recupero · ${ex.name}`);
  };

  const toggleDone = (i: number) => {
    const done = !draft.rows[i].done;
    patchRow(i, { done });
    setPop(done ? i : null);
    if (done) startRest(i);
  };

  const openHold = (i: number) => {
    // l'audio si sblocca solo durante un tocco
    unlockAudio();
    timer.stop();
    setHolding(i);
  };

  const stopHold = (seconds: number) => {
    const i = holding;
    setHolding(null);
    if (i === null) return;
    if (seconds < 1) return toast('Tenuta sotto il secondo: non la segno');
    patchRow(i, { value: String(seconds), done: true });
    setPop(i);
    startRest(i);
  };

  const cancelHold = () => setHolding(null);

  function close() {
    const started = !editing && draft.rows.some((r) => r.done);
    if (started && !window.confirm('Chiudere senza salvare? Le serie segnate andranno perse.')) return;
    setDraft(null);
  }

  const save = () => {
    const sets = draft.rows.map((r): WorkSet => {
      const weight = parseNum(r.weight || '0');
      const n = r.value.trim() === '' ? NaN : Number(r.value);
      return timed ? { weight, reps: 0, seconds: n } : { weight, reps: n, seconds: 0 };
    });
    if (!sets.length) return toast('Aggiungi almeno una serie');
    const bad = (n: number) => !Number.isInteger(n) || n < 1;
    if (sets.some((s) => !(s.weight >= 0 && s.weight < 10000) || (timed ? bad(s.seconds) || s.seconds > 3600 : bad(s.reps))))
      return toast(timed ? 'Controlla peso e secondi di ogni serie (da 1 a 3600)' : 'Controlla peso e ripetizioni di ogni serie');
    const note = draft.note.trim();
    if (note.length > 500) return toast('Nota troppo lunga (massimo 500 caratteri)');
    const body = { exerciseId: draft.exerciseId, kind: draft.kind, type: draft.type ?? undefined, date: draft.date || todayStr(), sets, difficulty: draft.difficulty, note: note || null };
    let record: SessionRecord | undefined;
    if (draft.entryId) update.mutate({ id: draft.entryId, patch: body });
    else {
      // batte il record di prima (non il primo in assoluto, non una data futura): festa al salvataggio (V02)
      const pb = personalBest(done, draft.exerciseId);
      const best = bestSet(sets);
      const isRecord = !!pb && !!best && body.date <= todayStr() && compareSets(best, pb.set) > 0;
      const name = ex.name;
      if (isRecord) record = { name, text: recordText(best!) };
      // mutateAsync: la promessa arriva anche se il foglio nel frattempo si è chiuso; gli errori li mostra già l'hook
      create.mutateAsync(body).then(
        () => isRecord && toast(`★ Nuovo record · ${name} ${recordText(best!)}`, undefined, 'record'),
        () => {},
      );
    }
    // in sessione si passa al prossimo esercizio (o al riepilogo), altrimenti il foglio si chiude
    if (session) session.onSaved(sets.length, record);
    else setDraft(null);
  };

  const skip = () => {
    if (draft.rows.some((r) => r.done) && !window.confirm('Saltare questo esercizio? Le serie segnate andranno perse.')) return;
    session?.onSkip();
  };

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="logger-title">
        <div className="card-h">
          <h2 id="logger-title">{session ? 'Allenamento' : editing ? 'Modifica' : attempt ? 'Tentativo di record' : 'Registra'}</h2>
          <button className="x" onClick={close} aria-label="Chiudi">
            ×
          </button>
        </div>

        {session && (
          <div className="wo-steps">
            <span className="wo-dots" role="img" aria-label={`Esercizio ${session.pos} di ${session.total}`}>
              {Array.from({ length: Math.min(session.total, 12) }, (_, i) => (
                <i key={i} className={i < session.pos - 1 ? 'on' : i === session.pos - 1 ? 'cur' : undefined} />
              ))}
            </span>
            <span className="wo-pos" aria-hidden="true">
              {session.pos}/{session.total}
            </span>
          </div>
        )}

        <div className="form">
          {editing || session ? (
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
              <span>{timed ? 'Secondi' : 'Rip.'}</span>
              <span />
            </div>
            {draft.rows.map((r, i) => (
              <div className={`set${r.done ? ' done' : ''}${r.done && pop === i ? ' pop' : ''}`} key={i}>
                <span className="set-n">{i + 1}</span>
                <input aria-label={`Peso serie ${i + 1}`} inputMode="decimal" value={r.weight} placeholder="0" onChange={(e) => patchRow(i, { weight: e.target.value })} />
                <input
                  aria-label={`${unit} serie ${i + 1}`}
                  inputMode="numeric"
                  value={r.value}
                  placeholder={timed ? 's' : undefined}
                  onChange={(e) => patchRow(i, { value: e.target.value })}
                />
                <div className="set-act">
                  {timed && (
                    <button className="tmr" onClick={() => openHold(i)} aria-label={`Cronometra serie ${i + 1}`} title="Cronometro">
                      ▶
                    </button>
                  )}
                  {!attempt && (
                    <button className={`check${r.done ? ' on' : ''}${r.done && pop === i ? ' pop' : ''}`} onClick={() => toggleDone(i)} aria-pressed={r.done} aria-label={`Serie ${i + 1} fatta`}>
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
                  patch({ rows: [...draft.rows, { weight: last?.weight ?? '0', value: last?.value ?? (timed ? '' : '1'), done: false }] });
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

          {session && <p className="hint">{session.next ? `Poi: ${session.next}` : 'Ultimo esercizio'}</p>}
          <div className="row">
            <button className="btn" onClick={save}>
              {session ? (session.next ? 'Salva e avanti' : 'Salva e finisci') : editing ? 'Salva modifiche' : attempt ? 'Salva tentativo' : 'Salva allenamento'}
            </button>
            {session ? (
              <button className="btn ghost" onClick={skip}>
                Salta
              </button>
            ) : (
              <button className="btn ghost" onClick={close}>
                Annulla
              </button>
            )}
            {draft.entryId && (
              <span className="push">
                <ConfirmButton
                  confirmLabel="Eliminare?"
                  onConfirm={() => {
                    del.mutate(draft.entryId!);
                    setDraft(null);
                  }}
                />
              </span>
            )}
          </div>
        </div>
      </div>
      {holding !== null && draft.rows[holding] && (
        <HoldTimer
          // obiettivo: i secondi già scritti nella serie (dallo schema del giorno o dall'ultima volta)
          target={Number.isInteger(Number(draft.rows[holding].value)) ? Math.max(0, Number(draft.rows[holding].value)) : 0}
          label={`${ex.name} · serie ${holding + 1}`}
          onStop={stopHold}
          onCancel={cancelHold}
        />
      )}
    </div>
  );
}
