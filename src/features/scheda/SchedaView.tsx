import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Select, TypeChip } from '../../components/ui';
import { useAddPlanItem, useData, useRemovePlanItem, useUpdateExercise } from '../../data/hooks';
import { DIFFICULTY_LABEL } from '../../data/types';
import { DAY_LONG, DAY_SHORT, longDate, shortDate, weekdayIndex } from '../../lib/dates';
import { fmt, fmtSets } from '../../lib/format';
import { lastTraining, personalBest, recordEntryIds } from '../../lib/stats';
import { useLogger } from '../logger/Logger';

export function SchedaView() {
  return (
    <>
      <Records />
      <Programma />
    </>
  );
}

function Records() {
  const { active, entries } = useData();
  const openLogger = useLogger();
  const setInRecords = useUpdateExercise();
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
      <div className="card-h">
        <h2>Record personali</h2>
        {tracked.length > 0 && (
          <button className="btn small" onClick={() => openLogger({ kind: 'attempt' })}>
            + Tentativo
          </button>
        )}
      </div>
      <p className="sub">Miglior serie singola: più peso, a parità di peso più ripetizioni. Conta anche gli allenamenti.</p>

      <div className="rlist">
        {tracked.length === 0 && <p className="empty">Nessun esercizio nei record. Aggiungine uno qui sotto.</p>}
        {tracked.map((ex) => {
          const pb = personalBest(entries, ex.id);
          const n = entries.filter((e) => e.exerciseId === ex.id).length;
          return (
            <div className="rrow" key={ex.id}>
              <div className="rname">{ex.name}</div>
              {pb ? (
                <div className="rval">
                  {fmt(pb.set.weight)} <small>kg × {pb.set.reps}</small>
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
                  <button className="x" aria-label={`Togli ${ex.name} dai record`} onClick={() => setInRecords.mutate({ id: ex.id, patch: { inRecords: false } })}>
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
          <p className="hint" style={{ marginTop: 12 }}>
            Crea prima gli esercizi nella sezione <Link to="/esercizi">Esercizi</Link>.
          </p>
        )
      )}

      {history.length > 0 && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small ghost" onClick={() => setHistoryOpen(!historyOpen)}>
            {historyOpen ? 'Nascondi progressione' : `Progressione record (${history.length})`}
          </button>
        </div>
      )}
      {historyOpen && (
        <div style={{ marginTop: 10 }}>
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
  const { active, entries, plan } = useData();
  const openLogger = useLogger();
  const addItem = useAddPlanItem();
  const removeItem = useRemovePlanItem();
  const today = weekdayIndex();
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState('');

  const byId = new Map(active.map((e) => [e.id, e]));
  const items = plan.filter((p) => p.weekday === day && byId.has(p.exerciseId));
  const avail = active.filter((e) => !items.some((p) => p.exerciseId === e.id));
  const addId = avail.some((e) => e.id === adding) ? adding : (avail[0]?.id ?? '');

  return (
    <section className="card">
      <div className="card-h">
        <h2>Programma</h2>
        {active.length > 0 && (
          <button className="btn small ghost" onClick={() => openLogger()}>
            + Fuori programma
          </button>
        )}
      </div>
      <p className="sub">Scegli gli esercizi di ogni giorno, poi registra le serie man mano.</p>
      <div className="days">
        {DAY_SHORT.map((d, i) => (
          <button
            key={d}
            className={`day${i === day ? ' on' : ''}${i === today ? ' today' : ''}`}
            onClick={() => setDay(i)}
            aria-label={DAY_LONG[i]}
            aria-pressed={i === day}
          >
            <span>{d}</span>
            <i>{plan.filter((p) => p.weekday === i && byId.has(p.exerciseId)).length}</i>
          </button>
        ))}
      </div>
      <h3 style={{ fontSize: 22, marginTop: 18 }}>{DAY_LONG[day]}</h3>

      <div className="plan">
        {items.length === 0 && <p className="empty">Nessun esercizio per {DAY_LONG[day]}. Aggiungine uno qui sotto.</p>}
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const last = lastTraining(entries, ex.id);
          return (
            <div className="pitem" key={p.id}>
              <div>
                <div className="pname">{ex.name}</div>
                <div className="pmeta">
                  Obiettivo {ex.targetSets} × {ex.targetReps} · {fmt(ex.targetWeight)} kg
                </div>
                {last && (
                  <div className="pmeta">
                    Ultimo: {fmtSets(last.sets)}
                    {last.difficulty && ` · ${DIFFICULTY_LABEL[last.difficulty]}`} · {shortDate(last.date)}
                  </div>
                )}
                <div className="chips">
                  <TypeChip type={ex.type} />
                </div>
              </div>
              <div className="pact">
                <button className="btn small" onClick={() => openLogger({ exerciseId: ex.id })}>
                  Registra
                </button>
                <button className="x" onClick={() => removeItem.mutate(p.id)} aria-label={`Togli ${ex.name} da ${DAY_LONG[day]}`}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {avail.length > 0 ? (
        <div className="addrow">
          <Select label="Aggiungi esercizio" hideLabel value={addId} options={avail.map((e) => ({ v: e.id, l: e.name }))} onChange={setAdding} />
          <button className="btn" disabled={!addId} onClick={() => addItem.mutate({ weekday: day, exerciseId: addId })}>
            Aggiungi
          </button>
        </div>
      ) : (
        active.length === 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            Il catalogo è vuoto: crea gli esercizi in <Link to="/esercizi">Esercizi</Link>.
          </p>
        )
      )}
    </section>
  );
}
