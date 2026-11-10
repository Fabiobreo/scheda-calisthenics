import { ExIcon } from '../../components/ExIcon';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AthleteScope, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { Avatar } from '../../components/Avatar';
import { useExercisePicker } from '../../components/ExercisePicker';
import { EntryItem } from '../../components/EntryItem';
import { SchemeForm } from '../../components/SchemeForm';
import { DotsLegend, WeekDays } from '../../components/WeekDays';
import { CardHead, ConfirmButton, EmptyPeople, EmptyState, NestedView, PageTitle, Seg, SetBlocks, Skeleton, TypeChip, useWide } from '../../components/ui';
import {
  useCatalog,
  useCoachAddPlanItem,
  useData,
  useEndLink,
  useLevel,
  useLevelRecords,
  useLinks,
  useProfile,
  useRemovePlanItem,
  useSetPlanNote,
  useSetPlanScheme,
} from '../../data/hooks';
import { DIFFICULTY_LABEL, type ExerciseRef, type Measure } from '../../data/types';
import { addDays, longDate, mondayOf, shortDate, todayStr, weekdayIndex } from '../../lib/dates';
import { fmtScheme, fmtSets } from '../../lib/format';
import { blankScheme, recordEntryIds, suggestType } from '../../lib/stats';
import { defaultType } from '../../lib/catalog';
import { byDay, dayCount, offPlan } from '../../lib/plan';
import { adherence, adherenceText, athleteAlerts, dayMarks, lastTrainingDate, movedText, summarizeStatuses, weekStatuses, type Alert } from '../../lib/adherence';
import { subRule } from '../../lib/levels';
import { GraficiView } from '../grafici/GraficiView';
import { HomeView } from '../home/HomeView';
import { SchedeCard } from './SchedeView';

const nameOf = (n: string | null) => n ?? 'Atleta senza nome';

/** Gli atleti che il trainer segue. */
/** Atleti seguiti dal trainer collegato (solo i collegamenti attivi in cui è trainer). */
function useMyAthletes() {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  return { links, athletes: links.data?.filter((l) => l.trainerId === myId) ?? [] };
}

/**
 * Pagina Atleti. Sul telefono: avvisi, elenco, schede in fila. Su schermo largo (audit A06): elenco e schede a
 * sinistra, "Da guardare" a destra.
 */
export function AtletiView() {
  const wide = useWide();
  return (
    <>
      <PageTitle title="Atleti" />
      {wide ? (
        <div className="cols">
          <div className="col">
            <AthletesCard />
            <SchedeCard />
          </div>
          <div className="col">
            <AlertsCard />
          </div>
        </div>
      ) : (
        <>
          <AlertsCard />
          <AthletesCard />
          <SchedeCard />
        </>
      )}
    </>
  );
}

/**
 * Pagina di un atleta. Su schermo largo l'elenco degli atleti resta a sinistra (si passa dall'uno all'altro senza
 * tornare indietro) e l'atleta occupa la colonna larga; sul telefono c'è solo l'atleta.
 */
export function AtletaPage() {
  const { athleteId = '' } = useParams();
  const wide = useWide();
  if (!wide) return <AtletaView />;
  return (
    <div className="cols master">
      <div className="col">
        <NestedView>
          <AthletesCard selected={athleteId} />
        </NestedView>
      </div>
      <div className="col">
        <AtletaView />
      </div>
    </div>
  );
}

function AlertsCard() {
  const { athletes } = useMyAthletes();
  return (
    <>
      {athletes.length > 0 && (
        <section className="card">
          <h2>Da guardare</h2>
          <p className="sub">Chi è fermo, chi è indietro col programma, a chi manca la settimana prossima e chi ha fatto un record.</p>
          <ul className="alerts">
            {athletes.map((l) => (
              <AthleteScope key={l.id} athleteId={l.athleteId}>
                <AthleteAlerts athleteId={l.athleteId} name={nameOf(l.athleteName)} />
              </AthleteScope>
            ))}
          </ul>
          <p className="alerts-none">Tutto in ordine: nessun avviso.</p>
        </section>
      )}
    </>
  );
}

function AthletesCard({ selected }: { selected?: string }) {
  const { links, athletes } = useMyAthletes();
  const end = useEndLink('Atleta scollegato');
  return (
    <section className="card">
      <CardHead title="Atleti" help="Gli atleti che segui: programmi i loro giorni, vedi storico, note, grafici e livello. I loro dati restano loro." />
      {links.isLoading ? (
        <Skeleton inline />
      ) : !athletes.length ? (
        <EmptyState
          art={<EmptyPeople />}
          title="Qui vedrai i tuoi atleti"
          actions={
            <Link className="btn" to="/account">
              Invita un atleta
            </Link>
          }
        >
          Manda il tuo link d'invito: quando l'atleta accetta, compare qui con il suo programma e i suoi progressi.
        </EmptyState>
      ) : (
        athletes.map((l) => (
          <div className={`entry${l.athleteId === selected ? ' on' : ''}`} key={l.id}>
            <AthleteScope athleteId={l.athleteId}>
              <AthleteHead name={l.athleteName} since={l.createdAt.slice(0, 10)} />
            </AthleteScope>
            {/* con un atleta aperto (schermo largo) l'elenco serve a passare dall'uno all'altro: "Scollega" resta nella pagina Atleti */}
            {l.athleteId !== selected && (
              <div className="pact col">
                <Link className={`btn small${selected ? ' ghost' : ''}`} to={`/atleti/${l.athleteId}`}>
                  Apri
                </Link>
                {!selected && (
                  <ConfirmButton confirmLabel="Scollegare?" onConfirm={() => end.mutate(l.id)}>
                    Scollega
                  </ConfirmButton>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

/**
 * Atleta in elenco: avatar, nome, livello e data del collegamento. Va dentro il suo `AthleteScope`: il livello usa la
 * stessa cache della sua scheda Livello.
 */
function AthleteHead({ name, since }: { name: string | null; since: string }) {
  const { summary, records, isLoading, error } = useLevel();
  const data = useData();
  // dentro lo scope dell'atleta: il suo profilo, per la figura dell'avatar
  const body = useProfile().data?.avatarBody;
  const elite = summary.zone === 'elite';
  const today = todayStr();
  const adh = adherence(data.plan, data.entries, today);
  const last = lastTrainingDate(data.entries, today);
  return (
    <div className="ath">
      <Avatar name={name} avatar={summary.avatar} elite={elite} small body={body} />
      <div>
        <b>{nameOf(name)}</b>
        <div className="ath-level">
          {isLoading ? (
            'Livello –'
          ) : error ? (
            'Livello non disponibile'
          ) : !records.length ? (
            'Nessun record'
          ) : (
            <>
              Livello <b className={elite ? 'elite' : undefined}>{summary.level}</b>
              {elite && <span className="tag-elite">ELITE</span>}
            </>
          )}
        </div>
        {!data.isLoading && !data.error && (
          <div className="pmeta">
            Piano, 4 sett.: {adherenceText(adh)} · {last ? `ultimo allenamento ${shortDate(last)}` : 'nessun allenamento'}
          </div>
        )}
        <div className="pmeta">Collegato dal {shortDate(since)}</div>
      </div>
    </div>
  );
}

const ALERT_ICON: Record<Alert['kind'], string> = { inactive: '!', 'low-week': '↓', 'no-plan': '…', record: '★' };

/**
 * Avvisi su un atleta per il riquadro "Da guardare" (dentro il suo `AthleteScope`). Mentre carica lascia un elemento
 * nascosto, così il riquadro non dice "Tutto in ordine" prima del tempo.
 */
function AthleteAlerts({ athleteId, name }: { athleteId: string; name: string }) {
  const data = useData();
  const lr = useLevelRecords();
  if (data.isLoading || lr.isLoading) return <li hidden />;
  if (data.error || lr.error)
    return (
      <li className="alert">
        <Link to={`/atleti/${athleteId}`}>{name}</Link>
        <span className="alert-t">Non riesco a leggere i suoi dati.</span>
      </li>
    );
  const byId = new Map(data.exercises.map((e) => [e.id, e.name]));
  const alerts = athleteAlerts({
    plan: data.plan,
    entries: data.entries,
    levelRecords: lr.data ?? [],
    today: todayStr(),
    nameOf: (id) => byId.get(id),
    subName: (id) => subRule(id)?.name,
  });
  if (!alerts.length) return null;
  return (
    <li className="alert">
      <Link to={`/atleti/${athleteId}`}>{name}</Link>
      {alerts.map((a) => (
        <span key={a.kind} className={`alert-t ${a.kind}`}>
          <i aria-hidden="true">{ALERT_ICON[a.kind]}</i> {a.text}
        </span>
      ))}
    </li>
  );
}

type Tab = 'programma' | 'livello' | 'grafici';

/** Un atleta visto dal suo trainer: le viste dentro leggono i suoi dati, senza poterli modificare. */
export function AtletaView() {
  const { athleteId = '' } = useParams();
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  const [tab, setTab] = useState<Tab>('programma');
  const link = links.data?.find((l) => l.trainerId === myId && l.athleteId === athleteId);

  if (links.isLoading) return <Skeleton />;
  if (!link)
    return (
      <section className="card">
        <h2>Atleta</h2>
        <p className="empty">
          Non segui questo atleta, o si è scollegato. Torna ad <Link to="/atleti">Atleti</Link>.
        </p>
      </section>
    );

  return (
    <>
      <PageTitle title={link.athleteName || 'Atleta'} />
      <section className="card">
        <div className="card-h">
          <h2 className="big">{nameOf(link.athleteName)}</h2>
          {/* su schermo largo l'elenco degli atleti è già a sinistra */}
          <Link className="link small only-narrow" to="/atleti">
            ‹ Atleti
          </Link>
        </div>
        <p className="sub">Programmi i suoi giorni e vedi cosa ha fatto, anche fuori programma; registrazioni, grafici e livello sono in sola lettura.</p>
        <div className="mt-14">
          <Seg
            label="Sezione"
            value={tab}
            options={[
              { v: 'programma', l: 'Programma' },
              { v: 'livello', l: 'Livello' },
              { v: 'grafici', l: 'Grafici' },
            ]}
            onChange={setTab}
          />
        </div>
      </section>
      <AthleteScope athleteId={athleteId}>
        <AthleteData tab={tab} />
      </AthleteScope>
    </>
  );
}

function AthleteData({ tab }: { tab: Tab }) {
  const { isLoading, error } = useData();
  // il livello ha i suoi dati (record e peso): non aspetta registrazioni e programma
  if (tab === 'livello')
    return (
      <NestedView>
        <HomeView />
      </NestedView>
    );
  if (isLoading) return <Skeleton />;
  if (error) return <div className="banner">Non riesco a leggere i dati dell'atleta. Riprova.</div>;
  if (tab === 'grafici')
    return (
      <NestedView>
        <GraficiView />
      </NestedView>
    );
  return <AthletePlan />;
}

/**
 * Programma dell'atleta settimana per settimana, con quello che ha già registrato.
 * Il trainer aggiunge esercizi ai giorni e ritocca le righe sue; quelle dell'atleta le vede soltanto.
 */
function AthletePlan() {
  const wide = useWide();
  const { exercises, entries, done, plan } = useData();
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const catalog = useCatalog().data ?? [];
  const addItem = useCoachAddPlanItem();
  const setScheme = useSetPlanScheme();
  const setNote = useSetPlanNote();
  const removeItem = useRemovePlanItem();
  const toast = useToast();
  const today = todayStr();
  const thisMonday = mondayOf(today);
  const [monday, setMonday] = useState(thisMonday);
  const [day, setDay] = useState(weekdayIndex());
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  // anche quelli di esercizi che l'atleta ha archiviato: il trainer deve poterli vedere e togliere
  const visible = plan.filter((p) => byId.has(p.exerciseId));
  const date = addDays(monday, day);
  const items = visible.filter((p) => p.date === date).sort(byDay);
  // quello che l'atleta ha registrato quel giorno fuori dal programma, tentativi compresi
  const extra = offPlan(entries, visible, date);
  const prIds = recordEntryIds(done);
  const title = longDate(date);
  // rispetto del piano della settimana mostrata (ticket 16)
  const statuses = weekStatuses(visible, entries, monday, today);
  const weekAdh = summarizeStatuses(statuses.values());
  // gli esercizi già nel giorno non si propongono di nuovo
  const inDay = items.map((p) => byId.get(p.exerciseId)).filter((e) => e !== undefined);
  const picker = useExercisePicker(catalog, (r) =>
    inDay.some((e) => (r.catalogId ? e.catalogId === r.catalogId : !e.catalogId && e.name.toLowerCase() === r.customName?.toLowerCase())),
  );

  // tipo da proporre: come l'atleta fa quell'esercizio in quel periodo, altrimenti il predefinito del catalogo
  const exerciseFor = (ref: ExerciseRef | null) =>
    ref ? exercises.find((e) => (ref.catalogId ? e.catalogId === ref.catalogId : !e.catalogId && e.name.toLowerCase() === ref.customName?.toLowerCase())) : undefined;
  const typeFor = (ref: ExerciseRef | null) => {
    const ex = exerciseFor(ref);
    const fallback = defaultType(catalog, ref ?? undefined);
    return ex ? suggestType(plan, done, ex.id, date, fallback) : fallback;
  };
  // misura: quella dell'esercizio che l'atleta ha già, o della voce del catalogo; un nome nuovo la sceglie il trainer
  const addRef = adding ? picker.ref() : null;
  const addEx = exerciseFor(addRef);
  const addMeasure: Measure = addEx?.measure ?? catalog.find((c) => c.id === addRef?.catalogId)?.measure ?? 'reps';
  const addMeasureFree = !!addRef && !addRef.catalogId && !addEx;

  const go = (m: string, d: number) => {
    setMonday(m);
    setDay(d);
    setEditing(null);
    setAdding(false);
  };

  // su schermo largo la settimana intera, giorno per giorno, con lo stato di ogni esercizio (audit A06)
  const board = (dt: string) => {
    const dayItems = visible.filter((p) => p.date === dt).sort(byDay);
    if (!dayItems.length) return <span className="board-empty">Riposo</span>;
    return (
      // dentro un pulsante: solo span (niente liste)
      <span className="board-list">
        {dayItems.map((p) => {
          const st = statuses.get(p.id)?.kind ?? 'pending';
          const mark = st === 'done' ? '✓' : st === 'moved' ? '↔' : st === 'missed' ? '✕' : '·';
          const label = st === 'done' ? 'fatto' : st === 'moved' ? 'spostato' : st === 'missed' ? 'non fatto' : 'da fare';
          return (
            <span key={p.id} className={`b-item ${st}`}>
              <i aria-hidden="true">{mark}</i>
              <span>
                {byId.get(p.exerciseId)!.name}
                <span className="sr-only">, {label}</span>
              </span>
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <section className="card">
      <h2>Programma</h2>
      <WeekDays monday={monday} day={day} count={(dt) => dayCount(entries, visible, dt)} onChange={go} detail={wide ? board : undefined} marks={(dt) => dayMarks(visible, entries, statuses, dt)} />
      {!wide && <DotsLegend />}
      {weekAdh.pct !== null && (
        <p className="adh">
          {monday === thisMonday ? 'Questa settimana' : 'Settimana'}: <b>{adherenceText(weekAdh)}</b> del programma
        </p>
      )}
      <h3 className="day-title">{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
      <div className="plan">
        {items.length === 0 && !extra.length && <p className="empty">Niente in programma.</p>}
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const sc = p.scheme;
          const mine = p.assignedBy === myId;
          const saved = entries.find((e) => e.exerciseId === ex.id && e.kind === 'training' && e.date === date);
          const st = statuses.get(p.id);
          return (
            <div className={`pitem stripe t-${sc.type}`} key={p.id}>
              <div>
                <div className="pname"><ExIcon catalogId={ex.catalogId} />{ex.name}</div>
                <SetBlocks total={sc.sets} done={saved && date <= todayStr() ? saved.sets.length : 0} type={sc.type} />
                <div className="pmeta">
                  Previsto: {fmtScheme(sc)}{' '}
                  {mine && editing !== p.id && (
                    <button className="link small" onClick={() => setEditing(p.id)} aria-label={`Modifica ${ex.name}`}>
                      Modifica
                    </button>
                  )}
                </div>
                <div className="pmeta">
                  {saved
                    ? `${saved.date > today ? 'Programmato' : 'Fatto'}: ${fmtSets(saved.sets)}`
                    : st?.kind === 'moved'
                      ? `${movedText(st.entry.date)} · ${fmtSets(st.entry.sets)}`
                      : date < today
                        ? 'Non registrato'
                        : 'Da fare'}
                  {saved?.difficulty && ` · ${DIFFICULTY_LABEL[saved.difficulty]}`}
                </div>
                {saved?.note && <div className="pmeta">Nota dell'atleta: {saved.note}</div>}
                {p.note && (
                  <p className="coach-note mt-8">
                    <b>{mine ? 'La tua nota:' : p.assignedBy ? 'Nota di un altro trainer:' : "Nota dell'atleta:"}</b> {p.note}
                  </p>
                )}
                <div className="chips">
                  <TypeChip type={sc.type} />
                  {!mine && <span className="chip mut">{p.assignedBy ? 'Da un altro trainer' : "Dell'atleta"}</span>}
                  {saved && prIds.has(saved.id) && <span className="chip pr">★ Record</span>}
                </div>
              </div>
              {mine && (
                <div className="pact">
                  <button
                    className="x"
                    aria-label={`Togli ${ex.name}`}
                    onClick={() =>
                      removeItem.mutate(p.id, {
                        // annulla: il trainer riscrive la riga con la sua funzione (in fondo al giorno)
                        onSuccess: () =>
                          toast(`${ex.name} tolto`, {
                            label: 'Annulla',
                            run: () =>
                              addItem.mutate({
                                date: p.date,
                                ref: ex.catalogId ? { catalogId: ex.catalogId, customName: null } : { catalogId: null, customName: ex.name },
                                scheme: p.scheme,
                                note: p.note,
                              }),
                          }),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              )}
              {editing === p.id && (
                <SchemeForm
                  initial={sc}
                  measure={ex.measure}
                  note={p.note}
                  hint={`Solo per ${title}.`}
                  saveLabel="Salva"
                  onSave={(scheme, note) => {
                    setScheme.mutate({ id: p.id, scheme });
                    if (note !== p.note) setNote.mutate({ id: p.id, note });
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
          <h3 className="h-sub">Fatto fuori programma</h3>
          {extra.map((e) => (
            <EntryItem key={e.id} entry={e} name={byId.get(e.exerciseId)?.name ?? 'Esercizio rimosso'} record={prIds.has(e.id)} noteLabel="Nota dell'atleta" />
          ))}
        </div>
      )}
      <div className="form mt-12">
        {picker.view}
        {!adding ? (
          <div className="row">
            <button className="btn" onClick={() => (picker.ref() ? setAdding(true) : toast("Scrivi il nome dell'esercizio"))}>
              Aggiungi al giorno
            </button>
          </div>
        ) : (
          <SchemeForm
            key={picker.key}
            initial={blankScheme(typeFor(addRef), addMeasure)}
            measure={addMeasure}
            measureEditable={addMeasureFree}
            note={null}
            hint={`Per ${title}.`}
            saveLabel="Aggiungi"
            onSave={(scheme, note) => {
              const ref = picker.ref();
              if (!ref) return toast("Scrivi il nome dell'esercizio");
              addItem.mutate({ date, ref, scheme, note });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </section>
  );
}
