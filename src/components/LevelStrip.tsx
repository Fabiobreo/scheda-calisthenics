import { Link } from 'react-router-dom';
import { useLevel, useProfile } from '../data/hooks';
import { AXES } from '../features/home/levelView';
import { Avatar } from './Avatar';
import { Pentagon } from './Pentagon';

/**
 * Riepilogo compatto (ticket 12): avatar, nome, livello e mini-pentagono in cima a Scheda, Grafici ed Esercizi.
 * Porta alla Home. Usa la stessa cache della Home (nessuna richiesta in più); l'altezza è fissa, quindi il contenuto
 * non si sposta quando i dati arrivano.
 */
export function LevelStrip() {
  const { summary, isLoading } = useLevel();
  const name = useProfile().data?.displayName;
  const elite = summary.zone === 'elite';
  const byId = new Map(summary.categories.map((c) => [c.categoryId, c.value]));
  const label = isLoading ? 'Livello' : `Livello ${summary.level}${elite ? ' ELITE' : ''}`;
  return (
    <Link className="strip" to="/" aria-label={`${label}: apri la Home`}>
      <Avatar name={name} avatar={summary.avatar} elite={elite} small />
      <span className="strip-txt">
        <span className="strip-name">{name || 'Il tuo livello'}</span>
        <span className="strip-level">
          Livello <b className={elite ? 'elite' : undefined}>{isLoading ? '–' : summary.level}</b>
          {elite && <span className="tag-elite">ELITE</span>}
        </span>
      </span>
      <Pentagon mini axes={AXES.map((id) => ({ label: id, value: byId.get(id) ?? 0 }))} />
    </Link>
  );
}
