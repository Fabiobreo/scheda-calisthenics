import type { BandId } from '../lib/levels';

/**
 * Busto dorato (ticket 34): per ora una sola immagine, uguale per tutti, al posto dell'avatar a 20 stadi. Prende già
 * il livello complessivo (`band`, anche come `data-band`): quando Michael deciderà come deve cambiare salendo di
 * livello basterà scegliere qui l'immagine. L'alone dorato è in CSS, l'immagine ha il fondo trasparente.
 * Decorativo: il livello è sempre scritto in testata.
 */
export function Bust({ band, small }: { band: BandId; small?: boolean }) {
  return (
    <span className={small ? 'bust sm' : 'bust'} data-band={band} aria-hidden="true">
      <img
        src="/avatar/busto-270.webp"
        srcSet="/avatar/busto-270.webp 270w, /avatar/busto-540.webp 540w"
        sizes={small ? '44px' : '(min-width: 1024px) 240px, 40vw'}
        width={270}
        height={280}
        alt=""
        decoding="async"
      />
    </span>
  );
}
