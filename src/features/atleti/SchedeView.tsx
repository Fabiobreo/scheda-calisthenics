import { CategoryRow, ExIcon } from '../../components/ExIcon';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { refName, useExercisePicker } from '../../components/ExercisePicker';
import { SchemeForm } from '../../components/SchemeForm';
import { DuplicateDay, MultiAdd } from '../../components/QuickAdd';
import { CardHead, Cols, ConfirmButton, EmptyPeople, EmptyState, EmptyWeeks, Field, PageTitle, Select, Skeleton, TypeChip, useWide } from '../../components/ui';
import {
  useAddProgramItems,
  useAssignProgram,
  useCatalog,
  useCreateProgram,
  useDeleteProgram,
  useLinks,
  useProgramItems,
  usePrograms,
  useRemoveProgramItems,
  useReplaceProgramItems,
  useUpdateProgram,
  useUpdateProgramItem,
} from '../../data/hooks';
import { type ExerciseRef, type Measure, type ProgramItem, type ProgramItemInput } from '../../data/types';
import { DAY_LONG, DAY_SHORT, addDays, mondayOf, shortDate, todayStr, weekLabel } from '../../lib/dates';
import { fmtScheme, isInt, plural } from '../../lib/format';
import { defaultType } from '../../lib/catalog';
import { addToProgramDay, duplicateProgramDay, typeScheme } from '../../lib/editor';

/** Le schede modello del trainer, nella pagina Atleti. */
export function SchedeCard() {
  const programs = usePrograms();
  const create = useCreateProgram();
  const navigate = useNavigate();
  const make = () => create.mutate({ name: 'Nuova scheda', weeks: 4 }, { onSuccess: (p) => navigate(`/schede/${p.id}`) });

  return (
    <section className="card">
      <CardHead title="Schede" help="Prepari una scheda una volta, settimana per settimana, e la assegni a uno o più atleti da un lunedì.">
        {!!programs.data?.length && (
          <button className="btn small" disabled={create.isPending} onClick={make}>
            + Nuova
          </button>
        )}
      </CardHead>
      {programs.isLoading ? (
        <Skeleton inline />
      ) : !programs.data?.length ? (
        <EmptyState
          small
          art={<EmptyWeeks />}
          title="Nessuna scheda"
          actions={
            <button className="btn" disabled={create.isPending} onClick={make}>
              Crea la prima scheda
            </button>
          }
        >
          Preparala una volta, settimana per settimana, e assegnala a più atleti.
        </EmptyState>
      ) : (
        programs.data.map((p) => (
          <div className="entry" key={p.id}>
            <div>
              <b>{p.name}</b>
              <div className="pmeta">
                {plural(p.weeks, 'settimana', 'settimane')} · modificata il {shortDate(p.updatedAt.slice(0, 10))}
              </div>
            </div>
            <div className="pact col">
              <Link className="btn small ghost" to={`/schede/${p.id}`}>
                Apri
              </Link>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

/** Editor di una scheda modello e sua assegnazione. */
export function SchedaModelloView() {
  const { programId = '' } = useParams();
  const programs = usePrograms();
  const program = programs.data?.find((p) => p.id === programId);

  if (programs.isLoading) return <Skeleton />;
  if (!program)
    return (
      <section className="card">
        <EmptyState
          art={<EmptyWeeks />}
          title="Scheda non trovata"
          actions={
            <Link className="btn" to="/atleti">
              Torna ad Atleti
            </Link>
          }
        >
          Forse è stata eliminata.
        </EmptyState>
      </section>
    );
  return <Editor key={program.id} id={program.id} name={program.name} weeks={program.weeks} />;
}

function Editor({ id, name, weeks }: { id: string; name: string; weeks: number }) {
  const wide = useWide();
  const items = useProgramItems(id).data ?? [];
  const catalog = useCatalog().data ?? [];
  const update = useUpdateProgram('Scheda salvata');
  const del = useDeleteProgram();
  const addItems = useAddProgramItems();
  const editItem = useUpdateProgramItem();
  const removeItems = useRemoveProgramItems();
  const replaceItems = useReplaceProgramItems('Settimana copiata nelle successive');
  const toast = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState(name);
  const [weeksText, setWeeksText] = useState(String(weeks));
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  // pannello aperto sotto il giorno: aggiunta singola, multipla (ticket 26) o duplica giorno
  const [panel, setPanel] = useState<'single' | 'multi' | 'dup' | null>(null);
  const adding = panel === 'single';
  const setAdding = (on: boolean) => setPanel(on ? 'single' : null);

  const shownWeek = Math.min(week, weeks);
  const dayItems = items.filter((i) => i.week === shownWeek && i.weekday === day).sort((a, b) => a.sortOrder - b.sortOrder);
  const weekItems = items.filter((i) => i.week === shownWeek);
  const sameRef = (i: ProgramItem, r: { catalogId: string | null; customName: string | null }) =>
    i.catalogId === r.catalogId && (i.customName ?? '').toLowerCase() === (r.customName ?? '').toLowerCase();
  const picker = useExercisePicker(catalog, (r) => dayItems.some((i) => sameRef(i, r)));
  // misura: per una voce del catalogo la sua; un nome personalizzato la sceglie il trainer, partendo da come l'ha
  // già usato in questa scheda
  const catalogMeasure = (r: { catalogId: string | null } | null) => (r?.catalogId ? catalog.find((c) => c.id === r.catalogId)?.measure : undefined);
  const customMeasure = (r: ExerciseRef | null): Measure => {
    const twin = r && !r.catalogId ? items.find((i) => sameRef(i, r)) : undefined;
    return twin && twin.scheme.seconds > 0 ? 'time' : 'reps';
  };
  const addRef = adding ? picker.ref() : null;

  const saveHead = () => {
    const n = Number(weeksText);
    const t = title.trim();
    if (!t || t.length > 80) return toast('Il nome va da 1 a 80 caratteri');
    if (!isInt(n, 1, 52)) return toast('Da 1 a 52 settimane');
    // le settimane tolte portano via i loro esercizi
    const gone = items.filter((i) => i.week > n).map((i) => i.id);
    if (gone.length && !window.confirm(`Togliendo settimane elimini anche ${plural(gone.length, 'esercizio', 'esercizi')}. Continuare?`)) return;
    if (gone.length) removeItems.mutate(gone);
    update.mutate({ id, patch: { name: t, weeks: n } });
  };

  const copyToNext = () => {
    const later = items.filter((i) => i.week > shownWeek).map((i) => i.id);
    const copies: ProgramItemInput[] = [];
    for (let w = shownWeek + 1; w <= weeks; w++)
      for (const i of weekItems)
        copies.push({ programId: i.programId, week: w, weekday: i.weekday, catalogId: i.catalogId, customName: i.customName, sortOrder: i.sortOrder, scheme: i.scheme, note: i.note });
    // un'unica operazione: prima le copie, poi via le righe vecchie (se le copie falliscono non si perde niente)
    replaceItems.mutate({ remove: later, add: copies });
  };

  const headDirty = title.trim() !== name || weeksText !== String(weeks);

  const headCard = (
    <section className="card">
      <div className="card-h">
        <h2>Scheda</h2>
        <Link className="link small" to="/atleti">
          ‹ Atleti
        </Link>
      </div>
      <div className="form mt-14">
        <Field label="Nome" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid2">
          <Field label="Settimane" inputMode="numeric" value={weeksText} onChange={(e) => setWeeksText(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn small" disabled={!headDirty} onClick={saveHead}>
            Salva
          </button>
          <ConfirmButton
            confirmLabel="Eliminare la scheda?"
            onConfirm={() => del.mutate(id, { onSuccess: () => navigate('/atleti') })}
          >
            Elimina scheda
          </ConfirmButton>
        </div>
        <p className="hint">Eliminare o cambiare la scheda non tocca i calendari degli atleti a cui l'hai già assegnata.</p>
      </div>
    </section>
  );
  const assignCard = <AssignCard programId={id} programName={name} weeks={weeks} empty={!items.length} />;
  const weekPart = (
    <>
      <h2>Giorni</h2>
      <div className="grid2 mt-14">
        <Select
          label="Settimana"
          value={String(shownWeek)}
          options={Array.from({ length: weeks }, (_, i) => {
            const n = items.filter((x) => x.week === i + 1).length;
            return { v: String(i + 1), l: `Settimana ${i + 1}${n ? ` · ${plural(n, 'esercizio', 'esercizi')}` : ''}` };
          })}
          onChange={(v) => {
            setWeek(Number(v));
            setEditing(null);
            setPanel(null);
          }}
        />
      </div>
      {/* le settimane della scheda come blocchetti (V05): accesi quelli già preparati, contornato quello aperto */}
      <span className="blocks weeks" aria-hidden="true">
        {Array.from({ length: weeks }, (_, i) => (
          <i key={i} className={`${items.some((x) => x.week === i + 1) ? 'on' : ''}${i + 1 === shownWeek ? ' cur' : ''}`.trim() || undefined} />
        ))}
      </span>
      <div className={`days${wide ? ' board' : ''}`}>
        {DAY_SHORT.map((d, i) => {
          const inDay = weekItems.filter((x) => x.weekday === i).sort((a, b) => a.sortOrder - b.sortOrder);
          const n = inDay.length;
          return (
            <button
              key={d}
              className={`day${i === day ? ' on' : ''}`}
              onClick={() => {
                setDay(i);
                setEditing(null);
                setPanel(null);
              }}
              aria-label={`${DAY_LONG[i]}, ${plural(n, 'esercizio', 'esercizi')}`}
              aria-pressed={i === day}
            >
              <span>{d}</span>
              {/* su schermo largo la settimana è una griglia: ogni giorno con i suoi esercizi (ticket 26) */}
              {wide ? (
                n ? (
                  <span className="board-list">
                    {inDay.map((x) => (
                      <span key={x.id} className={`b-item t-${x.scheme.type}`}>
                        <ExIcon catalogId={x.catalogId} />
                        <span>{refName(catalog, x)}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="board-empty">Riposo</span>
                )
              ) : /* un pallino per esercizio, nel colore del tipo (V05); il numero è nell'etichetta del pulsante */
              n ? (
                <span className="dots" aria-hidden="true">
                  {inDay.slice(0, 6).map((x) => (
                    <em key={x.id} className={`${x.scheme.type} f`} />
                  ))}
                </span>
              ) : (
                <small>–</small>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
  const dayPart = (
    <>
      <h3 className="day-title">
        Settimana {shownWeek} · {DAY_LONG[day]}
      </h3>

      <div className="plan">
        {!dayItems.length && (
          <EmptyState small art={<CategoryRow />} title="Riposo">
            Aggiungi esercizi qui sotto.
          </EmptyState>
        )}
        {dayItems.map((i) => (
          <div className="pitem" key={i.id}>
            <div>
              <div className="pname"><ExIcon catalogId={i.catalogId} />{refName(catalog, i)}</div>
              <div className="pmeta">
                {fmtScheme(i.scheme)}{' '}
                {editing !== i.id && (
                  <button className="link small" onClick={() => setEditing(i.id)}>
                    Modifica
                  </button>
                )}
              </div>
              {i.note && <p className="coach-note mt-8">{i.note}</p>}
              <div className="chips">
                <TypeChip type={i.scheme.type} />
              </div>
            </div>
            <div className="pact">
              <button
                className="x"
                aria-label={`Togli ${refName(catalog, i)}`}
                onClick={() =>
                  removeItems.mutate([i.id], {
                    onSuccess: () => {
                      const { id: _gone, ...back } = i;
                      toast(`${refName(catalog, i)} tolto`, { label: 'Annulla', run: () => addItems.mutate([back]) });
                    },
                  })
                }
              >
                ×
              </button>
            </div>
            {editing === i.id && (
              <SchemeForm
                initial={i.scheme}
                measure={catalogMeasure(i) ?? (i.scheme.seconds > 0 ? 'time' : 'reps')}
                measureEditable={!i.catalogId}
                note={i.note}
                hint="Solo in questa scheda."
                saveLabel="Salva"
                onSave={(scheme, note) => {
                  editItem.mutate({ id: i.id, patch: { scheme, note } });
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="form mt-12">
        {panel !== 'multi' && panel !== 'dup' && picker.view}
        {panel === 'multi' ? (
          <MultiAdd
            catalog={catalog}
            exclude={(r) => dayItems.some((i) => sameRef(i, r))}
            hint={`Settimana ${shownWeek}, ${DAY_LONG[day].toLowerCase()}.`}
            busy={addItems.isPending}
            onAdd={(picked, shared) => {
              const add = addToProgramDay(items, { programId: id, week: shownWeek, weekday: day }, picked, shared);
              addItems.mutate(add, { onSuccess: () => toast(plural(add.length, 'esercizio aggiunto', 'esercizi aggiunti')) });
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        ) : panel === 'dup' ? (
          <DuplicateDay
            from={day}
            days={DAY_SHORT.map((s, i) => ({ short: s, long: DAY_LONG[i], count: weekItems.filter((x) => x.weekday === i).length }))}
            busy={addItems.isPending}
            onDuplicate={(to) => {
              const add = duplicateProgramDay(items, shownWeek, day, to);
              if (!add.length) return toast('Quei giorni hanno già questi esercizi');
              addItems.mutate(add, { onSuccess: () => toast(`${DAY_LONG[day]} copiato: ${plural(add.length, 'esercizio', 'esercizi')}`) });
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        ) : !adding ? (
          <div className="row">
            <button className="btn" onClick={() => (picker.ref() ? setAdding(true) : toast("Scrivi il nome dell'esercizio"))}>
              Aggiungi
            </button>
            <button className="btn ghost" onClick={() => setPanel('multi')}>
              + Più esercizi
            </button>
            {dayItems.length > 0 && (
              <button className="btn ghost" onClick={() => setPanel('dup')}>
                Duplica giorno
              </button>
            )}
          </div>
        ) : (
          <SchemeForm
            key={picker.key}
            initial={typeScheme(defaultType(catalog, addRef ?? undefined), catalogMeasure(addRef) ?? customMeasure(addRef))}
            measure={catalogMeasure(addRef) ?? customMeasure(addRef)}
            measureEditable={!!addRef && !addRef.catalogId}
            note={null}
            hint={`Settimana ${shownWeek}, ${DAY_LONG[day].toLowerCase()}.`}
            saveLabel="Aggiungi"
            onSave={(scheme, note) => {
              const ref = picker.ref();
              if (!ref) return toast("Scrivi il nome dell'esercizio");
              if (dayItems.some((i) => sameRef(i, ref))) return toast('Questo esercizio è già nel giorno');
              const sortOrder = dayItems.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
              addItems.mutate([{ programId: id, week: shownWeek, weekday: day, ...ref, sortOrder, scheme, note }]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </>
  );
  const copyRow = shownWeek < weeks && weekItems.length > 0 && (
    <div className="row mt-16">
      <ConfirmButton confirmLabel={`Sostituire le settimane ${shownWeek + 1}–${weeks}?`} onConfirm={copyToNext}>
        Copia la settimana {shownWeek} nelle successive
      </ConfirmButton>
    </div>
  );

  return (
    <>
      <PageTitle title={name || 'Scheda modello'} />
      {/* su schermo largo la settimana a griglia occupa tutta la larghezza (ticket 26); sotto, il giorno aperto
          a sinistra e nome e assegnazione a destra (audit A06) */}
      {wide ? (
        <>
          <section className="card">
            {weekPart}
            {copyRow}
          </section>
          <Cols
            left={<section className="card day-card">{dayPart}</section>}
            right={
              <>
                {headCard}
                {assignCard}
              </>
            }
          />
        </>
      ) : (
        <>
          {headCard}
          <section className="card">
            {weekPart}
            {dayPart}
            {copyRow}
          </section>
          {assignCard}
        </>
      )}
    </>
  );
}

function AssignCard({ programId, programName, weeks, empty }: { programId: string; programName: string; weeks: number; empty: boolean }) {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const athletes = useLinks().data?.filter((l) => l.trainerId === myId) ?? [];
  const assign = useAssignProgram();
  const toast = useToast();
  const thisMonday = mondayOf(todayStr());
  const mondays = Array.from({ length: 9 }, (_, i) => addDays(thisMonday, 7 * i));
  const [athlete, setAthlete] = useState('');
  const [start, setStart] = useState(addDays(thisMonday, 7));
  const athleteId = athletes.some((a) => a.athleteId === athlete) ? athlete : (athletes[0]?.athleteId ?? '');
  const who = athletes.find((a) => a.athleteId === athleteId);
  const end = addDays(start, 7 * weeks - 1);

  return (
    <section className="card">
      <h2>Assegna</h2>
      {!athletes.length ? (
        <EmptyState
          small
          art={<EmptyPeople />}
          title="Nessun atleta"
          actions={
            <Link className="btn" to="/account">
              Invita un atleta
            </Link>
          }
        >
          Per assegnare la scheda serve almeno un atleta collegato.
        </EmptyState>
      ) : (
        <div className="form mt-14">
          <div className="grid2">
            <Select label="Atleta" value={athleteId} options={athletes.map((a) => ({ v: a.athleteId, l: a.athleteName ?? 'Atleta senza nome' }))} onChange={setAthlete} />
            <Select
              label="Da lunedì"
              value={start}
              options={mondays.map((m) => ({ v: m, l: `${weekLabel(m)}${m === thisMonday ? ' (questa)' : ''}` }))}
              onChange={setStart}
            />
          </div>
          <p className="hint">
            "{programName}" finisce nel calendario dell'atleta dal {shortDate(start)} al {shortDate(end)}. Se in quei giorni ha già lo stesso
            esercizio, vale lo schema della scheda. Poi puoi ritoccare i singoli giorni dalla sua pagina.
          </p>
          <div className="row">
            <button
              className="btn"
              disabled={empty || assign.isPending || !athleteId}
              onClick={() =>
                assign.mutate(
                  { programId, athleteId, startMonday: start },
                  { onSuccess: (n) => toast(`Assegnata: ${plural(Number(n), 'esercizio', 'esercizi')} nel calendario di ${who?.athleteName ?? "dell'atleta"}`) },
                )
              }
            >
              Assegna a {who?.athleteName ?? 'atleta'}
            </button>
            {who && (
              <Link className="link small" to={`/atleti/${who.athleteId}`}>
                Apri il suo calendario
              </Link>
            )}
          </div>
          {empty && <p className="hint">La scheda è vuota: aggiungi qualche esercizio prima di assegnarla.</p>}
        </div>
      )}
    </section>
  );
}
