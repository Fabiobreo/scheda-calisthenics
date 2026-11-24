import { useEffect, useId, useRef, useState } from 'react';
import { pentagonText, type PentagonScale } from '../features/livello/levelView';

const W = 220;
const H = 188;
const CX = 110;
const CY = 104;
const R = 68;
/** Livelli sotto il contorno, al massimo: Base…Titano quando il contorno è Leggenda. */
const RINGS = 5;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Valori che scorrono verso il bersaglio quando cambia. All'apertura partono da zero (`fromZero`: l'area cresce dal
 * centro) oppure sono già al loro posto (la griglia).
 */
function useAnimated(target: number[], fromZero: boolean): number[] {
  const [shown, setShown] = useState(() => (reducedMotion() || !fromZero ? target : target.map(() => 0)));
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const key = target.join(',');
  useEffect(() => {
    const to = key.split(',').map(Number);
    const from = shownRef.current;
    if (reducedMotion() || from.length !== to.length) return setShown(to);
    if (from.every((v, i) => v === to[i])) return;
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
 * Pentagono del livello (ticket 34), SVG senza librerie. La scala la decide `pentagonScale`: il contorno è la fine
 * del livello più alto raggiunto tra le 5 categorie, gli anelli interni le fini dei livelli sotto, ogni asse in
 * scala sui punti della sua categoria. Quando una categoria sale di livello la scala cambia: area e anelli scorrono
 * verso il centro e il contorno pulsa, cioè il pentagono "si allarga". Accanto a ogni vertice la sigla della
 * categoria e la % dentro il suo livello; nomi e valori per intero nel testo alternativo.
 */
export function Pentagon({ scale }: { scale: PentagonScale }) {
  const { axes } = scale;
  const n = axes.length;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const values = useAnimated(
    axes.map((a) => a.at),
    true,
  );
  // sempre RINGS anelli per asse: quelli dei livelli dal contorno in su stanno sul contorno (1) e non si disegnano
  const ringAt = useAnimated(
    Array.from({ length: RINGS }, (_, k) => axes.map((a) => a.rings[k] ?? 1)).flat(),
    false,
  );
  const pts = values.map((v, i) => at(i, n, v));
  const rim = poly(axes.map((_, i) => at(i, n, 1)));

  return (
    <svg className="penta" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pentagonText(scale)}>
      <defs>
        <radialGradient id={`${uid}-a`} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0" className="penta-area-in" />
          <stop offset="1" className="penta-area-out" />
        </radialGradient>
        <filter id={`${uid}-g`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <polygon className="penta-back" points={rim} />
      {Array.from({ length: RINGS }, (_, k) => {
        const ds = axes.map((_, i) => ringAt[k * n + i]);
        if (ds.every((d) => d > 0.995)) return null;
        return <polygon key={k} className="penta-grid" points={poly(ds.map((d, i) => at(i, n, Math.min(1, d))))} />;
      })}
      {axes.map((_, i) => {
        const [x, y] = at(i, n, 1);
        return <line key={i} className="penta-grid" x1={CX} y1={CY} x2={x} y2={y} />;
      })}
      {/* contorno: la chiave sul livello lo fa pulsare quando la scala cambia */}
      <polygon key={scale.band} className="penta-rim" points={rim} />

      <polygon className="penta-area" points={poly(pts)} fill={`url(#${uid}-a)`} />
      <polygon className="penta-edge penta-glow" points={poly(pts)} filter={`url(#${uid}-g)`} />
      <polygon className="penta-edge" points={poly(pts)} />
      {pts.map(([x, y], i) => (
        <circle key={i} className="penta-dot" cx={x} cy={y} r={3.4} />
      ))}

      {axes.map((a, i) => {
        const [vx, vy] = at(i, n, 1);
        const dx = vx - CX;
        const pct = `${a.percent}%`;
        // in alto e in basso: sigla e % su una riga; ai lati: su due righe, verso l'esterno
        if (vy < CY - R * 0.6 || vy > CY + R * 0.5) {
          const top = vy < CY;
          return (
            <text key={a.id} className="penta-label" x={vx + Math.sign(Math.round(dx)) * 6} y={top ? vy - 9 : vy + 18} textAnchor="middle" aria-hidden="true">
              {a.code}
              <tspan className="penta-val" dx="5">
                {pct}
              </tspan>
            </text>
          );
        }
        const x = vx + Math.sign(dx) * 7;
        return (
          <text key={a.id} className="penta-label" x={x} y={vy - 3} textAnchor={dx > 0 ? 'start' : 'end'} aria-hidden="true">
            {a.code}
            <tspan className="penta-val" x={x} dy="15">
              {pct}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
