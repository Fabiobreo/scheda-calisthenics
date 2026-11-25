import { useState } from 'react';
import { useData, useShareWorkout } from '../data/hooks';
import { longDate } from '../lib/dates';
import { plural } from '../lib/format';
import { sharedItems } from '../lib/share';
import { Field } from './ui';

/**
 * "Condividi con gli amici" (ticket 39): dal riepilogo di fine sessione (`onlyDone`: solo quello che è stato fatto) e
 * dal giorno in Scheda. Chi segue l'utente riceve una copia in sola lettura con esercizi, serie e valori, col nome
 * scelto qui; note e difficoltà restano private. Senza niente da condividere il pulsante non compare.
 */
export function ShareWorkout({ date, onlyDone, className }: { date: string; onlyDone?: boolean; className?: string }) {
  const { plan, entries, exercises } = useData();
  const share = useShareWorkout();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const items = sharedItems(plan, entries, exercises, date, { onlyDone });
  if (!items.length) return null;

  if (done)
    return (
      <p className={`hint share-done${className ? ` ${className}` : ''}`} role="status">
        Condiviso con chi ti segue.
      </p>
    );

  if (!open)
    return (
      <div className={`row${className ? ` ${className}` : ''}`}>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => {
            const day = longDate(date).split(' ')[0];
            setName(`Allenamento di ${day}`);
            setOpen(true);
          }}
        >
          Condividi con gli amici
        </button>
      </div>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return setError('Dai un nome all’allenamento.');
    share.mutate({ name: v, date, items }, { onSuccess: () => setDone(true) });
  };

  return (
    <form className={`form share-form${className ? ` ${className}` : ''}`} onSubmit={submit} noValidate>
      <Field
        label="Nome dell'allenamento"
        value={name}
        maxLength={60}
        autoComplete="off"
        autoFocus
        error={error ?? undefined}
        hint={`Chi ti segue vede ${plural(items.length, 'esercizio', 'esercizi')} con serie e valori, e può copiarli nella sua scheda. Note e difficoltà restano tue.`}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      <div className="row">
        <button className="btn small" disabled={share.isPending} aria-busy={share.isPending || undefined}>
          Condividi
        </button>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Annulla
        </button>
      </div>
    </form>
  );
}
