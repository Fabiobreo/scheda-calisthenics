import { useState } from 'react';
import { LineChart, TypeChart } from '../../components/charts';
import { Seg, Select } from '../../components/ui';
import { useData } from '../../data/hooks';
import { EXERCISE_TYPES, TYPE_LABEL, type Measure } from '../../data/types';
import { shortDate } from '../../lib/dates';
import { fmt } from '../../lib/format';
import { METRICS, METRICS_BY_MEASURE, repsByType, series, type Point } from '../../lib/stats';

/** Metrica nella posizione `slot` per un esercizio che si misura in `m` (0 = miglior risultato, 1 = totale, 2 = l'altra). */
const metricOf = (m: Measure, slot: number) => METRICS_BY_MEASURE[m][slot];

export function GraficiView() {
  const { exercises, done: entries } = useData();
  // la posizione della metrica, non la metrica: passando da un esercizio a ripetizioni a uno a tempo resta il ruolo
  const [slot, setSlot] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState<Point | null>(null);

  // archiviati inclusi solo se hanno dati da mostrare
  const withData = new Set(entries.map((e) => e.exerciseId));
  const shown = exercises.filter((e) => !e.archivedAt || withData.has(e.id));

  if (!shown.length)
    return (
      <section className="card">
        <h2>Andamento</h2>
        <p className="empty">Aggiungi un esercizio e registra un allenamento per vedere i grafici.</p>
      </section>
    );

  const ex = shown.find((e) => e.id === picked) ?? shown.find((e) => withData.has(e.id)) ?? shown[0];
  const metric = metricOf(ex.measure, slot);
  const m = METRICS[metric];
  const pts = series(entries, ex.id, metric);
  const anyTimed = shown.some((x) => x.measure === 'time');
  const anyReps = shown.some((x) => x.measure === 'reps');
  const last = pts[pts.length - 1];
  const readout = selected && pts.some((p) => p.date === selected.date) ? selected : null;
  const types = repsByType(entries);

  return (
    <>
      <section className="card">
        <h2>Andamento</h2>
        <p className="sub">
          {ex.name} · {m.label.toLowerCase()} per sessione
        </p>
        <div style={{ marginTop: 14 }}>
          <Seg
            label="Metrica"
            value={String(slot)}
            options={METRICS_BY_MEASURE[ex.measure].map((k, i) => ({ v: String(i), l: METRICS[k].label }))}
            onChange={(v) => (setSlot(Number(v)), setSelected(null))}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <Select label="Esercizio" value={ex.id} options={shown.map((e) => ({ v: e.id, l: e.name }))} onChange={(v) => (setPicked(v), setSelected(null))} />
        </div>
        {!pts.length ? (
          <p className="empty">Nessuna registrazione per questo esercizio.</p>
        ) : (
          <>
            <div className="chart">
              <LineChart points={pts} onSelect={setSelected} />
            </div>
            <p className="readout">
              {readout ? (
                <>
                  {fmt(readout.v)} {m.unit} <span>· {shortDate(readout.date)}</span>
                </>
              ) : (
                <>
                  {fmt(last.v)} {m.unit}{' '}
                  <span>
                    · ultima sessione, {shortDate(last.date)}
                    {pts.length > 1 && ' · tocca un punto per i dettagli'}
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Ripetizioni per tipo</h2>
        <p className="sub">
          Quanto lavoro fai in forza, volume e tecnica, per sessione.{anyTimed && ' Le tenute a tempo non hanno ripetizioni e qui non contano.'}
        </p>
        <div className="legend">
          {EXERCISE_TYPES.map((t) => (
            <span key={t}>
              <i className="dot" style={{ background: `var(--${t})` }} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>
        <div className="chart">
          {types.length ? <TypeChart data={types} /> : <p className="empty">Registra un allenamento per vedere il lavoro per tipo.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Tutti gli esercizi</h2>
        <p className="sub">
          {anyReps && anyTimed
            ? `${METRICS[metricOf('reps', slot)].label} di ogni esercizio, ${METRICS[metricOf('time', slot)].label.toLowerCase()} per quelli a tempo.`
            : `${METRICS[metricOf(anyTimed ? 'time' : 'reps', slot)].label} di ogni esercizio.`}{' '}
          Tocca una scheda per aprirla in grande.
        </p>
        <div className="minis">
          {shown.map((x) => {
            const xm = metricOf(x.measure, slot);
            const p = series(entries, x.id, xm);
            const l = p[p.length - 1];
            return (
              <button
                key={x.id}
                className={`mini${x.id === ex.id ? ' on' : ''}`}
                onClick={() => {
                  setPicked(x.id);
                  setSelected(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <b>{x.name}</b>
                {l ? (
                  <>
                    <div className="v">
                      {fmt(l.v)} <small>{METRICS[xm].unit}</small>
                    </div>
                    <LineChart points={p} mini />
                  </>
                ) : (
                  <div className="none">Nessun dato</div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
