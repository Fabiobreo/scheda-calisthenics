import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Seg } from '../../components/ui';
import type { LevelRow } from '../../data/hooks';
import type { LevelSummary } from '../../lib/levels';
import { CARDS, SIGLA, categoryName, ladder, type LadderScope } from './levelView';

const pts = (n: number) => n.toLocaleString('it-IT');

/**
 * Foglio "I livelli": i livelli (Base…Leggenda) con le fasce di punti, per il complessivo e per ogni categoria
 * (le fasce cambiano da categoria a categoria; le skill partono da Intermedio). Segna i livelli superati e quello attuale, e dice quanti punti mancano
 * al prossimo. I numeri sono quelli del motore: qui si leggono soltanto.
 */
export function LevelsSheet({ summary, onClose }: { summary: LevelSummary<LevelRow>; onClose: () => void }) {
  const [scope, setScope] = useState<LadderScope>('complessivo');
  const cat = scope === 'complessivo' ? null : summary.categories.find((c) => c.categoryId === scope)!;
  const pos = cat ?? summary;
  const l = ladder(scope, pos.band, cat ? cat.points : summary.total);
  const options = [{ v: 'complessivo' as LadderScope, l: 'Totale' }, ...CARDS.map((id) => ({ v: id as LadderScope, l: SIGLA[id] }))];

  return (
    <Sheet title="I livelli" sub="Da Base a Leggenda. Le fasce di punti cambiano da categoria a categoria: le skill partono da Intermedio." className="lvl-sheet" onClose={onClose}>
      <div className="lvl-scope">
        <Seg label="Scala" value={scope} options={options} onChange={setScope} />
      </div>
      <p className="lvl-now">
        <b>{scope === 'complessivo' ? 'Livello complessivo' : categoryName(scope)}</b>: {pos.name} {pos.percent}% · {pts(l.points)} punti
        <br />
        {l.next ? (
          <>
            Mancano <b>{pts(l.next.missing)}</b> punti per {l.next.name}
          </>
        ) : (
          'Hai raggiunto il livello più alto'
        )}
      </p>
      <ol className="lvl-list">
        {l.rows.map((r) => (
          <li key={r.id} className={`lvl-row ${r.state}`} aria-current={r.state === 'current' ? 'step' : undefined}>
            <span className="lvl-mark" aria-hidden="true">
              {r.state === 'done' ? '✓' : r.state === 'current' ? '●' : ''}
            </span>
            <span className="lvl-name">
              {r.name}
              {r.state === 'current' && <small> · sei qui</small>}
            </span>
            <span className="lvl-range">
              {pts(r.from)}–{pts(r.to)} punti
            </span>
            {r.state === 'current' && (
              <span className="zbar thin" aria-hidden="true">
                {pos.percent > 0 && <i style={{ width: `${pos.percent}%` }} />}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
