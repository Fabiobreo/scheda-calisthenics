import { EXERCISE_TYPES, TYPE_LABEL } from '../data/types';
import { parseDate, shortDate } from '../lib/dates';
import { fmt } from '../lib/format';
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

/** Grafico a linea su asse temporale. Con `mini` diventa una sparkline senza assi. */
export function LineChart({ points, mini, onSelect }: { points: Point[]; mini?: boolean; onSelect?: (p: Point) => void }) {
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
  const labelIdx =
    points.length === 1 ? [0] : points.length === 2 ? [0, 1] : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Grafico andamento">
      {!mini && <YGrid top={sc.top} step={sc.step} y={y} right={p.r} />}
      {points.length > 1 && (
        <>
          <path className="g-area" d={`${d} L${x(points[points.length - 1].date).toFixed(1)} ${base} L${x(points[0].date).toFixed(1)} ${base} Z`} />
          <path className="g-line" d={d} />
        </>
      )}
      {points.map((pt, i) => {
        const last = i === points.length - 1;
        const r = last ? (mini ? 4 : 6.5) : mini ? 0 : 4.5;
        return (
          <g key={pt.date}>
            {r > 0 && <circle className="g-dot" cx={x(pt.date)} cy={y(pt.v)} r={r} />}
            {!mini && onSelect && (
              <circle className="pt" cx={x(pt.date)} cy={y(pt.v)} r={16} onClick={() => onSelect(pt)}>
                <title>{`${fmt(pt.v)} · ${shortDate(pt.date)}`}</title>
              </circle>
            )}
          </g>
        );
      })}
      {!mini &&
        labelIdx.map((i) => (
          <text key={i} className="g-txt" x={x(points[i].date)} y={h - 6} textAnchor="middle">
            {shortDate(points[i].date)}
          </text>
        ))}
    </svg>
  );
}

/** Barre impilate: ripetizioni per tipo, per sessione. */
export function TypeChart({ data }: { data: TypeTotals[] }) {
  const right = 10;
  const sc = niceScale(Math.max(...data.map((d) => d.forza + d.volume + d.tecnico)));
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / sc.top);
  const slot = (W - PAD.l - right) / data.length;
  const bw = Math.min(54, slot * 0.62);

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
                  <title>{`${TYPE_LABEL[t]}: ${v} rip.`}</title>
                </rect>
              );
              acc += v;
              return rect;
            })}
            <text className="g-txt" x={cx} y={H - 8} textAnchor="middle">
              {shortDate(d.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
