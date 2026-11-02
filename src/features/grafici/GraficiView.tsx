import { useState } from 'react';
import { LineChart, TypeChart } from '../../components/charts';
import { Seg, Select } from '../../components/ui';
import { useData } from '../../data/hooks';
import { EXERCISE_TYPES, TYPE_LABEL } from '../../data/types';
import { shortDate } from '../../lib/dates';
import { fmt } from '../../lib/format';
import { METRICS, repsByType, series, type Metric, type Point } from '../../lib/stats';

export function GraficiView() {
  const { exercises, entries } = useData();
  const [metric, setMetric] = useState<Metric>('peso');
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
  const m = METRICS[metric];
  const pts = series(entries, ex.id, metric);
  const last = pts[pts.length - 1];
  const readout = selected && pts.some((p) => p.date === selected.date) ? selected : null;
  const types = repsByType(entries, exercises);

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
            value={metric}
            options={(Object.keys(METRICS) as Metric[]).map((k) => ({ v: k, l: METRICS[k].label }))}
            onChange={(v) => (setMetric(v), setSelected(null))}
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
        <p className="sub">Quanto lavoro fai in forza, volume e tecnica, per sessione.</p>
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
        <p className="sub">{m.label} di ogni esercizio. Tocca una scheda per aprirla in grande.</p>
        <div className="minis">
          {shown.map((x) => {
            const p = series(entries, x.id, metric);
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
                      {fmt(l.v)} <small>{m.unit}</small>
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
