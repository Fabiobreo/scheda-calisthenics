import { useState } from 'react';
import { useScope } from '../../app/session';
import { ConfirmButton, Seg, TypeChip } from '../../components/ui';
import { useData, useDeleteEntry, useUpdateEntry } from '../../data/hooks';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Entry } from '../../data/types';
import { longDate, todayStr } from '../../lib/dates';
import { fmtSets } from '../../lib/format';
import { recordEntryIds, totalReps } from '../../lib/stats';
import { useLogger } from '../logger/Logger';

const PAGE = 20;

export function RegistroView() {
  const { exercises, entries, done } = useData();
  const openLogger = useLogger();
  const setDifficulty = useUpdateEntry('Difficoltà salvata');
  const del = useDeleteEntry();
  const [shown, setShown] = useState(PAGE);
  // storico di un atleta visto dal trainer: niente modifiche
  const { readOnly } = useScope();

  const head = (
    <>
      <h2>Storico</h2>
      <p className="sub">
        {readOnly ? "Le sessioni dell'atleta, dalla più recente, con la difficoltà che ha indicato." : "Le tue sessioni, dalla più recente. Per ogni esercizio scegli com'è andata."}
      </p>
    </>
  );
  if (!entries.length)
    return (
      <section className="card">
        {head}
        <p className="empty">{readOnly ? 'Ancora nessuna sessione.' : 'Ancora nessuna sessione. Registra il primo esercizio dalla Scheda.'}</p>
      </section>
    );

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const prIds = recordEntryIds(done);
  const today = todayStr();
  // entries arriva già dalla più recente
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const dates = [...byDate.keys()];

  return (
    <section className="card">
      {head}
      {dates.slice(0, shown).map((d) => {
        const list = byDate.get(d)!;
        const reps = list.reduce((s, e) => s + totalReps(e.sets), 0);
        return (
          <div className="grp" key={d}>
            <div className="grp-h">
              <h3>{longDate(d)}</h3>
              <span>
                {list.length} {list.length === 1 ? 'esercizio' : 'esercizi'} · {reps} rip.
              </span>
            </div>
            {list.map((e) => {
              const ex = byId.get(e.exerciseId);
              return (
                <div className="entry" key={e.id}>
                  <div>
                    <b>{ex?.name ?? 'Esercizio rimosso'}</b>
                    <div className="pmeta">{fmtSets(e.sets)}</div>
                    {e.note && <div className="pmeta">Nota: {e.note}</div>}
                    <div className="chips">
                      <TypeChip type={e.type} />
                      {e.date > today && <span className="chip mut">In programma</span>}
                      {e.kind === 'attempt' && <span className="chip mut">Tentativo</span>}
                      {prIds.has(e.id) && <span className="chip pr">★ Record</span>}
                    </div>
                    {readOnly ? (
                      e.difficulty && <div className="pmeta">Difficoltà: {DIFFICULTY_LABEL[e.difficulty].toLowerCase()}</div>
                    ) : (
                      <div className="fld" style={{ marginTop: 12 }}>
                        <span>Difficoltà</span>
                        <Seg
                          label="Difficoltà"
                          value={e.difficulty}
                          options={DIFFICULTIES.map((x) => ({ v: x, l: DIFFICULTY_LABEL[x] }))}
                          onChange={(v) => setDifficulty.mutate({ id: e.id, patch: { difficulty: e.difficulty === v ? null : v } })}
                        />
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="pact col">
                      <button className="btn small ghost" onClick={() => openLogger({ entry: e })}>
                        Modifica
                      </button>
                      <ConfirmButton onConfirm={() => del.mutate(e.id)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {dates.length > shown && (
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn small ghost" onClick={() => setShown(shown + PAGE)}>
            Mostra sessioni precedenti ({dates.length - shown})
          </button>
        </div>
      )}
    </section>
  );
}
