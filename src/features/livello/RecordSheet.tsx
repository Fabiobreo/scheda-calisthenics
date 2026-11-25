import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmButton, Field, Select } from '../../components/ui';
import { useCreateLevelRecord, useDeleteLevelRecord, useProfile, useUpdateLevelRecord, type LevelRow } from '../../data/hooks';
import { shortDate, todayStr } from '../../lib/dates';
import { numInput, parseNum } from '../../lib/format';
import { availableEntries, levelSummary, validateRecord, type ChainId, type LevelRecord, type LevelSummary } from '../../lib/levels';
import {
  celebrations,
  chainLevelText,
  chainName,
  chainPercent,
  entryLevelsText,
  errorField,
  lastBodyweight,
  missingBodyweight,
  recordText,
  validationMessage,
  valueHint,
  valueLabel,
} from './levelView';

type Row = LevelRow;

const bwText = (records: readonly Row[]) => {
  const kg = lastBodyweight(records);
  return kg === null ? '' : numInput(kg);
};

/**
 * Foglio del record di una catena (ticket 34): livello attuale, inserimento di un record e storico.
 * - "Esercizio" propone solo le voci ancora da completare (`availableEntries`): una voce sparisce quando tutti i suoi
 *   livelli sono pieni, anche se li ha riempiti un record più alto.
 * - Il peso corporeo si chiede solo se la formula della voce lo usa, dentro il record, precompilato con l'ultimo.
 * - I controlli sono quelli del motore (`validateRecord`): fuori dai limiti c'è un messaggio e non si salva niente.
 * - Lo storico resta visibile e correggibile, anche per le voci già complete; a catena tutta completa non c'è il
 *   modulo, solo "Catena completata" e lo storico.
 * - "Non condividere con gli amici" (ticket 39): il record non diventa una novità per chi segue l'utente. Compare solo
 *   se la condivisione dei record è accesa in Account.
 */
export function RecordSheet({
  chainId,
  records,
  summary,
  onClose,
  onCelebrate,
  readOnly = false,
}: {
  chainId: ChainId;
  records: Row[];
  summary: LevelSummary<Row>;
  onClose: () => void;
  onCelebrate: (msgs: string[]) => void;
  /** il trainer legge i record dell'atleta: niente inserimento, modifica o eliminazione */
  readOnly?: boolean;
}) {
  const score = summary.categories.flatMap((c) => c.chains).find((c) => c.chainId === chainId)!;
  // tutte le voci della catena coi limiti del campo (senza record nessuna è piena) e quelle ancora da completare
  const all = useMemo(() => availableEntries(chainId, []), [chainId]);
  const todo = availableEntries(chainId, records);
  const history = records.filter((r) => r.chainId === chainId).sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

  const [editing, setEditing] = useState<Row | null>(null);
  const [entryId, setEntryId] = useState(() => todo[0]?.entryId ?? '');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayStr());
  const [bw, setBw] = useState(() => bwText(records));
  const [bwErr, setBwErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dateErr, setDateErr] = useState<string | null>(null);
  const [noShare, setNoShare] = useState(false);
  const sharing = useProfile().data?.shareRecords ?? false;
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

  // correggendo un record la sua voce resta tra le scelte anche se è già completa
  const options = editing ? all.filter((o) => o.entryId === editing.stage || todo.some((t) => t.entryId === o.entryId)) : todo;
  const opt = options.find((o) => o.entryId === entryId) ?? options[0];
  const known = (r: Row) => all.some((o) => o.entryId === r.stage);

  const clearErrors = () => {
    setErr(null);
    setBwErr(null);
    setDateErr(null);
  };

  const startEdit = (r: Row) => {
    setEditing(r);
    setEntryId(r.stage);
    setValue(numInput(r.value));
    setDate(r.date);
    if (r.bodyweightKg !== null) setBw(numInput(r.bodyweightKg));
    setNoShare(!r.shared);
    clearErrors();
    // il modulo sta sopra lo storico: lo si riporta in vista
    requestAnimationFrame(() => title.current?.scrollIntoView({ block: 'start' }));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEntryId(todo[0]?.entryId ?? '');
    setValue('');
    setDate(todayStr());
    setBw(bwText(records));
    setNoShare(false);
    clearErrors();
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opt) return;
    if (!date) return setDateErr('Scegli la data');
    if (date > todayStr()) return setDateErr('La data non può essere nel futuro');
    // il peso corporeo va nel record solo se la formula della voce lo usa
    const bodyweightKg = opt.usesBodyweight ? (bw.trim() ? Math.round(parseNum(bw) * 10) / 10 : null) : null;
    const rec: LevelRecord = { chainId, entry: opt.entryId, value: parseNum(value), bodyweightKg };
    // un record nuovo deve stare su una voce ancora da completare; una correzione no (30, decisione 6)
    const bad = validateRecord(rec, editing ? undefined : records);
    if (bad) {
      const msg = validationMessage(bad, opt);
      return errorField(bad) === 'bodyweight' ? setBwErr(msg) : setErr(msg);
    }
    const after = levelSummary([...records.filter((r) => r.id !== editing?.id), rec]);
    const done = () => {
      onCelebrate(celebrations(summary, after));
      onClose();
    };
    if (editing) update.mutate({ id: editing.id, patch: { stage: opt.entryId, value: rec.value, bodyweightKg, date, shared: !noShare } }, { onSuccess: done });
    else create.mutate({ subId: chainId, stage: opt.entryId, value: rec.value, bodyweightKg, date, note: null, shared: !noShare }, { onSuccess: done });
  };

  const levelText = chainLevelText(score);

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rec-sheet" role="dialog" aria-modal="true" aria-labelledby="rec-title">
        <div className="card-h">
          <h2 id="rec-title" ref={title} tabIndex={-1}>
            {chainName(chainId)}
          </h2>
          <button type="button" className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <p className="rec-now">
          {levelText && <b>{chainPercent(score)}%</b>}
          <span>{levelText ?? 'Ancora nessun livello'}</span>
        </p>
        <p className="hint">{score.best ? `Record: ${recordText(score.best)} · ${shortDate(score.best.date)}` : 'Ancora nessun record'}</p>

        {!readOnly && !opt && <p className="coach-note rec-done">Catena completata: hai riempito tutti i livelli.</p>}

        {!readOnly && opt && (
          <form className="form" onSubmit={save} noValidate>
            <h3 className="rec-h">{editing ? 'Modifica record' : 'Nuovo record'}</h3>
            <Select
              label="Esercizio"
              value={opt.entryId}
              options={options.map((o) => ({ v: o.entryId, l: o.name }))}
              onChange={(v) => {
                setEntryId(v);
                clearErrors();
              }}
            />
            <p className="hint">
              {entryLevelsText(opt)}
              {opt.levels.length > 1 ? ': quale raggiungi lo decide il valore.' : '.'}
            </p>
            <Field
              label={valueLabel(opt)}
              inputMode={opt.measure === 'kg' ? 'decimal' : 'numeric'}
              autoComplete="off"
              value={value}
              hint={valueHint(opt)}
              error={err ?? undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setErr(null);
              }}
            />
            {opt.usesBodyweight && (
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
            {sharing && (
              <label className="check-row">
                <input type="checkbox" checked={noShare} onChange={(e) => setNoShare(e.target.checked)} />
                Non condividere con gli amici
              </label>
            )}
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
                  {missingBodyweight(r) && <span className="warn"> · manca il peso: non conta</span>}
                  <small>
                    {shortDate(r.date)}
                    {r.bodyweightKg !== null && ` · peso ${numInput(r.bodyweightKg)} kg`}
                  </small>
                </span>
                {!readOnly && (
                  <span className="pact">
                    {/* una voce che le regole non conoscono più si può solo eliminare */}
                    {known(r) && (
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
