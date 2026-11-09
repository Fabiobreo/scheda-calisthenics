import { useId } from 'react';
import { bolts, figure, type AvatarBody } from '../lib/avatarFigure';
import type { AvatarStage } from '../lib/levels';

/**
 * Avatar del livello (ticket 11). Con la figura scelta (uomo o donna): mezzo busto sempre nella stessa posa, il fisico
 * cambia ogni 10 livelli (20 stadi); un'aura cresce verso il livello 100 (appena percepibile prima, piena a 100) e da 101
 * compaiono le scosse elettriche, piene a 200. Senza scelta: cerchio con l'iniziale. Decorativo: il livello è sempre
 * scritto accanto. Con "riduci movimento" le scosse restano ferme.
 */
export function Avatar({
  name,
  avatar,
  elite,
  small,
  body,
}: {
  name: string | null | undefined;
  avatar: AvatarStage;
  elite: boolean;
  small?: boolean;
  body?: AvatarBody | null;
}) {
  const cls = `avatar${small ? ' sm' : ''}${elite ? ' elite' : ''}${body ? ' fig' : ''}`;
  if (!body)
    return (
      <div className={cls} style={{ ['--aura' as string]: avatar.aura }} aria-hidden="true" data-stage={avatar.stage}>
        <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>
      </div>
    );
  // l'aura si nota davvero solo avvicinandosi a 100: a metà strada è un quarto
  const aura = avatar.aura * avatar.aura;
  return (
    <div className={cls} style={{ ['--aura' as string]: aura, ['--shocks' as string]: avatar.shocks }} aria-hidden="true" data-stage={avatar.stage}>
      <Figure body={body} avatar={avatar} aura={aura} small={small} />
    </div>
  );
}

function Figure({ body, avatar, aura, small }: { body: AvatarBody; avatar: AvatarStage; aura: number; small?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const f = figure(body, avatar.stage);
  const sparks = bolts(avatar.shocks);
  return (
    <svg viewBox="0 0 100 100" className="av-svg">
      <defs>
        <radialGradient id={`${uid}-a`} cx="50" cy="44" r="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="av-aura-in" />
          <stop offset="1" className="av-aura-out" />
        </radialGradient>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="av-body-top" />
          <stop offset="1" className="av-body-bottom" />
        </linearGradient>
        {!small && (
          <filter id={`${uid}-g`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        {!small && (
          <filter id={`${uid}-h`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        )}
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${uid}-a)`} opacity={aura} />
      {/* inquadratura: la figura riempie il cerchio, il bordo basso taglia ai fianchi */}
      <g transform="translate(50 40) scale(1.16) translate(-50 -40)">
        {/* aura attorno al corpo: il contorno sfocato, sempre più intenso verso il livello 100 */}
        {!small && aura > 0.02 && (
          <g className="av-aura" filter={`url(#${uid}-h)`}>
            <path d={f.outline} />
            <circle cx={f.head.cx} cy={f.head.cy} r={f.head.r} />
          </g>
        )}
        <g className="av-body" fill={`url(#${uid}-b)`}>
          {f.bun && <circle cx={f.bun.cx} cy={f.bun.cy} r={f.bun.r} />}
          <path d={f.body} />
          <circle cx={f.head.cx} cy={f.head.cy} r={f.head.r} />
        </g>
        {!small && (
          <g className="av-lines">
            {f.lines.map((l, i) => (
              <path key={i} d={l.d} opacity={l.o * 0.75} />
            ))}
          </g>
        )}
      </g>
      {sparks.length > 0 && (
        <g className="av-bolts" filter={small ? undefined : `url(#${uid}-g)`}>
          {sparks.map((d, i) => (
            <path key={i} d={d} style={{ animationDelay: `${(i * 0.37) % 1.6}s` }} />
          ))}
        </g>
      )}
    </svg>
  );
}
