import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AthleteScope, useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { useExercisePicker } from '../../components/ExercisePicker';
import { EntryItem } from '../../components/EntryItem';
import { SchemeForm } from '../../components/SchemeForm';
import { WeekDays } from '../../components/WeekDays';
import { ConfirmButton, Seg, TypeChip } from '../../components/ui';
import { useCatalog, useCoachAddPlanItem, useData, useEndLink, useLinks, useRemovePlanItem, useSetPlanNote, useSetPlanScheme } from '../../data/hooks';
import { DIFFICULTY_LABEL, type ExerciseRef, type Measure } from '../../data/types';
import { addDays, longDate, mondayOf, shortDate, todayStr, weekdayIndex } from '../../lib/dates';
import { fmtScheme, fmtSets } from '../../lib/format';
import { blankScheme, recordEntryIds, suggestType } from '../../lib/stats';
import { defaultType } from '../../lib/catalog';
import { byDay, dayCount, offPlan } from '../../lib/plan';
import { GraficiView } from '../grafici/GraficiView';
import { SchedeCard } from './SchedeView';

const nameOf = (n: string | null) => n ?? 'Atleta senza nome';

/** Gli atleti che il trainer segue. */
export function AtletiView() {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  const end = useEndLink('Atleta scollegato');
  const athletes = links.data?.filter((l) => l.trainerId === myId) ?? [];

  return (
    <>
      <section className="card">
        <h2>Atleti</h2>
        <p className="sub">Gli atleti che segui: programmi i loro giorni, vedi storico, note e grafici. I loro dati restano loro.</p>
        {links.isLoading ? (
          <p className="empty">Caricamento…</p>
        ) : !athletes.length ? (
          <p className="empty">
            Nessun atleta. Manda il tuo link d'invito da <Link to="/account">Account</Link>.
          </p>
        ) : (
          athletes.map((l) => (
            <div className="entry" key={l.id}>
              <div>
                <b>{nameOf(l.athleteName)}</b>
                <div className="pmeta">Collegato dal {shortDate(l.createdAt.slice(0, 10))}</div>
              </div>
              <div className="pact col">
                <Link className="btn small" to={`/atleti/${l.athleteId}`}>
                  Apri
                </Link>
                <ConfirmButton confirmLabel="Scollegare?" onConfirm={() => end.mutate(l.id)}>
                  Scollega
                </ConfirmButton>
              </div>
            </div>
          ))
        )}
      </section>
      <SchedeCard />
    </>
  );
}

type Tab = 'programma' | 'grafici';

/** Un atleta visto dal suo trainer: le viste dentro leggono i suoi dati, senza poterli modificare. */
export function AtletaView() {
  const { athleteId = '' } = useParams();
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  const [tab, setTab] = useState<Tab>('programma');
  const link = links.data?.find((l) => l.trainerId === myId && l.athleteId === athleteId);

  if (links.isLoading) return <p className="empty">Caricamento…</p>;
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
      <section className="card">
        <div className="card-h">
          <h2>{nameOf(link.athleteName)}</h2>
          <Link className="link small" to="/atleti">
            ‹ Atleti
          </Link>
        </div>
        <p className="sub">Programmi i suoi giorni e vedi cosa ha fatto, anche fuori programma; registrazioni e grafici sono in sola lettura.</p>
        <div style={{ marginTop: 14 }}>
          <Seg
            label="Sezione"
            value={tab}
            options={[
              { v: 'programma', l: 'Programma' },
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
  if (isLoading) return <p className="empty">Caricamento…</p>;
  if (error) return <div className="banner">Non riesco a leggere i dati dell'atleta. Riprova.</div>;
  if (tab === 'grafici') return <GraficiView />;
  return <AthletePlan />;
}

/**
 * Programma dell'atleta settimana per settimana, con quello che ha già registrato.
 * Il trainer aggiunge esercizi ai giorni e ritocca le righe sue; quelle dell'atleta le vede soltanto.
 */
function AthletePlan() {
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

  return (
    <section className="card">
      <h2>Programma</h2>
      <WeekDays monday={monday} day={day} count={(dt) => dayCount(entries, visible, dt)} onChange={go} />
      <h3 style={{ fontSize: 22, marginTop: 18 }}>{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
      <div className="plan">
        {items.length === 0 && !extra.length && <p className="empty">Niente in programma.</p>}
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const sc = p.scheme;
          const mine = p.assignedBy === myId;
          const saved = entries.find((e) => e.exerciseId === ex.id && e.kind === 'training' && e.date === date);
          return (
            <div className="pitem" key={p.id}>
              <div>
                <div className="pname">{ex.name}</div>
                <div className="pmeta">
                  Previsto: {fmtScheme(sc)}{' '}
                  {mine && editing !== p.id && (
                    <button className="link small" onClick={() => setEditing(p.id)} aria-label={`Modifica ${ex.name}`}>
                      Modifica
                    </button>
                  )}
                </div>
                <div className="pmeta">
                  {saved ? `${saved.date > today ? 'Programmato' : 'Fatto'}: ${fmtSets(saved.sets)}` : date < today ? 'Non registrato' : 'Da fare'}
                  {saved?.difficulty && ` · ${DIFFICULTY_LABEL[saved.difficulty]}`}
                </div>
                {saved?.note && <div className="pmeta">Nota dell'atleta: {saved.note}</div>}
                {p.note && (
                  <p className="coach-note" style={{ marginTop: 8 }}>
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
                  <button className="x" onClick={() => removeItem.mutate(p.id)} aria-label={`Togli ${ex.name}`}>
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
          <h4>Fatto fuori programma</h4>
          {extra.map((e) => (
            <EntryItem key={e.id} entry={e} name={byId.get(e.exerciseId)?.name ?? 'Esercizio rimosso'} record={prIds.has(e.id)} noteLabel="Nota dell'atleta" />
          ))}
        </div>
      )}
      <div className="form" style={{ marginTop: 12 }}>
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
