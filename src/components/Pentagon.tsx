import { useEffect, useId, useRef, useState } from 'react';
import { radial, BASE_RING } from '../features/home/levelView';

export interface PentagonAxis {
  /** Nome dell'asse; uno spazio va a capo ("Fondamentali spinta" → due righe). */
  label: string;
  /** 0–200 */
  value: number;
}

const W = 380;
const H = 300;
const CX = 190;
const CY = 158;
const R = 104;
const LH = 14;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Valori che crescono verso il bersaglio (dallo zero all'apertura, dal valore di prima quando cambia). */
function useAnimated(target: number[]): number[] {
  const [shown, setShown] = useState(() => (reducedMotion() ? target : target.map(() => 0)));
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const key = target.join(',');
  useEffect(() => {
    const to = key.split(',').map(Number);
    if (reducedMotion()) return setShown(to);
    const from = shownRef.current.length === to.length ? shownRef.current : to.map(() => 0);
    const start = performance.now();
    const ms = 700;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(to.map((v, i) => from[i] + (v - from[i]) * e));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return shown;
}

/** Punto sull'asse `i` (di `n`, il primo in alto, senso orario) a distanza `d` (0–1 del raggio). */
function at(i: number, n: number, d: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + Math.cos(a) * R * d, CY + Math.sin(a) * R * d];
}

const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Grafico a pentagono (ticket 10), SVG senza librerie. Scala 0–200 a due tratti con l'anello del 100 in evidenza;
 * area e punti nel colore base, punti e lati verso una categoria in zona ELITE nel colore elite.
 * I valori sono anche nel testo alternativo e nelle etichette.
 */
export function Pentagon({ axes, title = 'Livello per categoria', mini }: { axes: PentagonAxis[]; title?: string; /** piccolo, senza etichette né griglia fine, decorativo */ mini?: boolean }) {
  const n = axes.length;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const values = useAnimated(axes.map((a) => a.value));
  const pts = values.map((v, i) => at(i, n, radial(v)));
  const elite = axes.map((a) => a.value > 100);
  const ring = (d: number) => poly(axes.map((_, i) => at(i, n, d)));
  const summary = `${title}: ${axes.map((a) => `${a.label} ${a.value} su ${a.value > 100 ? 200 : 100}${a.value > 100 ? ', ELITE' : ''}`).join('; ')}.`;

  return (
    <svg
      className={mini ? 'penta penta-mini' : 'penta'}
      viewBox={mini ? `${CX - R - 8} ${CY - R - 8} ${2 * R + 16} ${2 * R + 16}` : `0 0 ${W} ${H}`}
      {...(mini ? { 'aria-hidden': true } : { role: 'img', 'aria-label': summary })}
    >
      {/* griglia: anelli ogni 25 fino al 100, poi 150 e 200 nella zona ELITE */}
      {!mini &&
        [0.25, 0.5, 0.75].map((f) => <polygon key={f} className="penta-grid" points={ring(BASE_RING * f)} />)}
      <path className="penta-elite-band" d={`M${ring(1)}Z M${ring(BASE_RING)}Z`} fillRule="evenodd" />
      {!mini && <polygon className="penta-grid" points={ring(radial(150))} />}
      <polygon className="penta-grid" points={ring(1)} />
      <polygon className="penta-100" points={ring(BASE_RING)} />
      {axes.map((_, i) => {
        const [x, y] = at(i, n, 1);
        return <line key={i} className="penta-grid" x1={CX} y1={CY} x2={x} y2={y} />;
      })}

      <polygon className="penta-area" points={poly(pts)} />
      {/* lati uno per uno: verso un vertice ELITE il colore sfuma nel colore elite */}
      <defs>
        {pts.map((p, i) => {
          const j = (i + 1) % n;
          if (!elite[i] && !elite[j]) return null;
          const q = pts[j];
          return (
            <linearGradient key={i} id={`${uid}-e${i}`} gradientUnits="userSpaceOnUse" x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]}>
              <stop offset="0" className={elite[i] ? 'penta-stop-elite' : 'penta-stop-base'} />
              <stop offset="1" className={elite[j] ? 'penta-stop-elite' : 'penta-stop-base'} />
            </linearGradient>
          );
        })}
      </defs>
      {pts.map((p, i) => {
        const j = (i + 1) % n;
        const q = pts[j];
        const grad = elite[i] || elite[j];
        return (
          <line
            key={i}
            className={grad ? 'penta-edge hot' : 'penta-edge'}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke={grad ? `url(#${uid}-e${i})` : undefined}
          />
        );
      })}
      {pts.map(([x, y], i) => (
        <circle key={i} className={elite[i] ? 'penta-dot elite' : 'penta-dot'} cx={x} cy={y} r={mini ? 9 : elite[i] ? 5.5 : 4.5} />
      ))}

      {!mini && axes.map((a, i) => {
        const [lx, ly] = at(i, n, 1 + 14 / R);
        const dx = lx - CX;
        const anchor = Math.abs(dx) < 10 ? 'middle' : dx > 0 ? 'start' : 'end';
        const lines = a.label.split(' ');
        const count = lines.length + 1;
        // sopra: il blocco finisce sul vertice; sotto: comincia dal vertice; ai lati: centrato
        const top = ly < CY - R * 0.6 ? ly - (count - 1) * LH - 2 : ly > CY + R * 0.5 ? ly + 11 : ly - ((count - 1) * LH) / 2 + 4;
        return (
          <text key={i} className="penta-label" x={lx} y={top} textAnchor={anchor} aria-hidden="true">
            {lines.map((l, k) => (
              <tspan key={k} x={lx} dy={k === 0 ? 0 : LH}>
                {l}
              </tspan>
            ))}
            <tspan x={lx} dy={LH} className={a.value > 100 ? 'penta-val elite' : 'penta-val'}>
              {a.value}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
