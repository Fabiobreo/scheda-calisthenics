import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useToast } from '../../app/toast';
import { refName, useExercisePicker } from '../../components/ExercisePicker';
import { SchemeForm } from '../../components/SchemeForm';
import { ConfirmButton, Field, Select, TypeChip } from '../../components/ui';
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
import { DEFAULT_REST, type ProgramItem, type ProgramItemInput } from '../../data/types';
import { DAY_LONG, DAY_SHORT, addDays, mondayOf, shortDate, todayStr, weekLabel } from '../../lib/dates';
import { fmt, isInt, plural } from '../../lib/format';
import { defaultType } from '../../lib/catalog';

/** Le schede modello del trainer, nella pagina Atleti. */
export function SchedeCard() {
  const programs = usePrograms();
  const create = useCreateProgram();
  const navigate = useNavigate();

  return (
    <section className="card">
      <div className="card-h">
        <h2>Schede</h2>
        <button
          className="btn small"
          disabled={create.isPending}
          onClick={() => create.mutate({ name: 'Nuova scheda', weeks: 4 }, { onSuccess: (p) => navigate(`/schede/${p.id}`) })}
        >
          + Nuova
        </button>
      </div>
      <p className="sub">Prepari una scheda una volta, settimana per settimana, e la assegni a uno o più atleti da un lunedì.</p>
      {programs.isLoading ? (
        <p className="empty">Caricamento…</p>
      ) : !programs.data?.length ? (
        <p className="empty">Nessuna scheda per ora.</p>
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

  if (programs.isLoading) return <p className="empty">Caricamento…</p>;
  if (!program)
    return (
      <section className="card">
        <h2>Scheda</h2>
        <p className="empty">
          Scheda non trovata. Torna ad <Link to="/atleti">Atleti</Link>.
        </p>
      </section>
    );
  return <Editor key={program.id} id={program.id} name={program.name} weeks={program.weeks} />;
}

function Editor({ id, name, weeks }: { id: string; name: string; weeks: number }) {
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
  const [adding, setAdding] = useState(false);

  const shownWeek = Math.min(week, weeks);
  const dayItems = items.filter((i) => i.week === shownWeek && i.weekday === day).sort((a, b) => a.sortOrder - b.sortOrder);
  const weekItems = items.filter((i) => i.week === shownWeek);
  const sameRef = (i: ProgramItem, r: { catalogId: string | null; customName: string | null }) =>
    i.catalogId === r.catalogId && (i.customName ?? '').toLowerCase() === (r.customName ?? '').toLowerCase();
  const picker = useExercisePicker(catalog, (r) => dayItems.some((i) => sameRef(i, r)));

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

  return (
    <>
      <section className="card">
        <div className="card-h">
          <h2>Scheda</h2>
          <Link className="link small" to="/atleti">
            ‹ Atleti
          </Link>
        </div>
        <div className="form" style={{ marginTop: 14 }}>
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

      <section className="card">
        <div className="grid2">
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
              setAdding(false);
            }}
          />
        </div>
        <div className="days">
          {DAY_SHORT.map((d, i) => {
            const n = weekItems.filter((x) => x.weekday === i).length;
            return (
              <button
                key={d}
                className={`day${i === day ? ' on' : ''}`}
                onClick={() => {
                  setDay(i);
                  setEditing(null);
                  setAdding(false);
                }}
                aria-label={`${DAY_LONG[i]}, ${plural(n, 'esercizio', 'esercizi')}`}
                aria-pressed={i === day}
              >
                <span>{d}</span>
                <small>{n ? `${n} es.` : '–'}</small>
              </button>
            );
          })}
        </div>
        <h3 style={{ fontSize: 22, marginTop: 18 }}>
          Settimana {shownWeek} · {DAY_LONG[day]}
        </h3>

        <div className="plan">
          {!dayItems.length && <p className="empty">Riposo. Aggiungi un esercizio qui sotto.</p>}
          {dayItems.map((i) => (
            <div className="pitem" key={i.id}>
              <div>
                <div className="pname">{refName(catalog, i)}</div>
                <div className="pmeta">
                  {i.scheme.sets} × {i.scheme.reps} · {fmt(i.scheme.weight)} kg{i.scheme.rest > 0 && ` · rec. ${i.scheme.rest} s`}{' '}
                  {editing !== i.id && (
                    <button className="link small" onClick={() => setEditing(i.id)}>
                      Modifica
                    </button>
                  )}
                </div>
                {i.note && <p className="coach-note" style={{ marginTop: 8 }}>{i.note}</p>}
                <div className="chips">
                  <TypeChip type={i.scheme.type} />
                </div>
              </div>
              <div className="pact">
                <button className="x" onClick={() => removeItems.mutate([i.id])} aria-label={`Togli ${refName(catalog, i)}`}>
                  ×
                </button>
              </div>
              {editing === i.id && (
                <SchemeForm
                  initial={i.scheme}
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

        <div className="form" style={{ marginTop: 12 }}>
          {picker.view}
          {!adding ? (
            <div className="row">
              <button className="btn" onClick={() => (picker.ref() ? setAdding(true) : toast("Scrivi il nome dell'esercizio"))}>
                Aggiungi
              </button>
            </div>
          ) : (
            <SchemeForm
              key={picker.key}
              initial={{ type: defaultType(catalog, picker.ref() ?? undefined), sets: 3, reps: 8, weight: 0, rest: DEFAULT_REST }}
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

        {shownWeek < weeks && weekItems.length > 0 && (
          <div className="row" style={{ marginTop: 16 }}>
            <ConfirmButton confirmLabel={`Sostituire le settimane ${shownWeek + 1}–${weeks}?`} onConfirm={copyToNext}>
              Copia la settimana {shownWeek} nelle successive
            </ConfirmButton>
          </div>
        )}
      </section>

      <AssignCard programId={id} programName={name} weeks={weeks} empty={!items.length} />
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
        <p className="empty">
          Non segui ancora nessun atleta: invitali da <Link to="/account">Account</Link>.
        </p>
      ) : (
        <div className="form" style={{ marginTop: 14 }}>
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
