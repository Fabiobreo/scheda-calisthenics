import type { AvatarStage } from '../lib/levels';

/**
 * Avatar del livello. Segnaposto finché non arrivano le illustrazioni (ticket 11): cerchio con l'iniziale, alone che
 * cresce verso il livello 100 e diventa ambra in zona ELITE. Decorativo: il livello è sempre scritto accanto.
 */
export function Avatar({ name, avatar, elite, small }: { name: string | null | undefined; avatar: AvatarStage; elite: boolean; small?: boolean }) {
  return (
    <div
      className={`avatar${small ? ' sm' : ''}${elite ? ' elite' : ''}`}
      style={{ ['--aura' as string]: avatar.aura }}
      aria-hidden="true"
      data-stage={avatar.stage}
    >
      <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}
