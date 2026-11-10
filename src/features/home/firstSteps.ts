/**
 * Primo accesso guidato (ticket 28, audit C6): i passi di un atleta nuovo, dedotti dai dati che ha già.
 * Nessun dato nuovo da salvare: ogni passo è fatto quando esiste quello che chiede.
 */

export type StepId = 'peso' | 'figura' | 'record' | 'allenamento';

export interface Step {
  id: StepId;
  title: string;
  done: boolean;
  /** suggerimento, solo per il prossimo passo da fare */
  hint: string | null;
}

export interface StepsInput {
  hasBodyweight: boolean;
  hasAvatarBody: boolean;
  records: number;
  trainings: number;
  /** collegato a un trainer: è lui a preparare la settimana */
  linked: boolean;
  /** c'è qualcosa in programma oggi */
  plannedToday: boolean;
}

export interface Steps {
  steps: Step[];
  done: number;
  total: number;
  complete: boolean;
  next: StepId | null;
}

const HINT: Record<Exclude<StepId, 'allenamento'>, string> = {
  peso: 'Senza, i record in kg non contano.',
  figura: 'Cambia fisico man mano che sali di livello.',
  record: 'Tocca una categoria e scegli un esercizio.',
};

function trainingHint(i: StepsInput): string {
  if (i.plannedToday) return 'Registra un esercizio di Oggi.';
  if (i.linked) return 'Il tuo trainer ti prepara la settimana.';
  return 'Prepara la settimana dalla Scheda.';
}

export function firstSteps(i: StepsInput): Steps {
  const base: Omit<Step, 'hint'>[] = [
    { id: 'peso', title: 'Il tuo peso', done: i.hasBodyweight },
    { id: 'figura', title: "La figura dell'avatar", done: i.hasAvatarBody },
    { id: 'record', title: 'Il primo record', done: i.records > 0 },
    { id: 'allenamento', title: 'Il primo allenamento', done: i.trainings > 0 },
  ];
  const next = base.find((s) => !s.done)?.id ?? null;
  const steps = base.map((s) => ({ ...s, hint: s.id !== next ? null : s.id === 'allenamento' ? trainingHint(i) : HINT[s.id] }));
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length, next };
}

/** Chiave in `localStorage` per "Più tardi": vale per quell'utente su quel dispositivo. */
export const dismissKey = (userId: string) => `primi-passi-nascosti:${userId}`;
