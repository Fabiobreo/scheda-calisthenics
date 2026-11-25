import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScope } from '../../app/session';
import { useToast } from '../../app/toast';
import { CardHead } from '../../components/ui';
import { useData, useLevel, useLinks, useProfile } from '../../data/hooks';
import { todayStr } from '../../lib/dates';
import { dismissKey, firstSteps, type StepId, type Steps } from './firstSteps';

const readDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/**
 * Primo accesso guidato (ticket 28), dal ticket 39 in cima alla Home: i passi dai dati che ci sono già, "Più tardi"
 * in `localStorage` per utente. Mai per un account in modalità trainer: la checklist è per chi si allena. Non
 * disegna niente finché non ha tutti i dati (niente card che compare e scompare) e quando i passi sono fatti.
 * `onRecord`: il pulsante del primo record (porta a Livello, dove si inserisce).
 */
export function FirstStepsGuide({ onRecord }: { onRecord: () => void }) {
  const { userId } = useScope();
  const level = useLevel();
  const profile = useProfile();
  const data = useData();
  const links = useLinks();
  const toast = useToast();
  const key = dismissKey(userId);
  const [dismissed, setDismissed] = useState(() => readDismissed(key));
  const today = todayStr();
  const steps = firstSteps({
    records: level.records.length,
    trainings: data.done.filter((e) => e.kind === 'training').length,
    linked: !!links.data?.some((l) => l.athleteId === userId),
    plannedToday: data.plan.some((p) => p.date === today),
  });
  const ready = !level.isLoading && profile.isSuccess && links.isSuccess && !data.isLoading;
  const visible = ready && !profile.data?.isTrainer && !dismissed && !steps.complete;

  // tutti i passi fatti a card aperta: lo si dice
  const wasOpen = useRef(false);
  useEffect(() => {
    if (visible) wasOpen.current = true;
    else if (wasOpen.current && steps.complete) {
      wasOpen.current = false;
      toast('Primi passi fatti! Da qui conta ogni allenamento');
    }
  }, [visible, steps.complete, toast]);

  if (!visible) return null;
  return (
    <FirstSteps
      steps={steps}
      onRecord={onRecord}
      onDismiss={() => {
        setDismissed(true);
        try {
          localStorage.setItem(key, '1');
        } catch {
          /* storage bloccato: resta nascosta finché la pagina è aperta */
        }
      }}
    />
  );
}

/**
 * "Per iniziare" (ticket 28, audit C6): la checklist del primo accesso. Ogni passo ha il suo pulsante, la spunta
 * rimbalza quando un passo si compie, i blocchetti in alto dicono a che punto sei. Sparisce da sola a passi fatti;
 * "Più tardi" la nasconde su questo dispositivo.
 */
export function FirstSteps({ steps, onRecord, onDismiss }: { steps: Steps; onRecord: () => void; onDismiss: () => void }) {
  // passi compiuti mentre la card era a schermo: solo quelli fanno il rimbalzo
  const seen = useRef<Set<StepId> | null>(null);
  const fresh = new Set(seen.current ? steps.steps.filter((s) => s.done && !seen.current!.has(s.id)).map((s) => s.id) : []);
  useEffect(() => {
    seen.current = new Set(steps.steps.filter((s) => s.done).map((s) => s.id));
  });

  const action = (id: StepId) => {
    switch (id) {
      case 'record':
        return <button type="button" className="btn small ghost" onClick={onRecord} aria-label="Vai a Livello per il primo record">Livello</button>;
      case 'allenamento':
        return <Link className="btn small ghost" to="/scheda" aria-label="Vai alla Scheda">Scheda</Link>;
    }
  };

  return (
    <section className="card first-steps" aria-labelledby="fs-h">
      <CardHead title="Per iniziare" help="Due passi per far contare livello e allenamenti. Si spuntano da soli quando li fai.">
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
