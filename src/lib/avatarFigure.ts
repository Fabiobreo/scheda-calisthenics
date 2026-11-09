/**
 * Figura dell'avatar (ticket 11): mezzo busto frontale, sempre nella stessa posa e inquadratura, disegnato in codice.
 * Il fisico cambia con lo stadio (0–19, uno ogni 10 livelli): spalle, braccia e dorsali crescono, il punto vita resta
 * stretto (forma a V), e la definizione dei muscoli compare un poco alla volta. Niente caricature: lo stadio 0 è una
 * persona normale, il 19 un atleta d'élite.
 *
 * Coordinate in un quadrato 100×100 (centro x = 50, il bordo basso taglia ai fianchi). Funzioni pure, testate.
 */

export type AvatarBody = 'm' | 'f';

export const AVATAR_BODIES: { v: AvatarBody; l: string }[] = [
  { v: 'm', l: 'Uomo' },
  { v: 'f', l: 'Donna' },
];

export const isAvatarBody = (v: unknown): v is AvatarBody => v === 'm' || v === 'f';

const STAGES = 20;
const CX = 50;

interface Shape {
  /** raggio della testa */
  head: number;
  /** mezza larghezza del collo */
  neck: number;
  /** quanto i trapezi alzano la linea collo–spalla */
  trap: number;
  /** mezzo spessore del braccio al bicipite */
  arm: number;
  /** mezza larghezza del torace sotto l'ascella */
  chest: number;
  /** mezza larghezza ai dorsali (la parte più larga del tronco) */
  lat: number;
  /** mezza larghezza in vita */
  waist: number;
  /** mezza larghezza ai fianchi (bordo basso) */
  hip: number;
}

/** Da principiante (stadio 0) ad atleta d'élite (stadio 19). */
const RANGE: Record<AvatarBody, [Shape, Shape]> = {
  m: [
    { head: 8.6, neck: 5.4, trap: 0.5, arm: 4.1, chest: 14.6, lat: 15.2, waist: 14.6, hip: 15.6 },
    { head: 8.4, neck: 7.4, trap: 4.2, arm: 6.4, chest: 17.4, lat: 20.6, waist: 13.4, hip: 15.2 },
  ],
  f: [
    { head: 8.3, neck: 4.6, trap: 0.3, arm: 3.6, chest: 13.2, lat: 13.4, waist: 12.4, hip: 16.4 },
    { head: 8.2, neck: 5.6, trap: 2.4, arm: 5.0, chest: 14.8, lat: 16.6, waist: 11.6, hip: 16.2 },
  ],
};

/** 0–1 lungo i 20 stadi, con uno stadio fuori scala riportato nei limiti. */
export const stageT = (stage: number) => Math.max(0, Math.min(STAGES - 1, Math.round(stage))) / (STAGES - 1);

export function shapeAt(body: AvatarBody, stage: number): Shape {
  const t = stageT(stage);
  // i primi stadi cambiano di più (i progressi del principiante si vedono subito), poi si affina
  const e = 1 - Math.pow(1 - t, 1.4);
  const [a, b] = RANGE[body];
  const out = {} as Shape;
  for (const k of Object.keys(a) as (keyof Shape)[]) out[k] = a[k] + (b[k] - a[k]) * e;
  return out;
}

type Pt = [number, number];

/** Curva morbida (Catmull-Rom → Bézier) che passa per tutti i punti. */
function smooth(pts: Pt[]): string {
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

export interface Figure {
  /** testa (cerchio) */
  head: { cx: number; cy: number; r: number };
  /** capelli raccolti (solo donna): cerchio dietro la testa */
  bun: { cx: number; cy: number; r: number } | null;
  /** contorno di collo, spalle, braccia e tronco, chiuso sul bordo basso */
  body: string;
  /** solo il contorno esterno (senza lo spazio tra braccia e tronco): serve all'aura */
  outline: string;
  /** linee dei muscoli: compaiono con lo stadio (opacità 0–1 per ciascuna) */
  lines: { d: string; o: number }[];
}

/** Disegno completo della figura per un corpo e uno stadio. */
export function figure(body: AvatarBody, stage: number): Figure {
  const s = shapeAt(body, stage);
  const t = stageT(stage);
  const headY = 19;
  const neckTop = headY + s.head - 1.5;
  const shoulderY = 36 - s.trap * 0.35;

  // braccio: la linea centrale scende un poco verso l'esterno; i dorsali larghi spingono fuori le braccia
  const armTop = Math.max(s.chest + s.arm * 0.6, s.lat + s.arm + 2.6);
  const cx = (y: number) => armTop + (y - 44) * 0.07;
  // spessore lungo il braccio: spalla, bicipite, gomito, avambraccio, polso, mano
  const along: [number, number][] = [
    [40, 1.15],
    [50, 1],
    [63, 0.74],
    [74, 0.86],
    [88, 0.6],
    [96, 0.7],
  ];
  const outer: Pt[] = along.map(([y, k]) => [cx(y) + s.arm * k, y]);
  const inner: Pt[] = along
    .slice(1)
    .reverse()
    .map(([y, k]) => [cx(y) - s.arm * k, y]);
  const armpit: Pt = [s.chest, 47];

  // metà destra dall'alto in basso, poi la stessa a specchio
  const right: Pt[] = [
    [s.neck, neckTop],
    [s.neck + 0.4, neckTop + 4],
    [s.neck + 2 + s.trap * 0.5, shoulderY - s.trap * 0.3],
    [armTop - s.arm * 0.2, shoulderY + 0.6],
    ...outer,
    [cx(100) + s.arm * 0.7, 100],
  ];
  const back: Pt[] = [
    [cx(100) - s.arm * 0.7, 100],
    ...inner,
    armpit,
    [s.lat, 57],
    [s.waist, 77],
    [s.hip, 100],
  ];
  const mirror = (p: Pt): Pt => [CX - p[0], p[1]];
  const toAbs = (p: Pt): Pt => [CX + p[0], p[1]];
  const rightAbs = right.map(toAbs);
  const backAbs = back.map(toAbs);
  // contorno: braccio destro (fuori → mano), poi dentro il braccio, il fianco destro fino al bordo basso;
  // poi il fianco sinistro risalendo, l'interno e l'esterno del braccio sinistro fino al collo
  const torsoR = smooth(backAbs);
  const armR = smooth(rightAbs);
  const torsoL = smooth([...back].reverse().map(mirror).map((p) => [p[0], p[1]] as Pt));
  const armL = smooth([...right].reverse().map(mirror));
  const bodyPath = [
    armR,
    `L${backAbs[0][0].toFixed(2)} 100`,
    torsoR.replace(/^M[^C]+/, ''),
    `L${(CX - s.hip).toFixed(2)} 100`,
    torsoL.replace(/^M[^C]+/, ''),
    `L${(CX - cx(100) - s.arm * 0.7).toFixed(2)} 100`,
    armL.replace(/^M[^C]+/, ''),
    'Z',
  ].join(' ');

  const outline = [armR, `L${(CX - cx(100) - s.arm * 0.7).toFixed(2)} 100`, armL.replace(/^M[^C]+/, ''), 'Z'].join(' ');

  // linee dei muscoli: ognuna compare da uno stadio in poi e si fa più netta
  const from = (start: number) => Math.max(0, Math.min(1, (t - start) / 0.35));
  const pecY = 51 + (body === 'f' ? 1.5 : 0);
  const lines: { d: string; o: number }[] = [];
  for (const sgn of [1, -1]) {
    const x = (dx: number) => CX + sgn * dx;
    // clavicole: ci sono sempre, appena accennate
    lines.push({ d: smooth([[x(1.6), neckTop + 5.2], [x(s.neck + 3), neckTop + 5.6], [x(armTop - s.arm * 0.8), shoulderY + 1.4]]), o: 0.35 + 0.4 * t });
    // uomo: bordo basso dei pettorali, dallo sterno verso l'ascella; donna: linea morbida sotto il seno
    if (body === 'm') lines.push({ d: smooth([[x(0.8), 45], [x(s.chest * 0.5), pecY + 0.6], [x(s.chest - 1.2), 46.5]]), o: from(0.05) });
    else lines.push({ d: smooth([[x(2.2), 50], [x(s.chest * 0.42), pecY + 1.2], [x(s.chest - 2.2), 49]]), o: 0.3 + 0.3 * t });
    // deltoide: separazione dal braccio
    lines.push({ d: smooth([[x(armTop - s.arm * 0.9), shoulderY + 2], [x(armTop - s.arm * 0.75), 44], [x(armTop - s.arm * 0.2), 49]]), o: from(0.2) });
    // bicipite
    lines.push({ d: smooth([[x(cx(52) - s.arm * 0.2), 50], [x(cx(56) + s.arm * 0.1), 57], [x(cx(61)), 61]]), o: from(0.4) * 0.8 });
    // obliqui verso il basso (la "V")
    lines.push({ d: smooth([[x(s.waist - 2.5), 79], [x(s.waist * 0.6), 90], [x(3), 99]]), o: from(0.55) });
  }
  // linea dello sterno e degli addominali
  if (body === 'm') lines.push({ d: `M${CX} 43 L${CX} 52`, o: from(0.15) * 0.8 });
  lines.push({ d: `M${CX} 56 L${CX} 92`, o: from(0.3) });
  for (const [i, y] of [61, 68, 75].entries()) {
    const w = 5.4 - i * 0.3;
    lines.push({ d: smooth([[CX - w, y + 0.6], [CX, y], [CX + w, y + 0.6]]), o: from(0.35 + i * 0.1) * (body === 'f' ? 0.7 : 0.9) });
  }

  return {
    head: { cx: CX, cy: headY, r: s.head },
    bun: body === 'f' ? { cx: CX, cy: headY - s.head - 1.2, r: 4.2 } : null,
    body: bodyPath,
    outline,
    lines: lines.filter((l) => l.o > 0.02),
  };
}

/**
 * Scosse elettriche (ticket 11): saette fisse attorno alla figura, frastagliate e con un ramo; ne compaiono di più al
 * crescere dell'intensità (0–1), tutte a 1.
 */
export function bolts(intensity: number): string[] {
  const n = Math.round(Math.max(0, Math.min(1, intensity)) * BOLT_SEEDS.length);
  return BOLT_SEEDS.slice(0, n).map(([x, y, a, len], k) => {
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    const steps = 6;
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const d = (len * i) / steps;
      // scarto laterale alternato e irregolare (fisso per ogni saetta: niente tremolio da un disegno all'altro)
      const off = i && i < steps ? (i % 2 ? 1 : -1) * (1.2 + ((k * 7 + i * 3) % 5) * 0.45) : 0;
      pts.push([x + Math.cos(a) * d + nx * off, y + Math.sin(a) * d + ny * off]);
    }
    const p = (q: Pt) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    // ramo che parte dal terzo punto
    const b0 = pts[3];
    const ba = a + (k % 2 ? 0.7 : -0.7);
    const b1: Pt = [b0[0] + Math.cos(ba) * len * 0.3, b0[1] + Math.sin(ba) * len * 0.3];
    return 'M' + pts.map(p).join(' L') + ` M${p(b0)} L${p(b1)}`;
  });
}

/** [x, y, direzione in radianti, lunghezza]: partono dal bordo della figura e vanno verso l'esterno. */
const BOLT_SEEDS: [number, number, number, number][] = [
  [78, 42, -0.55, 16],
  [22, 46, Math.PI + 0.45, 16],
  [58, 9, -1.15, 13],
  [42, 9, Math.PI + 1.15, 13],
  [84, 74, 0.1, 13],
  [16, 70, Math.PI - 0.15, 13],
  [70, 26, -0.35, 12],
  [30, 28, Math.PI + 0.35, 12],
];
