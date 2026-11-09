import { useId, useRef, type PointerEvent } from 'react';
import { EXERCISE_TYPES, TYPE_LABEL } from '../data/types';
import { parseDate, shortDate } from '../lib/dates';
import { fmt } from '../lib/format';
import { labelIndexes } from '../lib/periods';
import { niceScale, type Point, type TypeTotals } from '../lib/stats';

const W = 340;
const H = 210;
// in alto c'è spazio per l'etichetta "Record" e per il fumetto del punto scelto
const PAD = { l: 46, r: 18, t: 20, b: 30 };
const TIP_W = 92;
const TIP_H = 38;

/** Griglia orizzontale tratteggiata e sottile, con la linea dello zero piena (ticket 14). */
function YGrid({ top, step, y, right }: { top: number; step: number; y: (v: number) => number; right: number }) {
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return (
    <>
      {ticks.map((v) => (
        <g key={v}>
          <line className={v ? 'g-grid' : 'g-base'} x1={PAD.l} x2={W - right} y1={y(v)} y2={y(v)} />
          <text className="g-txt" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
    </>
  );
}

/** Punto più vicino in orizzontale al dito: con molti punti vicini un cerchio da toccare non basta. */
function nearest<T>(e: PointerEvent<SVGElement>, items: T[], xOf: (t: T) => number, width: number): T | null {
  const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
  if (!box.width || !items.length) return null;
  const sx = ((e.clientX - box.left) / box.width) * width;
  return items.reduce((a, b) => (Math.abs(xOf(b) - sx) < Math.abs(xOf(a) - sx) ? b : a));
}

/**
 * Grafico a linea su asse temporale, con lo stile del pentagono (ticket 14): area sfumata, linea con bagliore (una copia
 * sfocata sotto), alone sull'ultimo valore, record personale in ambra con l'etichetta "Record". Con `mini` diventa una
 * sparkline senza assi né bagliore (sono tante e devono scorrere leggere). `label` scrive le date sull'asse (al più 4).
 * Toccando o trascinando il dito si sceglie il punto più vicino; un fumetto ne mostra valore e data.
 */
export function LineChart({
  points,
  mini,
  onSelect,
  selected,
  label = shortDate,
  record = -1,
  format = (p) => fmt(p.v),
}: {
  points: Point[];
  mini?: boolean;
  onSelect?: (p: Point) => void;
  selected?: string | null;
  label?: (date: string) => string;
  /** Indice del punto record (da `recordIndex`), -1 se non c'è. */
  record?: number;
  /** Valore nel fumetto, con l'unità ("12 kg"). */
  format?: (p: Point) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lastPicked = useRef<string | null>(null);
  // dove è cominciato il tocco, e se è diventato un trascinamento orizzontale
  const touch = useRef<{ x: number; y: number; drag: boolean } | null>(null);
  const w = mini ? 160 : W;
  const h = mini ? 52 : H;
  const p = mini ? { l: 8, r: 10, t: 6, b: 6 } : PAD;
  const sc = niceScale(Math.max(0, ...points.map((x) => x.v)));
  const t0 = parseDate(points[0].date).getTime();
  const t1 = parseDate(points[points.length - 1].date).getTime();
  const x = (d: string) => (t1 === t0 ? p.l + (w - p.l - p.r) / 2 : p.l + ((parseDate(d).getTime() - t0) / (t1 - t0)) * (w - p.l - p.r));
  const y = (v: number) => p.t + (h - p.t - p.b) * (1 - v / sc.top);
  const base = y(0);
  const d = points.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.date).toFixed(1)} ${y(pt.v).toFixed(1)}`).join(' ');
  const labels = labelIndexes(points.length);
  // pallini più piccoli quando sono fitti; oltre 40 punti resta la linea
  const dotR = points.length > 40 ? 0 : points.length > 16 ? 2.6 : 3.6;
  const sel = selected ? points.find((pt) => pt.date === selected) : undefined;
  const last = points[points.length - 1];
  const rec = points[record];

  const pick = (e: PointerEvent<SVGElement>) => {
    const pt = nearest(e, points, (q) => x(q.date), w);
    // trascinando, avvisa solo quando il punto cambia
    if (pt && pt.date !== lastPicked.current) {
      lastPicked.current = pt.date;
      onSelect?.(pt);
    }
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={mini ? 'Andamento' : 'Grafico andamento: tocca o trascina per leggere i valori'} className={mini ? undefined : 'g-big'}>
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="g-fill-top" />
          <stop offset="1" className="g-fill-bottom" />
        </linearGradient>
        {!mini && (
          <filter id={`${uid}-g`} x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        )}
      </defs>
      {!mini && <YGrid top={sc.top} step={sc.step} y={y} right={p.r} />}
      {points.length > 1 && (
        <>
          <path
            fill={`url(#${uid}-f)`}
            d={`${d} L${x(last.date).toFixed(1)} ${base} L${x(points[0].date).toFixed(1)} ${base} Z`}
          />
          {!mini && <path className="g-glow" d={d} filter={`url(#${uid}-g)`} />}
          <path className="g-line" d={d} />
        </>
      )}
      {sel && !mini && <line className="g-sel" x1={x(sel.date)} x2={x(sel.date)} y1={p.t} y2={base} />}
      {!mini &&
        points.map((pt) =>
          pt === last || pt === rec || pt === sel || !dotR ? null : <circle key={pt.date} className="g-dot" cx={x(pt.date)} cy={y(pt.v)} r={dotR} />,
        )}
      {/* ultimo valore: punto luminoso */}
      {last !== rec && (
        <>
          {!mini && <circle className="g-halo" cx={x(last.date)} cy={y(last.v)} r={11} />}
          <circle className="g-dot g-last" cx={x(last.date)} cy={y(last.v)} r={mini ? 3.5 : 5} />
        </>
      )}
      {/* record personale: ambra, con l'etichetta (mai solo colore) */}
      {rec && (
        <>
          {!mini && <circle className="g-halo rec" cx={x(rec.date)} cy={y(rec.v)} r={12} />}
          <circle className="g-dot rec" cx={x(rec.date)} cy={y(rec.v)} r={mini ? 3.5 : 5.5} />
          {!mini && rec !== sel && (
            <text
              className="g-rec-t"
              x={Math.min(Math.max(x(rec.date), p.l + 22), w - p.r - 22)}
              y={Math.max(y(rec.v) - 12, 9)}
              textAnchor="middle"
            >
              RECORD
            </text>
          )}
        </>
      )}
      {sel && !mini && <Tip x={x(sel.date)} y={y(sel.v)} value={`${format(sel)}${sel === rec ? ' · record' : ''}`} date={label(sel.date)} w={w} p={p} />}
      {!mini && onSelect && (
        <rect
          className="pt"
          x={0}
          y={0}
          width={w}
          height={h}
          onPointerDown={(e) => {
            lastPicked.current = null;
            if (e.pointerType === 'mouse') return pick(e);
            // col dito si aspetta: se scorre in verticale è la pagina che scorre, non una scelta
            touch.current = { x: e.clientX, y: e.clientY, drag: false };
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse') {
              if (e.buttons) pick(e);
              return;
            }
            const t = touch.current;
            if (!t) return;
            const dx = Math.abs(e.clientX - t.x);
            if (!t.drag && dx > 8 && dx > Math.abs(e.clientY - t.y)) {
              t.drag = true;
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }
            if (t.drag) pick(e);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'mouse' && touch.current && !touch.current.drag) pick(e);
            touch.current = null;
          }}
          onPointerCancel={() => {
            touch.current = null;
          }}
        />
      )}
      {!mini &&
        labels.map((i) => (
          <text
            key={i}
            className="g-txt"
            x={x(points[i].date)}
            y={h - 6}
            textAnchor={labels.length > 1 && i === 0 ? 'start' : labels.length > 1 && i === points.length - 1 ? 'end' : 'middle'}
          >
            {label(points[i].date)}
          </text>
        ))}
    </svg>
  );
}

/** Fumetto sopra il punto scelto: punto evidenziato, valore e data. Resta dentro il grafico. */
function Tip({ x, y, value, date, w, p }: { x: number; y: number; value: string; date: string; w: number; p: { l: number; r: number } }) {
  const tx = Math.max(p.l, Math.min(w - p.r - TIP_W, x - TIP_W / 2));
  // sopra il punto se c'è spazio, altrimenti sotto
  const ty = y - TIP_H - 12 >= 0 ? y - TIP_H - 12 : y + 12;
  return (
    <g className="g-tip" aria-hidden="true">
      <circle className="g-halo" cx={x} cy={y} r={11} />
      <circle className="g-dot g-last" cx={x} cy={y} r={5.5} />
      <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx={8} />
      <text x={tx + 10} y={ty + 16}>
        {value}
      </text>
      <text className="s" x={tx + 10} y={ty + 31}>
        {date}
      </text>
    </g>
  );
}

/** Barre impilate: ripetizioni per tipo, per sessione. Segmenti separati da una linea del colore della scheda. */
export function TypeChart({ data, label = shortDate }: { data: TypeTotals[]; label?: (date: string) => string }) {
  const right = 10;
  const sc = niceScale(Math.max(...data.map((d) => d.forza + d.volume + d.tecnico)));
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / sc.top);
  const slot = (W - PAD.l - right) / data.length;
  const bw = Math.min(54, slot * 0.62);
  const labels = new Set(labelIndexes(data.length, 5));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ripetizioni per tipo">
      <YGrid top={sc.top} step={sc.step} y={y} right={right} />
      {data.map((d, i) => {
        const cx = PAD.l + slot * i + slot / 2;
        let acc = 0;
        return (
          <g key={d.date}>
            {EXERCISE_TYPES.map((t) => {
              const v = d[t];
              if (!v) return null;
              const rect = (
                <rect key={t} className="g-bar" x={cx - bw / 2} y={y(acc + v)} width={bw} height={y(acc) - y(acc + v)} rx={3} style={{ fill: `var(--${t})` }}>
                  <title>{`${TYPE_LABEL[t]}: ${fmt(v)} rip.`}</title>
                </rect>
              );
              acc += v;
              return rect;
            })}
            {labels.has(i) && (
              <text className="g-txt" x={cx} y={H - 8} textAnchor="middle">
                {label(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
