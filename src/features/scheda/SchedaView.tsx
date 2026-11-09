import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../app/toast';
import { EntryItem } from '../../components/EntryItem';
import { SchemeForm } from '../../components/SchemeForm';
import { DotsLegend, WeekDays } from '../../components/WeekDays';
import { CardHead, Cols, PageTitle, SearchSelect, Seg, Select, SetBlocks, TypeChip } from '../../components/ui';
import {
  useAddCatalogToPlan,
  useAddPlanItem,
  useApplyPlanChanges,
  useCatalog,
  useData,
  useTrainerLock,
  useRemovePlanItem,
  useSetPlanScheme,
  useUpdateExercise,
} from '../../data/hooks';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, type PlanChanges, type PlanItem } from '../../data/types';
import { byCategory, defaultType } from '../../lib/catalog';
import { addDays, inWeek, longDate, mondayOf, shortDate, todayStr, weekLabel, weekdayIndex } from '../../lib/dates';
import { fmt, fmtScheme, fmtSets } from '../../lib/format';
import { byDay, copyWeek, dayCount, offPlan, weekItems, type CopyMode } from '../../lib/plan';
import { adherenceText, dayMarks, movedText, summarizeStatuses, weekStatuses } from '../../lib/adherence';
import { lastRecordStep, lastTraining, personalBest, recordEntryIds, suggestScheme } from '../../lib/stats';
import { useLogger } from '../logger/Logger';

export function SchedaView() {
  return (
    <>
      <PageTitle title="Scheda" />
      {/* prima il programma (quello che si apre in palestra), poi i record (audit A03); su schermo largo affiancati (A06) */}
      <Cols left={<Programma />} right={<Records />} />
    </>
  );
}

function Records() {
  const { active, done: entries } = useData();
  const openLogger = useLogger();
  const setInRecords = useUpdateExercise();
  const toast = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adding, setAdding] = useState('');

  const tracked = active.filter((e) => e.inRecords);
  const others = active.filter((e) => !e.inRecords);
  const addId = others.some((e) => e.id === adding) ? adding : (others[0]?.id ?? '');
  const prIds = recordEntryIds(entries);
  const trackedIds = new Set(tracked.map((e) => e.id));
  const history = entries.filter((e) => prIds.has(e.id) && trackedIds.has(e.exerciseId));

  return (
    <section className="card">
      <CardHead title="Record personali" help="Miglior serie singola: più peso, a parità di peso più ripetizioni (o più secondi, nelle tenute). Conta anche gli allenamenti. In ambra i record di questa settimana.">
        {tracked.length > 0 && (
          <button className="btn small" onClick={() => openLogger({ kind: 'attempt' })}>
            + Tentativo
          </button>
        )}
      </CardHead>

      <div className="rlist">
        {tracked.length === 0 && <p className="empty">Nessun esercizio nei record. Aggiungine uno qui sotto.</p>}
        {tracked.map((ex) => {
          const pb = personalBest(entries, ex.id);
          const n = entries.filter((e) => e.exerciseId === ex.id).length;
          // progresso sul record precedente; quello di questa settimana è in ambra (ticket 21)
          const step = lastRecordStep(entries, ex.id);
          const fresh = !!step && step.date >= mondayOf(todayStr());
          return (
            <div className={`rrow${fresh ? ' new' : ''}`} key={ex.id}>
              <div className="rname">{ex.name}</div>
              {pb ? (
                <div className="rval">
                  {pb.set.seconds > 0 && pb.set.weight === 0 ? (
                    <>
                      {pb.set.seconds} <small>s</small>
                    </>
                  ) : (
                    <>
                      {fmt(pb.set.weight)} <small>kg × {pb.set.seconds > 0 ? `${pb.set.seconds} s` : pb.set.reps}</small>
                    </>
                  )}
                  {step?.gain && <span className="rgain">{step.gain}</span>}
                </div>
              ) : (
                <div className="rval none">—</div>
              )}
              <div className="rmeta">
                <span>{pb ? `${longDate(pb.date)} · ${n} ${n === 1 ? 'registrazione' : 'registrazioni'}` : 'Nessun tentativo registrato'}</span>
                <span className="pact">
                  <button className="btn small ghost" onClick={() => openLogger({ kind: 'attempt', exerciseId: ex.id })}>
                    Tentativo
                  </button>
                  <button className="x" aria-label={`Togli ${ex.name} dai record`} onClick={() =>
                      setInRecords.mutate(
                        { id: ex.id, patch: { inRecords: false } },
                        {
                          onSuccess: () =>
                            toast(`${ex.name} tolto dai record`, {
                              label: 'Annulla',
                              run: () => setInRecords.mutate({ id: ex.id, patch: { inRecords: true } }),
                            }),
                        },
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {others.length > 0 ? (
        <div className="addrow">
          <Select label="Aggiungi ai record" hideLabel value={addId} options={others.map((e) => ({ v: e.id, l: e.name }))} onChange={setAdding} />
          <button className="btn ghost" disabled={!addId} onClick={() => setInRecords.mutate({ id: addId, patch: { inRecords: true } })}>
            + Record
          </button>
        </div>
      ) : (
        active.length === 0 && (
          <p className="hint mt-12">
            Crea prima gli esercizi nella sezione <Link to="/esercizi">Esercizi</Link>.
          </p>
        )
      )}

      {history.length > 0 && (
        <div className="row mt-12">
          <button className="btn small ghost" onClick={() => setHistoryOpen(!historyOpen)}>
            {historyOpen ? 'Nascondi progressione' : `Progressione record (${history.length})`}
          </button>
        </div>
      )}
      {historyOpen && (
        <div className="mt-10">
          {history.map((e) => {
            const ex = active.find((x) => x.id === e.exerciseId)!;
            return (
              <div className="entry" key={e.id}>
                <div>
                  <b>{ex.name}</b>
                  <div className="pmeta">
                    {fmtSets(e.sets)} · {shortDate(e.date)} · <span className="pr">★ record</span>
                    {e.kind === 'attempt' && ' · tentativo'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Programma() {
  const { exercises, active, entries, done, plan } = useData();
  const openLogger = useLogger();
  const addItem = useAddPlanItem();
  const addCatalog = useAddCatalogToPlan();
  const catalog = useCatalog().data ?? [];
  const removeItem = useRemovePlanItem();
  const setScheme = useSetPlanScheme();
  // qui e non nel pannello: il pannello si chiude subito e i callback di mutate non arriverebbero
  const apply = useApplyPlanChanges();
  const toast = useToast();
  const locked = useTrainerLock();
  const today = todayStr();
  const thisMonday = mondayOf(today);
  const [monday, setMonday] = useState(thisMonday);
  const [day, setDay] = useState(weekdayIndex());
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  // anche esercizi archiviati: le righe del trainer restano finché lui non le toglie
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const visible = plan.filter((p) => byId.has(p.exerciseId));
  // il giorno scelto nella settimana mostrata: registrare da qui usa questa data, anche se futura
  const date = addDays(monday, day);
  const items = visible.filter((p) => p.date === date).sort(byDay);
  // registrato quel giorno senza essere in programma: fuori programma e tentativi
  const extra = offPlan(entries, visible, date);
  const prIds = recordEntryIds(done);
  const weekCount = visible.filter((p) => inWeek(p.date, monday)).length;
  // rispetto del piano della settimana mostrata (ticket 16): uno spostato nella settimana conta come fatto
  const statuses = weekStatuses(visible, entries, monday, today);
  const weekAdh = summarizeStatuses(statuses.values());
  // si aggiunge uno dei propri esercizi, oppure una voce del catalogo che diventa un esercizio al volo
  const avail = active.filter((e) => !items.some((p) => p.exerciseId === e.id));
  const activeCatalog = new Set(active.map((e) => e.catalogId));
  const fromCatalog = byCategory(catalog.filter((c) => !activeCatalog.has(c.id)));
  const addOptions = [
    ...avail.map((e) => ({ v: e.id, l: e.name, group: 'I tuoi esercizi', keywords: catalog.find((c) => c.id === e.catalogId)?.aliases })),
    ...fromCatalog.map((c) => ({ v: `cat:${c.id}`, l: c.name, group: `Catalogo · ${CATEGORY_LABEL[c.category]}`, keywords: c.aliases })),
  ];
  const addId = addOptions.some((o) => o.v === adding) ? adding : (addOptions[0]?.v ?? '');
  const addCatalogItem = addId.startsWith('cat:') ? catalog.find((c) => `cat:${c.id}` === addId) : undefined;
  // una voce del catalogo archiviata dall'utente si ripristina: lo storico resta suo
  const archivedTwin = addCatalogItem && exercises.find((e) => e.archivedAt && e.catalogId === addCatalogItem.id);
  const addMeasure = addCatalogItem?.measure ?? byId.get(addId)?.measure ?? 'reps';
  const future = date > today;
  const title = longDate(date);
  const dayName = title.split(' ')[0];

  const reset = () => {
    setEditing(null);
    setAddOpen(false);
  };
  const goWeek = (m: string, d = day) => {
    setMonday(m);
    setDay(d);
    reset();
    setCopyOpen(false);
  };

  return (
    <section className="card">
      <CardHead title="Programma" help="Scegli gli esercizi di ogni giorno con serie, ripetizioni (o secondi), peso e recupero. Prepara una settimana e copiala in quelle dopo. Sotto ogni giorno un pallino per esercizio: pieno se fatto.">
        {active.length > 0 && (
          <button className="btn small ghost" onClick={() => openLogger({ date })}>
            + Fuori programma
          </button>
        )}
      </CardHead>

      <WeekDays
        monday={monday}
        day={day}
        count={(dt) => dayCount(entries, visible, dt)}
        marks={(dt) => dayMarks(visible, entries, statuses, dt)}
        onChange={(m, d) => {
          if (m !== monday) goWeek(m, d);
          else {
            setDay(d);
            reset();
          }
        }}
      />
      <DotsLegend />
      {weekAdh.pct !== null && (
        <p className="adh">
          {monday === thisMonday ? 'Questa settimana' : 'Settimana'}: <b>{adherenceText(weekAdh)}</b> del programma
        </p>
      )}
      <h3 className="day-title">{title.charAt(0).toUpperCase() + title.slice(1)}</h3>

      <div className="plan">
        {items.length === 0 && !extra.length && <p className="empty">Nessun esercizio per {dayName}. Aggiungine uno qui sotto.</p>}
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const sc = p.scheme;
          // già registrato (o programmato) per questa data
          const saved = entries.find((e) => e.exerciseId === ex.id && e.kind === 'training' && e.date === date);
          const last = lastTraining(done, ex.id);
          const fromTrainer = locked(p);
          const st = statuses.get(p.id);
          return (
            <div className={`pitem stripe t-${sc.type}`} key={p.id}>
              <div>
                <div className="pname">{ex.name}</div>
                <SetBlocks total={sc.sets} done={saved && !future ? saved.sets.length : 0} type={sc.type} />
                <div className="pmeta">
                  {fmtScheme(sc)}{' '}
                  {!fromTrainer && editing !== p.id && (
                    <button className="link small" onClick={() => setEditing(p.id)} aria-label={`Modifica serie, ripetizioni, peso e recupero di ${ex.name} per ${dayName}`}>
                      Modifica
                    </button>
                  )}
                </div>
                {saved ? (
                  <>
                    <div className="pmeta">
                      {future ? 'Programmato' : 'Registrato'}: {fmtSets(saved.sets)}
                      {saved.difficulty && ` · ${DIFFICULTY_LABEL[saved.difficulty]}`}
                    </div>
                    {saved.note && <div className="pmeta">La tua nota: {saved.note}</div>}
                  </>
                ) : st?.kind === 'moved' ? (
                  <div className="pmeta">
                    {movedText(st.entry.date)} · {fmtSets(st.entry.sets)}
                  </div>
                ) : (
                  last && (
                    <div className="pmeta">
                      Ultimo: {fmtSets(last.sets)}
                      {last.difficulty && ` · ${DIFFICULTY_LABEL[last.difficulty]}`} · {shortDate(last.date)}
                    </div>
                  )
                )}
                {p.note && (
                  <p className="coach-note mt-8">
                    <b>{p.assignedBy ? 'Dal trainer:' : 'Nota:'}</b> {p.note}
                  </p>
                )}
                <div className="chips">
                  <TypeChip type={sc.type} />
                  {fromTrainer && <span className="chip mut">Dal trainer</span>}
                  {saved && prIds.has(saved.id) && <span className="chip pr">★ Record</span>}
                </div>
              </div>
              <div className="pact">
                <button
                  className={`btn small${saved ? ' ghost' : ''}`}
                  onClick={() => openLogger(saved ? { entry: saved } : { exerciseId: ex.id, date, scheme: sc, coachNote: p.note })}
                >
                  {saved ? 'Apri' : future ? 'Programma' : 'Registra'}
                </button>
                {!fromTrainer && (
                  <button
                    className="x"
                    aria-label={`Togli ${ex.name} da ${dayName}`}
                    onClick={() =>
                      removeItem.mutate(p.id, {
                        // annulla: la riga torna com'era, anche nella stessa posizione del giorno
                        onSuccess: () =>
                          toast(`${ex.name} tolto da ${dayName}`, {
                            label: 'Annulla',
                            run: () =>
                              apply.mutate({
                                remove: [],
                                add: [{ date: p.date, exerciseId: p.exerciseId, sortOrder: p.sortOrder, scheme: p.scheme, note: p.note }],
                              }),
                          }),
                      })
                    }
                  >
                    ×
                  </button>
                )}
              </div>
              {editing === p.id && (
                <SchemeForm
                  initial={sc}
                  measure={ex.measure}
                  hint={`Vale solo per ${title}.`}
                  saveLabel="Salva"
                  onSave={(scheme) => {
                    setScheme.mutate({ id: p.id, scheme });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </div>
          );
        })}
      </div>
      {extra.length > 0 && (
        <div className="extra">
          <h3 className="h-sub">{future ? 'Fuori programma' : 'Registrato fuori programma'}</h3>
          {extra.map((e) => (
            <EntryItem key={e.id} entry={e} name={byId.get(e.exerciseId)?.name ?? 'Esercizio rimosso'} record={prIds.has(e.id)} onOpen={() => openLogger({ entry: e })} />
          ))}
        </div>
      )}

      {addOptions.length > 0 && (
        <div className="addrow">
          <SearchSelect label="Aggiungi esercizio" hideLabel placeholder="Cerca esercizio…" value={addId} options={addOptions} onChange={setAdding} />
          {!addOpen && (
            <button className="btn" disabled={!addId} onClick={() => setAddOpen(true)}>
              Aggiungi
            </button>
          )}
          {addOpen && addId && (
            <SchemeForm
              key={addId}
              initial={suggestScheme(plan, done, archivedTwin?.id ?? addId, addCatalogItem?.defaultType ?? defaultType(catalog, byId.get(addId)), addMeasure)}
              measure={addMeasure}
              hint={`Per ${title}: poi puoi cambiarlo quando vuoi.`}
              saveLabel="Aggiungi"
              onSave={(scheme) => {
                if (addCatalogItem) addCatalog.mutate({ item: addCatalogItem, archived: archivedTwin, date, scheme });
                else addItem.mutate({ date, exerciseId: addId, scheme });
                setAddOpen(false);
              }}
              onCancel={() => setAddOpen(false)}
            />
          )}
        </div>
      )}

      {weekCount > 0 && !copyOpen && (
        <div className="row mt-16">
          <button className="btn small ghost" onClick={() => setCopyOpen(true)}>
            Copia questa settimana…
          </button>
        </div>
      )}
      {copyOpen && (
        <CopyWeek
          plan={visible}
          from={monday}
          locked={locked}
          onCopy={(changes, n) => {
            apply.mutate(changes, { onSuccess: () => toast(`Settimana copiata in ${n} ${n === 1 ? 'settimana' : 'settimane'}`) });
            setCopyOpen(false);
          }}
          onCancel={() => setCopyOpen(false)}
        />
      )}
    </section>
  );
}

/** Copia gli esercizi della settimana `from` (con il loro schema) sulle settimane scelte. */
function CopyWeek({
  plan,
  from,
  locked,
  onCopy,
  onCancel,
}: {
  plan: PlanItem[];
  from: string;
  /** righe del trainer: restano dove sono */
  locked: (p: PlanItem) => boolean;
  /** `weeks`: quante settimane sono state scelte */
  onCopy: (changes: PlanChanges, weeks: number) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [shown, setShown] = useState(8);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<CopyMode>('merge');

  const weeks = Array.from({ length: shown }, (_, i) => addDays(from, 7 * (i + 1)));
  const count = (m: string) => weekItems(plan, m).length;
  const anyFull = [...picked].some((m) => count(m) > 0);
  const toggle = (m: string) => {
    const next = new Set(picked);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setPicked(next);
  };

  const copy = () => {
    if (!picked.size) return toast('Scegli almeno una settimana');
    const changes = copyWeek(plan, from, [...picked], anyFull ? mode : 'merge', locked);
    if (!changes.add.length && !changes.remove.length) return toast('Le settimane scelte hanno già tutti questi esercizi');
    onCopy(changes, picked.size);
  };

  return (
    <div className="form mt-16">
      <div className="card-h">
        <h3 className="copy-title">Copia {weekLabel(from)}</h3>
        <button className="link small" onClick={() => setPicked(new Set(weeks.slice(0, 4)))}>
          Prossime 4
        </button>
      </div>
      <p className="hint">Esercizi, serie, ripetizioni, peso e recupero vanno negli stessi giorni delle settimane scelte. Poi li ritocchi giorno per giorno.</p>
      <div className="weeks">
        {weeks.map((m) => {
          const n = count(m);
          return (
            <label className="check-row" key={m}>
              <input type="checkbox" checked={picked.has(m)} onChange={() => toggle(m)} />
              <span>{weekLabel(m)}</span>
              <span className="hint">{n ? `${n} ${n === 1 ? 'esercizio' : 'esercizi'}` : 'vuota'}</span>
            </label>
          );
        })}
      </div>
      <div className="row">
        <button className="link small" onClick={() => setShown(shown + 8)}>
          Mostra altre settimane
        </button>
      </div>
      {anyFull && (
        <div className="fld">
          <span>Nelle settimane che hanno già esercizi</span>
          <Seg
            label="Nelle settimane che hanno già esercizi"
            value={mode}
            options={[
              { v: 'merge', l: 'Aggiungi i mancanti' },
              { v: 'replace', l: 'Sostituisci tutto' },
            ]}
            onChange={setMode}
          />
          <span className="fld-hint">
            {mode === 'merge' ? 'Quello che c’è già resta com’è, con le sue serie.' : 'Gli esercizi già programmati in quelle settimane vengono tolti, tranne quelli del tuo trainer.'}
          </span>
        </div>
      )}
      <div className="row">
        <button className="btn small" onClick={copy} disabled={!picked.size}>
          {picked.size ? `Copia in ${picked.size} ${picked.size === 1 ? 'settimana' : 'settimane'}` : 'Copia'}
        </button>
        <button className="btn small ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  );
}
