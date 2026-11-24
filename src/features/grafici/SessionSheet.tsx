import { useEffect, useRef } from 'react';
import { TypeChip } from '../../components/ui';
import { DIFFICULTY_LABEL, type Entry } from '../../data/types';
import { longDate } from '../../lib/dates';
import { fmtSet } from '../../lib/format';

/**
 * Dettaglio di una sessione (ticket 36): le registrazioni di un esercizio in un giorno, con le serie una per riga,
 * tipo, difficoltà e nota. Si apre toccando una riga di "Ultime 5 sessioni"; "Modifica" porta al registratore, dove
 * si corregge o si elimina. Senza `onEdit` (il trainer che guarda un atleta) è in sola lettura.
 */
export function SessionSheet({
  name,
  date,
  entries,
  value,
  record,
  onEdit,
  onClose,
}: {
  /** nome dell'esercizio */
  name: string;
  date: string;
  /** le registrazioni dell'esercizio in quel giorno: di solito una */
  entries: Entry[];
  /** valore della metrica scelta, già scritto ("Peso 20 kg") */
  value: string;
  /** è la sessione record della metrica scelta */
  record: boolean;
  onEdit?: (e: Entry) => void;
  onClose: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // tastiera: Esc chiude; il fuoco entra nel pannello e, alla chiusura, torna dove era
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    title.current?.focus();
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
      back?.focus?.();
    };
  }, []);

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet gr-sheet" role="dialog" aria-modal="true" aria-labelledby="gr-sheet-title">
        <div className="card-h">
          <h2 id="gr-sheet-title" ref={title} tabIndex={-1}>
            {longDate(date)}
          </h2>
          <button type="button" className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <p className="gr-sheet-sub">
          {name} · <b>{value}</b>
          {record && <span className="gr-tag">Record</span>}
        </p>
        {entries.map((e) => (
          <section key={e.id} className="gr-entry">
            <ol className="gr-sets" aria-label="Serie">
              {e.sets.map((s, i) => (
                <li key={i}>
                  <span>Serie {i + 1}</span>
                  <b>{fmtSet(s)}</b>
                </li>
              ))}
            </ol>
            <div className="chips">
              <TypeChip type={e.type} />
              {e.kind === 'attempt' && <span className="chip mut">Tentativo</span>}
              {e.difficulty && <span className="chip mut">{DIFFICULTY_LABEL[e.difficulty]}</span>}
            </div>
            {e.note && <p className="gr-note">Nota: {e.note}</p>}
            {onEdit && (
              <button type="button" className="btn ghost gr-edit" onClick={() => onEdit(e)}>
                Modifica
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
