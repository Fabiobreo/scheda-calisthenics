import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Foglio che sale dal basso (ticket 39, per i fogli della Home: novità, record di un amico, allenamento condiviso,
 * segnalazione). Stesse regole degli altri fogli dell'app: Esc o un tocco fuori lo chiudono, il fuoco entra sul
 * titolo e alla chiusura torna dov'era, la pagina sotto non scorre.
 */
export function Sheet({ title, sub, className, onClose, children }: { title: string; sub?: ReactNode; className?: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const head = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    head.current?.focus();
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
      <div className={`sheet${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="card-h">
          <h2 id={id} ref={head} tabIndex={-1}>
            {title}
          </h2>
          <button type="button" className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        {sub && <p className="sheet-sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}
