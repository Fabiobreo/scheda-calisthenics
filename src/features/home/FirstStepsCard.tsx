import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CardHead } from '../../components/ui';
import type { StepId, Steps } from './firstSteps';

/**
 * "Per iniziare" (ticket 28, audit C6): la checklist del primo accesso in Home. Ogni passo ha il suo pulsante, la spunta
 * rimbalza quando un passo si compie, i blocchetti in alto dicono a che punto sei. Sparisce da sola a passi fatti;
 * "Più tardi" la nasconde su questo dispositivo.
 */
export function FirstSteps({ steps, onWeight, onRecord, onDismiss }: { steps: Steps; onWeight: () => void; onRecord: () => void; onDismiss: () => void }) {
  // passi compiuti mentre la card era a schermo: solo quelli fanno il rimbalzo
  const seen = useRef<Set<StepId> | null>(null);
  const fresh = new Set(seen.current ? steps.steps.filter((s) => s.done && !seen.current!.has(s.id)).map((s) => s.id) : []);
  useEffect(() => {
    seen.current = new Set(steps.steps.filter((s) => s.done).map((s) => s.id));
  });

  const action = (id: StepId) => {
    switch (id) {
      case 'peso':
        return <button type="button" className="btn small ghost" onClick={onWeight} aria-label="Inserisci il tuo peso">Inserisci</button>;
      case 'figura':
        return <Link className="btn small ghost" to="/account" aria-label="Scegli la figura dell'avatar">Scegli</Link>;
      case 'record':
        return <button type="button" className="btn small ghost" onClick={onRecord} aria-label="Aggiungi il primo record">Aggiungi</button>;
      case 'allenamento':
        return <Link className="btn small ghost" to="/scheda" aria-label="Vai alla Scheda">Scheda</Link>;
    }
  };

  return (
    <section className="card first-steps" aria-labelledby="fs-h">
      <CardHead title="Per iniziare" help="Quattro passi per far contare livello e allenamenti. Si spuntano da soli quando li fai.">
        <span className="fs-prog" role="img" aria-label={`${steps.done} di ${steps.total} passi fatti`}>
          <span className="fs-blocks" aria-hidden="true">
            {steps.steps.map((s) => (
              <i key={s.id} className={s.done ? 'on' : undefined} />
            ))}
          </span>
          <b aria-hidden="true">{steps.done}/{steps.total}</b>
        </span>
      </CardHead>
      <ol className="fs-list">
        {steps.steps.map((s) => (
          <li key={s.id} className={`${s.done ? 'done' : ''}${s.id === steps.next ? ' next' : ''}`.trim() || undefined}>
            <span className={`fs-check${s.done ? ' on' : ''}${fresh.has(s.id) ? ' check pop' : ''}`} aria-hidden="true">
              {s.done ? '✓' : ''}
            </span>
            <span className="fs-txt">
              <b>
                {s.title}
                {s.done && <span className="sr-only"> (fatto)</span>}
              </b>
              {s.hint && <small>{s.hint}</small>}
            </span>
            {!s.done && action(s.id)}
          </li>
        ))}
      </ol>
      <button type="button" className="link small fs-later" onClick={onDismiss}>
        Più tardi
      </button>
    </section>
  );
}
