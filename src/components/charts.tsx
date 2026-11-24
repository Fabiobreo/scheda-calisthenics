import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { parseDate, shortDate } from '../lib/dates';
import { fmt } from '../lib/format';
import { labelIndexes } from '../lib/periods';
import { niceScale, type Point } from '../lib/stats';

// in alto c'è spazio per l'etichetta "Record" e per il fumetto del punto scelto
const PAD = { l: 40, r: 16, t: 22, b: 26 };
const TIP_H = 38;
/** Distanza minima tra due date sull'asse, in px: sotto si sovrapporrebbero. */
const MIN_GAP = 58;

/** Larghezza e altezza in px dell'elemento, aggiornate quando cambia: il grafico si disegna nello spazio che ha. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Punto più vicino in orizzontale al dito: con molti punti vicini un cerchio da toccare non basta. */
function nearest<T>(e: PointerEvent<SVGElement>, items: T[], xOf: (t: T) => number, width: number): T | null {
  const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
  if (!box.width || !items.length) return null;
  const sx = ((e.clientX - box.left) / box.width) * width;
  return items.reduce((a, b) => (Math.abs(xOf(b) - sx) < Math.abs(xOf(a) - sx) ? b : a));
}

/**
 * Grafico a linea su asse temporale, tutto in oro (ticket 36): area sfumata, linea con bagliore (una copia sfocata
 * sotto), alone sull'ultimo valore, record in oro chiaro con l'etichetta "Record", assi in grigio caldo.
 * Riempie l'elemento che lo contiene, in larghezza e in altezza: il disegno è in px veri (le scritte restano di 12 px
 * a ogni dimensione), quindi è la pagina a decidere quanto è alto. `label` scrive le date sull'asse (al più 4).
 * Toccando o trascinando il dito si sceglie il punto più vicino; un fumetto ne mostra valore e data.
 */
export function LineChart({
  points,
  onSelect,
  selected,
  label = shortDate,
  tipLabel = label,
  record = -1,
  format = (p) => fmt(p.v),
}: {
  points: Point[];
  onSelect?: (p: Point) => void;
  selected?: string | null;
  label?: (date: string) => string;
  /** Data nel fumetto, se diversa da quella dell'asse ("settimana del 3 nov"). */
  tipLabel?: (date: string) => string;
  /** Indice del punto record (da `recordIndex`), -1 se non c'è. */
  record?: number;
  /** Valore nel fumetto, con l'unità ("12 kg"). */
  format?: (p: Point) => string;
}) {
  const [box, size] = useSize<HTMLDivElement>();
  return (
    <div className="g-box" ref={box}>
      {size && size.w > 0 && size.h > 0 && (
        <Plot w={size.w} h={size.h} points={points} onSelect={onSelect} selected={selected} label={label} tipLabel={tipLabel} record={record} format={format} />
      )}
    </div>
  );
}

function Plot({
  w,
  h,
  points,
  onSelect,
  selected,
  label,
  tipLabel,
  record,
  format,
}: {
  w: number;
  h: number;
  points: Point[];
  onSelect?: (p: Point) => void;
  selected?: string | null;
  label: (date: string) => string;
  tipLabel: (date: string) => string;
  record: number;
  format: (p: Point) => string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lastPicked = useRef<string | null>(null);
  // dove è cominciato il tocco, e se è diventato un trascinamento orizzontale
  const touch = useRef<{ x: number; y: number; drag: boolean } | null>(null);
  const p = PAD;
  const sc = niceScale(Math.max(0, ...points.map((x) => x.v)));
  const t0 = parseDate(points[0].date).getTime();
  const t1 = parseDate(points[points.length - 1].date).getTime();
  const x = (d: string) => (t1 === t0 ? p.l + (w - p.l - p.r) / 2 : p.l + ((parseDate(d).getTime() - t0) / (t1 - t0)) * (w - p.l - p.r));
  const y = (v: number) => p.t + (h - p.t - p.b) * (1 - v / sc.top);
  const base = y(0);
  const d = points.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.date).toFixed(1)} ${y(pt.v).toFixed(1)}`).join(' ');
  // tacche dell'asse Y; nei grafici bassi una sì e una no, così le scritte non si toccano
  const ticks: number[] = [];
  for (let v = 0; v <= sc.top + 1e-9; v += sc.step) ticks.push(v);
  const everyOther = ticks.length > 1 && (base - p.t) / (ticks.length - 1) < 18;
  // date sull'asse: le scelte per numero di punti, poi via quelle troppo vicine sull'asse del tempo (si sovrapporrebbero);
  // l'ultima resta sempre
  const labels = labelIndexes(points.length).reduce<number[]>((kept, i) => {
    const prev = kept[kept.length - 1];
    if (prev === undefined || x(points[i].date) - x(points[prev].date) >= MIN_GAP) kept.push(i);
    else if (i === points.length - 1) kept[kept.length - 1] = i;
    return kept;
  }, []);
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
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="Grafico andamento: tocca o trascina per leggere i valori" className="g-big">
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="g-fill-top" />
          <stop offset="1" className="g-fill-bottom" />
        </linearGradient>
        <filter id={`${uid}-g`} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* griglia orizzontale tratteggiata e sottile, con la linea dello zero piena */}
      {ticks.map((v, i) => (
        <g key={v}>
          <line className={v ? 'g-grid' : 'g-base'} x1={p.l} x2={w - p.r} y1={y(v)} y2={y(v)} />
          {(!everyOther || i % 2 === 0) && (
            <text className="g-txt" x={p.l - 8} y={y(v) + 4} textAnchor="end">
              {fmt(v)}
            </text>
          )}
        </g>
      ))}
      {points.length > 1 && (
        <>
          <path fill={`url(#${uid}-f)`} d={`${d} L${x(last.date).toFixed(1)} ${base} L${x(points[0].date).toFixed(1)} ${base} Z`} />
          <path className="g-glow" d={d} filter={`url(#${uid}-g)`} />
          <path className="g-line" d={d} />
        </>
      )}
      {sel && <line className="g-sel" x1={x(sel.date)} x2={x(sel.date)} y1={p.t} y2={base} />}
      {points.map((pt) => (pt === last || pt === rec || pt === sel || !dotR ? null : <circle key={pt.date} className="g-dot" cx={x(pt.date)} cy={y(pt.v)} r={dotR} />))}
      {/* ultimo valore: punto luminoso */}
      {last !== rec && (
        <>
          <circle className="g-halo" cx={x(last.date)} cy={y(last.v)} r={11} />
          <circle className="g-dot g-last" cx={x(last.date)} cy={y(last.v)} r={5} />
        </>
      )}
      {/* record: oro chiaro, con l'etichetta (mai solo colore) */}
      {rec && (
        <>
          <circle className="g-halo rec" cx={x(rec.date)} cy={y(rec.v)} r={12} />
          <circle className="g-dot rec" cx={x(rec.date)} cy={y(rec.v)} r={5.5} />
          {rec !== sel && (
            <text className="g-rec-t" x={Math.min(Math.max(x(rec.date), p.l + 22), w - p.r - 22)} y={Math.max(y(rec.v) - 12, 9)} textAnchor="middle">
              RECORD
            </text>
          )}
        </>
      )}
      {sel && <Tip x={x(sel.date)} y={y(sel.v)} value={`${format(sel)}${sel === rec ? ' · record' : ''}`} date={tipLabel(sel.date)} w={w} p={p} />}
      {onSelect && (
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
      {labels.map((i) => (
        <text
          key={i}
          className="g-txt"
          x={x(points[i].date)}
          y={h - 7}
          textAnchor={labels.length > 1 && i === 0 ? 'start' : labels.length > 1 && i === points.length - 1 ? 'end' : 'middle'}
        >
          {label(points[i].date)}
        </text>
      ))}
    </svg>
  );
}

/** Fumetto sopra il punto scelto: punto evidenziato, valore in oro e data. Largo quanto il testo, resta dentro il grafico. */
function Tip({ x, y, value, date, w, p }: { x: number; y: number; value: string; date: string; w: number; p: { l: number; r: number } }) {
  // circa 7 px a carattere a 12 px di corpo, più i margini
  const tw = Math.min(w - p.l - p.r, Math.max(84, 20 + 7 * Math.max(value.length, date.length)));
  const tx = Math.max(p.l, Math.min(w - p.r - tw, x - tw / 2));
  // sopra il punto se c'è spazio, altrimenti sotto
  const ty = y - TIP_H - 12 >= 0 ? y - TIP_H - 12 : y + 12;
  return (
    <g className="g-tip" aria-hidden="true">
      <circle className="g-halo" cx={x} cy={y} r={11} />
      <circle className="g-dot g-last" cx={x} cy={y} r={5.5} />
      <rect x={tx} y={ty} width={tw} height={TIP_H} rx={8} />
      <text className="v" x={tx + 10} y={ty + 16}>
        {value}
      </text>
      <text className="s" x={tx + 10} y={ty + 31}>
        {date}
      </text>
    </g>
  );
}
