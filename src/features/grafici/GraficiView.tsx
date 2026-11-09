import { useState } from 'react';
import { useScope } from '../../app/session';
import { EntryItem } from '../../components/EntryItem';
import { LineChart, TypeChart } from '../../components/charts';
import { PageTitle, Seg, Select } from '../../components/ui';
import { useData } from '../../data/hooks';
import { EXERCISE_TYPES, TYPE_LABEL, type Measure } from '../../data/types';
import { todayStr } from '../../lib/dates';
import { fmt, plural } from '../../lib/format';
import {
  aggregate,
  aggregateTypes,
  axisLabel,
  bucketLabel,
  compare,
  DEFAULT_PERIOD,
  grainFor,
  isMaxMetric,
  isPeriod,
  PERIOD_NAME,
  periodRange,
  PERIODS,
  IN_PERIOD,
  PREVIOUS,
  recordIndex,
  summarize,
  type Grain,
  type Period,
} from '../../lib/periods';
import { METRICS, METRICS_BY_MEASURE, recordEntryIds, repsByType, series, type Metric, type Point } from '../../lib/stats';
import { useLogger } from '../logger/Logger';

/** Sessioni mostrate sotto il grafico, e quante in più a ogni "Mostra altre". */
const SESSIONS = 5;
const PERIOD_KEY = 'grafici-periodo';

const GRAIN_LABEL: Record<Grain, string> = { day: 'per sessione', week: 'per settimana', month: 'per mese' };

/** Metrica nella posizione `slot` per un esercizio che si misura in `m` (0 = miglior risultato, 1 = totale, 2 = l'altra). */
const metricOf = (m: Measure, slot: number) => METRICS_BY_MEASURE[m][slot];

function loadPeriod(): Period {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return isPeriod(v) ? v : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

/** "media a sessione" o "massimo", secondo la metrica. */
const howLabel = (metric: Metric) => (isMaxMetric(metric) ? 'massimo' : 'media a sessione');

export function GraficiView() {
  const { exercises, done: entries } = useData();
  // la posizione della metrica, non la metrica: passando da un esercizio a ripetizioni a uno a tempo resta il ruolo
  const [slot, setSlot] = useState(0);
  const [period, setPeriodState] = useState<Period>(loadPeriod);
  const [picked, setPicked] = useState<string | null>(null);
  const [selected, setSelected] = useState<Point | null>(null);
  const [limit, setLimit] = useState(SESSIONS);
  const openLogger = useLogger();
  // un atleta visto dal trainer: le sessioni si leggono soltanto
  const { readOnly } = useScope();
  const pick = (id: string) => {
    setPicked(id);
    setSelected(null);
    setLimit(SESSIONS);
  };
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setSelected(null);
    setLimit(SESSIONS);
    try {
      localStorage.setItem(PERIOD_KEY, p);
    } catch {
      // senza memoria del browser il periodo vale solo per questa visita
    }
  };

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

  const range = periodRange(period, todayStr());
  const inPeriod = (d: string) => !range || d >= range.from;
  const periodEntries = entries.filter((e) => inPeriod(e.date));

  /** Punti di un esercizio nel periodo: per sessione e raggruppati. */
  const chartOf = (exerciseId: string, metric: Metric) => {
    const daily = series(entries, exerciseId, metric);
    const inside = daily.filter((p) => inPeriod(p.date));
    const grain = grainFor(period, inside.map((p) => p.date));
    const points = aggregate(inside, grain, metric);
    return { daily, inside, grain, points, record: recordIndex(points, daily, grain, metric) };
  };

  const ex = shown.find((e) => e.id === picked) ?? shown.find((e) => withData.has(e.id)) ?? shown[0];
  const metric = metricOf(ex.measure, slot);
  const m = METRICS[metric];
  const { daily, inside, grain, points: pts, record } = chartOf(ex.id, metric);
  const cmp = range && inside.length ? compare(daily, range, metric) : null;
  const anyTimed = shown.some((x) => x.measure === 'time');
  const anyReps = shown.some((x) => x.measure === 'reps');
  const readout = selected && pts.find((p) => p.date === selected.date && p.end === selected.end) ? selected : null;
  const rows = repsByType(periodEntries);
  const typeGrain = grainFor(period, rows.map((r) => r.date));
  const types = aggregateTypes(rows, typeGrain);
  // le sessioni dell'esercizio nel periodo, dalla più recente; toccando un punto restano quelle del punto
  const sessions = periodEntries.filter(
    (e) => e.exerciseId === ex.id && (!readout || (e.date >= readout.date && e.date <= (readout.end ?? readout.date))),
  );
  const prIds = recordEntryIds(entries);
  const everData = daily.length > 0;

  return (
    <>
      <PageTitle title="Grafici" />
      <section className="card">
        <h2>Andamento</h2>
        <p className="sub">
          {ex.name} · {m.label.toLowerCase()} {GRAIN_LABEL[grain]}
          {grain !== 'day' && `, ${howLabel(metric)}`}
        </p>
        <div className="period mt-14">
          <Seg label="Periodo" value={period} options={PERIODS} onChange={setPeriod} />
        </div>
        <div className="mt-10">
          <Seg
            label="Metrica"
            value={String(slot)}
            options={METRICS_BY_MEASURE[ex.measure].map((k, i) => ({ v: String(i), l: METRICS[k].label }))}
            onChange={(v) => (setSlot(Number(v)), setSelected(null))}
          />
        </div>
        <div className="mt-14">
          <Select label="Esercizio" value={ex.id} options={shown.map((e) => ({ v: e.id, l: e.name }))} onChange={pick} />
        </div>
        {!pts.length ? (
          everData && period !== 'all' ? (
            <p className="empty">
              Nessuna registrazione {IN_PERIOD[period]}.{' '}
              <button className="link small" onClick={() => setPeriod('all')}>
                Vedi tutto
              </button>
            </p>
          ) : (
            <p className="empty">Nessuna registrazione per questo esercizio.</p>
          )
        ) : (
          <>
            <div className="chart">
              <LineChart
                points={pts}
                onSelect={setSelected}
                selected={readout?.date}
                label={(d) => axisLabel(d, grain)}
                record={record}
                format={(p) => `${fmt(p.v)} ${m.unit}`}
              />
            </div>
            <p className="readout" aria-live="polite">
              {readout ? (
                <>
                  {fmt(readout.v)} {m.unit}{' '}
                  <span>
                    · {bucketLabel(readout.date, grain)}
                    {grain !== 'day' && readout.n && `, ${isMaxMetric(metric) ? 'massimo' : 'media'} di ${plural(readout.n, 'sessione', 'sessioni')}`} ·{' '}
                    <button className="link small" onClick={() => setSelected(null)}>
                      tutto il periodo
                    </button>
                  </span>
                </>
              ) : (
                <>
                  {fmt(Math.round(summarize(inside, metric) * 10) / 10)} {m.unit}{' '}
                  <span>
                    · {howLabel(metric)}, {PERIOD_NAME[period]}
                  </span>
                </>
              )}
            </p>
            {!readout && (
              <p className="cmp">
                {plural(inside.length, 'sessione', 'sessioni')}
                {cmp && period !== 'all' && <Change cmp={cmp} text={PREVIOUS[period]} />}
                {pts.length > 1 && ' · tocca o trascina sul grafico per i dettagli'}
              </p>
            )}
            <div className="sessions">
              <h3 className="h-sub">{readout ? `Sessioni: ${bucketLabel(readout.date, grain)}` : 'Sessioni'}</h3>
              {sessions.slice(0, readout ? undefined : limit).map((e) => (
                <EntryItem key={e.id} entry={e} record={prIds.has(e.id)} showDate onOpen={readOnly ? undefined : () => openLogger({ entry: e })} />
              ))}
              {!readout && sessions.length > limit && (
                <div className="row mt-12">
                  <button className="btn small ghost" onClick={() => setLimit(limit + SESSIONS * 4)}>
                    Mostra altre ({sessions.length - limit})
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>Ripetizioni per tipo</h2>
        <p className="sub">
          Quanto lavoro fai in forza, volume e tecnica, {typeGrain === 'day' ? 'per sessione' : `${GRAIN_LABEL[typeGrain]} (media a sessione)`},{' '}
          {PERIOD_NAME[period]}.{anyTimed && ' Le tenute a tempo non hanno ripetizioni e qui non contano.'}
        </p>
        <div className="legend">
          {EXERCISE_TYPES.map((t) => (
            <span key={t}>
              <i className={`dot ${t}`} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>
        <div className="chart">
          {types.length ? (
            <TypeChart data={types} label={(d) => axisLabel(d, typeGrain)} />
          ) : (
            <p className="empty">
              {period === 'all' ? 'Registra un allenamento per vedere il lavoro per tipo.' : 'Nessuna ripetizione registrata in questo periodo.'}
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Tutti gli esercizi</h2>
        <p className="sub">
          {anyReps && anyTimed
            ? `${METRICS[metricOf('reps', slot)].label} di ogni esercizio, ${METRICS[metricOf('time', slot)].label.toLowerCase()} per quelli a tempo`
            : `${METRICS[metricOf(anyTimed ? 'time' : 'reps', slot)].label} di ogni esercizio`}
          , {PERIOD_NAME[period]}. Tocca una scheda per aprirla in grande.
        </p>
        <div className="minis">
          {shown.map((x) => {
            const xm = metricOf(x.measure, slot);
            const c = chartOf(x.id, xm);
            return (
              <button
                key={x.id}
                className={`mini${x.id === ex.id ? ' on' : ''}`}
                onClick={() => {
                  pick(x.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <b>{x.name}</b>
                {c.points.length ? (
                  <>
                    <div className="v">
                      {fmt(Math.round(summarize(c.inside, xm) * 10) / 10)} <small>{METRICS[xm].unit}</small>
                    </div>
                    <div className="cap">{howLabel(xm)}</div>
                    <LineChart points={c.points} mini record={c.record} />
                  </>
                ) : (
                  <div className="none">{c.daily.length ? 'Nessun dato nel periodo' : 'Nessun dato'}</div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

/** " · +12% rispetto ai 3 mesi prima", oppure che prima non c'erano sessioni da confrontare. */
function Change({ cmp, text }: { cmp: { prev: number | null; pct: number | null }; text: { vs: string; none: string } }) {
  if (cmp.prev === null) return <> · {text.none}</>;
  // prima c'erano sessioni ma il valore era 0 (es. peso a corpo libero): una percentuale non avrebbe senso
  if (cmp.pct === null) return null;
  const cls = cmp.pct > 0 ? 'up' : cmp.pct < 0 ? 'down' : undefined;
  return (
    <>
      {' · '}
      <b className={cls}>
        {cmp.pct > 0 ? '+' : cmp.pct < 0 ? '−' : '±'}
        {Math.abs(cmp.pct)}%
      </b>{' '}
      {text.vs}
    </>
  );
}
