import { DIFFICULTY_LABEL, type Entry } from '../data/types';
import { shortDate, todayStr } from '../lib/dates';
import { fmtSets } from '../lib/format';
import { TypeChip } from './ui';

/**
 * Una registrazione passata (o programmata): serie, tipo, tentativo, record, difficoltà e nota.
 * Con `onOpen` c'è "Apri", che porta al registratore dove si modifica o si elimina; senza (trainer) è in sola lettura.
 */
export function EntryItem({
  entry: e,
  name,
  record,
  showDate,
  onOpen,
  noteLabel = 'Nota',
}: {
  entry: Entry;
  /** nome dell'esercizio; senza, la riga è di una sessione dello stesso esercizio e mostra la data */
  name?: string;
  record: boolean;
  showDate?: boolean;
  onOpen?: () => void;
  noteLabel?: string;
}) {
  return (
    <div className="entry">
      <div>
        {name !== undefined && <b>{name}</b>}
        <div className="pmeta">
          {showDate && `${shortDate(e.date)} · `}
          {fmtSets(e.sets)}
          {e.difficulty && ` · ${DIFFICULTY_LABEL[e.difficulty]}`}
        </div>
        {e.note && (
          <div className="pmeta">
            {noteLabel}: {e.note}
          </div>
        )}
        <div className="chips">
          <TypeChip type={e.type} />
          {e.date > todayStr() && <span className="chip mut">In programma</span>}
          {e.kind === 'attempt' && <span className="chip mut">Tentativo</span>}
          {record && <span className="chip pr">★ Record</span>}
        </div>
      </div>
      {onOpen && (
        <div className="pact">
          <button className="btn small ghost" onClick={onOpen} aria-label={`Apri ${name ?? 'la sessione'} del ${shortDate(e.date)}`}>
            Apri
          </button>
        </div>
      )}
    </div>
  );
}
