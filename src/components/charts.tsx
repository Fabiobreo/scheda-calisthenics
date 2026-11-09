import type { MouseEvent } from 'react';
import { EXERCISE_TYPES, TYPE_LABEL } from '../data/types';
import { parseDate, shortDate } from '../lib/dates';
import { fmt } from '../lib/format';
import { labelIndexes } from '../lib/periods';
import { niceScale, type Point, type TypeTotals } from '../lib/stats';

const W = 340;
const H = 210;
const PAD = { l: 46, r: 18, t: 12, b: 30 };

function YGrid({ top, step, y, right }: { top: number; step: number; y: (v: number) => number; right: number }) {
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return (
    <>
      {ticks.map((v) => (
        <g key={v}>
          <line className="g-grid" x1={PAD.l} x2={W - right} y1={y(v)} y2={y(v)} />
          <text className="g-txt" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
    </>
  );
}

/** Punto più vicino in orizzontale al tocco: con molti punti vicini un cerchio da toccare non basta. */
function nearest<T>(e: MouseEvent<SVGElement>, items: T[], xOf: (t: T) => number, width: number): T | null {
  const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
  if (!box.width || !items.length) return null;
  const sx = ((e.clientX - box.left) / box.width) * width;
  return items.reduce((a, b) => (Math.abs(xOf(b) - sx) < Math.abs(xOf(a) - sx) ? b : a));
}

/**
 * Grafico a linea su asse temporale. Con `mini` diventa una sparkline senza assi. `label` scrive le date sull'asse
 * (al più 4); con molti punti i pallini si rimpiccioliscono e il tocco sceglie il punto più vicino.
 */
export function LineChart({
  points,
  mini,
  onSelect,
  selected,
  label = shortDate,
}: {
  points: Point[];
  mini?: boolean;
  onSelect?: (p: Point) => void;
  selected?: string | null;
  label?: (date: string) => string;
}) {
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
  const dotR = points.length > 40 ? 0 : points.length > 16 ? 2.8 : 4.5;
  const sel = selected ? points.find((pt) => pt.date === selected) : undefined;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Grafico andamento">
      {!mini && <YGrid top={sc.top} step={sc.step} y={y} right={p.r} />}
      {points.length > 1 && (
        <>
          <path className="g-area" d={`${d} L${x(points[points.length - 1].date).toFixed(1)} ${base} L${x(points[0].date).toFixed(1)} ${base} Z`} />
          <path className="g-line" d={d} />
        </>
      )}
      {sel && !mini && <line className="g-sel" x1={x(sel.date)} x2={x(sel.date)} y1={p.t} y2={base} />}
      {points.map((pt, i) => {
        const last = i === points.length - 1;
        const r = pt === sel ? 6.5 : last ? (mini ? 4 : 6.5) : mini ? 0 : dotR;
        return r > 0 ? <circle key={pt.date} className="g-dot" cx={x(pt.date)} cy={y(pt.v)} r={r} /> : null;
      })}
      {!mini && onSelect && (
        <rect
          className="pt"
          x={0}
          y={0}
          width={w}
          height={h}
          onClick={(e) => {
            const pt = nearest(e, points, (q) => x(q.date), w);
            if (pt) onSelect(pt);
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

/** Barre impilate: ripetizioni per tipo, per sessione. */
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
                <rect key={t} x={cx - bw / 2} y={y(acc + v)} width={bw} height={y(acc) - y(acc + v)} rx={3} style={{ fill: `var(--${t})` }}>
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
