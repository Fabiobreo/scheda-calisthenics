import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useScope } from '../../app/session';
import { LineChart } from '../../components/charts';
import { CardHead, EmptyState, PageTitle, Seg, Select, useNested } from '../../components/ui';
import { useData } from '../../data/hooks';
import { shortDate, todayStr } from '../../lib/dates';
import { fmt } from '../../lib/format';
import {
  aggregate,
  axisLabel,
  bucketLabel,
  DEFAULT_PERIOD,
  grainFor,
  IN_PERIOD,
  isMaxMetric,
  isPeriod,
  periodRange,
  PERIODS,
  recordIndex,
  type Grain,
  type Period,
} from '../../lib/periods';
import { METRICS, METRICS_BY_MEASURE, recordPoint, series, type Point } from '../../lib/stats';
import { useLogger } from '../logger/Logger';
import { SessionSheet } from './SessionSheet';

/** Sessioni mostrate sotto il grafico. */
const SESSIONS = 5;
const PERIOD_KEY = 'grafici-periodo';

const GRAIN_LABEL: Record<Exclude<Grain, 'day'>, string> = { week: 'per settimana', month: 'per mese' };

function loadPeriod(): Period {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return isPeriod(v) ? v : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

/** Coppa del record. Decorativa: accanto c'è scritto "Record". */
const Cup = () => (
  <svg className="gr-cup" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.9 3.6M17 6h2.5a2.5 2.5 0 0 1-2.9 3.6M12 14v4M8.5 20h7M9.5 18h5" />
  </svg>
);

/**
 * Pagina Grafici (ticket 36): un solo grafico. Dall'alto: titolo "Andamento" con esercizio e metrica, periodo,
 * metrica, esercizio, grafico, riga del record, ultime 5 sessioni. Sul telefono sta in una schermata: il grafico
 * prende lo spazio che resta (vedi `.gr` in styles.css).
 */
export function GraficiView() {
  const nested = useNested();
  const { exercises, done: entries } = useData();
  // la posizione della metrica, non la metrica: passando da un esercizio a ripetizioni a uno a tempo resta la scelta
  const [slot, setSlot] = useState(0);
  const [period, setPeriodState] = useState<Period>(loadPeriod);
  const [picked, setPicked] = useState<string | null>(null);
  // punto col fumetto aperto sul grafico
  const [selected, setSelected] = useState<Point | null>(null);
  // giorno della sessione aperta nel foglio
  const [openDate, setOpenDate] = useState<string | null>(null);
  const openLogger = useLogger();
  // un atleta visto dal trainer: le sessioni si leggono soltanto
  const { readOnly } = useScope();
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setSelected(null);
    try {
      localStorage.setItem(PERIOD_KEY, p);
    } catch {
      // senza memoria del browser il periodo vale solo per questa visita
    }
  };

  // archiviati inclusi solo se hanno dati da mostrare
  const withData = new Set(entries.map((e) => e.exerciseId));
  const shown = exercises.filter((e) => !e.archivedAt || withData.has(e.id));
  const cls = `gr${nested ? ' nested' : ''}`;

  if (!shown.length)
    return (
      <>
        <PageTitle title="Grafici" />
        <div className={cls}>
          <div className="gr-head page-h">
            <h2>Andamento</h2>
          </div>
          <div className="gr-panel gr-empty">
            <EmptyState
              title={readOnly ? 'Ancora niente da mostrare' : 'Qui vedrai i tuoi progressi'}
              actions={
                !readOnly && (
                  <>
                    <Link className="btn" to="/scheda">
                      Prepara la settimana
                    </Link>
                    <Link className="btn ghost" to="/esercizi">
                      Scegli gli esercizi
                    </Link>
                  </>
                )
              }
            >
              {readOnly
                ? 'Quando registra il primo allenamento compaiono qui la curva, il record e le ultime sessioni.'
                : 'Dopo il primo allenamento registrato compaiono la curva, il record e le ultime sessioni.'}
            </EmptyState>
          </div>
        </div>
      </>
    );

  const ex = shown.find((e) => e.id === picked) ?? shown.find((e) => withData.has(e.id)) ?? shown[0];
  const metrics = METRICS_BY_MEASURE[ex.measure];
  // a tempo le metriche sono due: la terza posizione ricade sull'ultima
  const at = Math.min(slot, metrics.length - 1);
  const metric = metrics[at];
  const m = METRICS[metric];
  const value = (v: number) => `${fmt(v)} ${m.unit}`;

  const range = periodRange(period, todayStr());
  // un punto per sessione (giorno), di sempre e nel periodo; poi raggruppati per il grafico
  const daily = series(entries, ex.id, metric);
  const inside = daily.filter((p) => !range || p.date >= range.from);
  const grain = grainFor(period, inside.map((p) => p.date));
  const pts = aggregate(inside, grain, metric);
  // record di sempre della metrica scelta: stesso giorno nella riga, sul grafico e nell'elenco
  const record = recordPoint(daily);
  const tip = selected && pts.find((p) => p.date === selected.date && p.end === selected.end) ? selected : null;
  // le ultime sessioni del periodo, dalla più recente
  const sessions = inside.slice(-SESSIONS).reverse();
  const open = openDate ? daily.find((p) => p.date === openDate) : undefined;
  const openEntries = open ? entries.filter((e) => e.exerciseId === ex.id && e.date === open.date).reverse() : [];

  return (
    <>
      <PageTitle title="Grafici" />
      <div className={cls}>
        <div className="gr-head page-h">
          <CardHead title="Andamento" big help="Tocca o trascina sul grafico per leggere il valore di un punto; tocca di nuovo il punto per chiudere. Tocca una sessione per vederne le serie." />
          <p className="gr-sub">
            {ex.name} · {m.label}
            {grain !== 'day' && `, ${isMaxMetric(metric) ? 'massimo' : 'media'} ${GRAIN_LABEL[grain]}`}
          </p>
        </div>
        <Seg label="Periodo" value={period} options={PERIODS} onChange={setPeriod} />
        <Seg
          label="Metrica"
          value={String(at)}
          options={metrics.map((k, i) => ({ v: String(i), l: METRICS[k].label }))}
          onChange={(v) => {
            setSlot(Number(v));
            setSelected(null);
          }}
        />
        <Select
          label="Esercizio"
          hideLabel
          value={ex.id}
          options={shown.map((e) => ({ v: e.id, l: e.name }))}
          onChange={(id) => {
            setPicked(id);
            setSelected(null);
          }}
        />

        <div className="gr-panel gr-chart">
          {pts.length ? (
            <div className="gr-plot">
              <LineChart
                points={pts}
                // toccare il punto già scelto chiude il fumetto
                onSelect={(p) => setSelected(tip && tip.date === p.date ? null : p)}
                selected={tip?.date}
                label={(d) => axisLabel(d, grain)}
                tipLabel={(d) => bucketLabel(d, grain)}
                record={recordIndex(pts, daily, grain, metric)}
                format={(p) => value(p.v)}
              />
            </div>
          ) : daily.length && period !== 'all' ? (
            <div className="gr-empty">
              <EmptyState
                small
                title="Niente in questo periodo"
                actions={
                  <button className="btn ghost" onClick={() => setPeriod('all')}>
                    Vedi tutto
                  </button>
                }
              >
                Nessuna sessione {IN_PERIOD[period]}.
              </EmptyState>
            </div>
          ) : (
            <div className="gr-empty">
              <EmptyState
                small
                title="Ancora nessuna sessione"
                actions={
                  !readOnly && (
                    <Link className="btn ghost" to="/scheda">
                      Vai alla Scheda
                    </Link>
                  )
                }
              >
                {readOnly ? 'Nessuna registrazione per questo esercizio.' : 'Registra questo esercizio dalla Scheda e qui comparirà la linea.'}
              </EmptyState>
            </div>
          )}
          {/* record di sempre, anche quando cade fuori dal periodo scelto */}
          {daily.length > 0 && (
            <p className="gr-rec">
              <Cup />
              <span className="gr-rec-l">Record</span>
              {record ? (
                <>
                  <span className="gr-date">{shortDate(record.date)}</span>
                  <b className="gr-val">{value(record.v)}</b>
                </>
              ) : (
                <span className="gr-none">ancora nessuno</span>
              )}
            </p>
          )}
        </div>

        {sessions.length > 0 && (
          <section className="gr-last" aria-labelledby="gr-last-t">
            <h3 id="gr-last-t" className="gr-h">
              Ultime {SESSIONS} sessioni
            </h3>
            <ul className="gr-panel gr-rows">
              {sessions.map((p) => (
                <li key={p.date}>
                  <button type="button" className="gr-row" onClick={() => setOpenDate(p.date)} aria-label={`${shortDate(p.date)}${record?.date === p.date ? ', record' : ''}: ${value(p.v)}. Apri la sessione`}>
                    <span className="gr-date">{shortDate(p.date)}</span>
                    {record?.date === p.date && <span className="gr-tag">Record</span>}
                    <b className="gr-val">{value(p.v)}</b>
                    <span className="gr-chev" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {open && openEntries.length > 0 && (
        <SessionSheet
          name={ex.name}
          date={open.date}
          entries={openEntries}
          value={`${m.label} ${value(open.v)}`}
          record={record?.date === open.date}
          onClose={() => setOpenDate(null)}
          onEdit={
            readOnly
              ? undefined
              : (e) => {
                  // il registratore è un altro foglio: questo si chiude
                  setOpenDate(null);
                  openLogger({ entry: e });
                }
          }
        />
      )}
    </>
  );
}
