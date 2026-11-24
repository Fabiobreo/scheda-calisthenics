import { useEffect, useRef, useState } from 'react';
import { ConfirmButton, Field, Select } from '../../components/ui';
import { useCreateLevelRecord, useDeleteLevelRecord, useUpdateLevelRecord } from '../../data/hooks';
import type { LevelRecordRow } from '../../data/types';
import { shortDate, todayStr } from '../../lib/dates';
import { numInput, parseNum } from '../../lib/format';
import {
  availableOptions,
  levelSummary,
  scoreSub,
  subRule,
  suggestNext,
  v2EntryId,
  validateRecord,
  type LevelSummary,
  type StageOption,
  type SubId,
} from '../../lib/levels';
import { chainRule, LIMITS as V2_LIMITS, stageLimits, validateRecord as validateV2, type EntryRule } from '../../lib/levels/v2';
import { celebrations, recordText, subPercentText, validationMessage } from './levelView';

/** Record come li dà `useLevel`: progressioni coi nomi del motore vecchio, peso corporeo dentro il record. */
type Row = LevelRecordRow;

/**
 * Voce del motore v2 (quella che il database accetta, ticket 32) per una progressione del motore vecchio, che
 * questo foglio usa ancora fino al ticket 34. undefined = la progressione non esiste più e non si può inserire.
 */
const entryOf = (subId: string, stageId: string): EntryRule | undefined => chainRule(subId)?.entries.find((e) => e.id === v2EntryId(subId, stageId));

/** Progressioni inseribili: quelle sbloccate nel motore vecchio che sono ancora voci del database. */
export const insertableOptions = (subId: SubId, records: readonly Row[]): StageOption[] =>
  availableOptions(subId, records).filter((o) => entryOf(subId, o.stageId));

/** Peso da proporre: quello dell'ultimo record che ne ha uno. */
function lastBodyweight(records: readonly Row[]): string {
  let last: Row | null = null;
  for (const r of records) if (r.bodyweightKg !== null && (!last || r.date >= last.date)) last = r;
  return last ? numInput(last.bodyweightKg!) : '';
}

const UNIT_LABEL: Record<StageOption['measure'], string> = { reps: 'Ripetizioni', seconds: 'Secondi', kg: 'Kg' };
const UNIT: Record<StageOption['measure'], string> = { reps: 'rip.', seconds: 's', kg: 'kg' };

/** Progressione da proporre all'apertura: quella del record migliore, o la successiva se è già al massimo. */
function startingStage(subId: SubId, records: Row[], options: StageOption[]): string {
  const best = scoreSub(subId, records).best;
  if (best) {
    const next = suggestNext(best, records);
    if (next && options.some((o) => o.stageId === next.stageId)) return next.stageId;
    if (options.some((o) => o.stageId === best.stage)) return best.stage;
  }
  return options[0].stageId;
}

/** Fase in cui compare la progressione: le progressioni ELITE finiscono in un gruppo a parte nella scelta. */
function isEliteStage(subId: SubId, stageId: string): boolean {
  const stage = subRule(subId)?.stages.find((s) => s.id === stageId);
  if (!stage) return false;
  return stage.kind === 'load' ? Math.min(...stage.terms.map((t) => t.phase)) > 0 : Math.min(...stage.segments.map((s) => s.phase)) > 0;
}

/**
 * Pannello di un sotto-esercizio (ticket 10): definizione, percentuale, inserimento di un record col controllo giusto
 * per la progressione (solo quelle sbloccate, valore nei limiti), storico con modifica ed eliminazione.
 * Il peso corporeo si chiede qui, dentro il record, solo se la formula della voce lo usa (ticket 32).
 */
export function RecordSheet({
  subId,
  records,
  summary,
  onClose,
  onCelebrate,
  readOnly = false,
}: {
  subId: SubId;
  records: Row[];
  summary: LevelSummary;
  onClose: () => void;
  onCelebrate: (msgs: string[]) => void;
  /** il trainer legge i record dell'atleta: niente inserimento, modifica o eliminazione */
  readOnly?: boolean;
}) {
  const rule = subRule(subId)!;
  const score = scoreSub(subId, records);
  // la progressione di un record esistente è sempre tra queste: il record stesso la sblocca
  const options = insertableOptions(subId, records);
  const history = records.filter((r) => r.subId === subId).sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

  const [editing, setEditing] = useState<Row | null>(null);
  const [stage, setStage] = useState(() => startingStage(subId, records, options));
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayStr());
  const [bw, setBw] = useState(() => lastBodyweight(records));
  const [bwErr, setBwErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dateErr, setDateErr] = useState<string | null>(null);
  const create = useCreateLevelRecord();
  const update = useUpdateLevelRecord();
  const del = useDeleteLevelRecord();
  const busy = create.isPending || update.isPending;
  const title = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // tastiera: Esc chiude; il fuoco entra nel pannello e, alla chiusura, torna dove era
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    title.current?.focus();
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
      back?.focus?.();
    };
  }, []);

  const opt = options.find((o) => o.stageId === stage) ?? options[0];
  const parsed = parseNum(value);
  const entry = entryOf(subId, opt.stageId)!;
  const suggested = !editing && opt.measure !== 'kg' && parsed === opt.max ? suggestNext({ subId, stage: opt.stageId, value: parsed }, records) : null;
  const next = suggested && entryOf(subId, suggested.stageId) ? suggested : null;
  // i record di una voce che il motore vecchio non conosce (nata col v2) qui si possono solo eliminare
  const editable = (r: Row) => rule.stages.some((s) => s.id === r.stage) && !!entryOf(subId, r.stage);

  const startEdit = (r: Row) => {
    setEditing(r);
    setStage(r.stage);
    setValue(numInput(r.value));
    setDate(r.date);
    if (r.bodyweightKg !== null) setBw(numInput(r.bodyweightKg));
    setErr(null);
    setBwErr(null);
    setDateErr(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setStage(startingStage(subId, records, options));
    setValue('');
    setDate(todayStr());
    setBw(lastBodyweight(records));
    setErr(null);
    setBwErr(null);
    setDateErr(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return setDateErr('Scegli la data');
    if (date > todayStr()) return setDateErr('La data non può essere nel futuro');
    const rec = { subId, stage: opt.stageId, value: parsed };
    const bad = validateRecord(rec, records);
    if (bad) return setErr(validationMessage(bad, opt));
    // il peso corporeo va nel record solo se la formula della voce lo usa; i limiti sono quelli del motore v2,
    // gli stessi che controlla il database
    const bodyweightKg = entry.usesBodyweight ? (bw.trim() ? Math.round(parseNum(bw) * 10) / 10 : null) : null;
    switch (validateV2({ chainId: subId, entry: entry.id, value: parsed, bodyweightKg })) {
      case null:
        break;
      case 'bodyweight-missing':
        return setBwErr('Inserisci il tuo peso corporeo');
      case 'bodyweight-out-of-range':
        return setBwErr(`Tra ${V2_LIMITS.minBodyweightKg} e ${V2_LIMITS.maxBodyweightKg} kg`);
      case 'below-min':
        return setErr(opt.measure === 'kg' ? 'Deve essere maggiore di 0' : validationMessage('below-min', opt));
      case 'above-max': {
        const max = stageLimits().find((l) => l.chainId === subId && l.entry === entry.id)?.max;
        return setErr(validationMessage('above-max', max === undefined ? opt : { ...opt, max }));
      }
      default:
        return setErr(validationMessage('unknown-stage', opt));
    }
    const row = { ...rec, date, bodyweightKg };
    const rows = editing ? records.map((r) => (r.id === editing.id ? { ...r, ...row } : r)) : [...records, row];
    const done = () => {
      onCelebrate(celebrations(summary, levelSummary(rows)));
      onClose();
    };
    // nel database va la voce v2, non il nome che ha nel motore vecchio
    if (editing) update.mutate({ id: editing.id, patch: { stage: entry.id, value: rec.value, bodyweightKg, date } }, { onSuccess: done });
    else create.mutate({ subId, stage: entry.id, value: rec.value, bodyweightKg, date, note: null }, { onSuccess: done });
  };

  const hint =
    opt.measure === 'kg'
      ? opt.load === 'zavorra'
        ? 'Solo la zavorra aggiunta, per 1 ripetizione. Deve essere maggiore di 0.'
        : 'Peso sul bilanciere, bilanciere incluso, per 1 ripetizione.'
      : `Da ${opt.min} a ${opt.max} ${opt.measure === 'reps' ? 'ripetizioni' : 'secondi'}.`;

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rec-sheet" role="dialog" aria-modal="true" aria-labelledby="rec-title">
        <div className="card-h">
          <h2 id="rec-title" ref={title} tabIndex={-1}>
            {rule.name}
          </h2>
          <button className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <p className="hint rec-def">{rule.definition}</p>
        <p className="rec-now">
          <b className={score.zone === 'elite' ? 'elite' : undefined}>{subPercentText(score)}</b>
          <span>{score.best ? `Record: ${recordText(score.best)} · ${shortDate(score.best.date)}` : 'Ancora nessun record'}</span>
        </p>

        {!readOnly && (
          <form className="form" onSubmit={save} noValidate>
            <h3 className="rec-h">{editing ? 'Modifica record' : 'Nuovo record'}</h3>
            {options.length > 1 && (
              <Select
                label="Progressione"
                value={opt.stageId}
                options={options.map((o) => ({ v: o.stageId, l: o.name, group: isEliteStage(subId, o.stageId) ? 'ELITE' : undefined }))}
                onChange={(v) => {
                  setStage(v);
                  setErr(null);
                }}
              />
            )}
            {opt.definition && <p className="hint">{opt.definition}</p>}
            <Field
              label={options.length > 1 ? UNIT_LABEL[opt.measure] : `${opt.name} (${UNIT[opt.measure]})`}
              inputMode={opt.measure === 'kg' ? 'decimal' : 'numeric'}
              autoComplete="off"
              value={value}
              hint={hint}
              error={err ?? undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setErr(null);
              }}
            />
            {entry.usesBodyweight && (
              <Field
                label="Peso corporeo (kg)"
                inputMode="decimal"
                autoComplete="off"
                value={bw}
                hint="Il tuo peso il giorno del record: serve a calcolarne i punti."
                error={bwErr ?? undefined}
                onChange={(e) => {
                  setBw(e.target.value);
                  setBwErr(null);
                }}
              />
            )}
            <Field
              label="Data"
              type="date"
              max={todayStr()}
              value={date}
              error={dateErr ?? undefined}
              onChange={(e) => {
                setDate(e.target.value);
                setDateErr(null);
              }}
            />
            {next && <p className="coach-note">Sei al massimo di {opt.name}: dopo questo record prova {next.name}.</p>}
            <div className="row">
              <button className="btn" disabled={busy} aria-busy={busy || undefined}>
                {editing ? 'Salva modifica' : 'Salva record'}
              </button>
              {editing && (
                <button type="button" className="btn ghost" onClick={cancelEdit}>
                  Annulla
                </button>
              )}
            </div>
          </form>
        )}

        <h3 className="rec-h">Storico</h3>
        {history.length === 0 ? (
          <p className="hint">{readOnly ? 'Nessun record inserito.' : 'Qui compariranno i tuoi record.'}</p>
        ) : (
          <ul className="rec-list">
            {history.map((r) => (
              <li key={r.id} className={editing?.id === r.id ? 'on' : undefined}>
                <span>
                  <b>{recordText(r)}</b>
                  {score.best?.id === r.id && <span className="pr"> · migliore</span>}
                  <small>{shortDate(r.date)}</small>
                </span>
                {!readOnly && (
                  <span className="pact">
                    {editable(r) && (
                      <button type="button" className="btn small ghost" onClick={() => startEdit(r)} aria-label={`Modifica ${recordText(r)} del ${shortDate(r.date)}`}>
                        Modifica
                      </button>
                    )}
                    <ConfirmButton onConfirm={() => del.mutate(r.id, { onSuccess: () => editing?.id === r.id && cancelEdit() })} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
