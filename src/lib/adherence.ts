import type { Entry, LevelRecordRow, PlanItem } from '../data/types';
import { addDays, DAY_SHORT, daysBetween, mondayOf, parseDate, shortDate, weekdayIndex } from './dates';
import { weekItems } from './plan';
import { chrono, recordEntryIds } from './stats';

/**
 * Stato di un esercizio in programma (ticket 16):
 * - done: registrato lo stesso giorno;
 * - moved: registrato in un altro giorno della stessa settimana (lun–dom), prima o dopo: conta come fatto;
 * - missed: giorno passato e niente in settimana;
 * - pending: oggi o più avanti, non ancora fatto (non conta nel rispetto del piano).
 */
export type ItemStatus = { kind: 'done'; entry: Entry } | { kind: 'moved'; entry: Entry } | { kind: 'missed' } | { kind: 'pending' };

export interface Adherence {
  /** esercizi che contano: fatti, spostati e saltati (quelli ancora da fare no) */
  due: number;
  done: number;
  moved: number;
  missed: number;
  /** (fatti + spostati) / dovuti, in percentuale intera; null se non c'era niente da fare */
  pct: number | null;
}

/**
 * Stato di ogni esercizio in programma nella settimana che inizia dal lunedì `monday`. Contano solo gli allenamenti
 * (non i tentativi di record) fino a oggi. Un allenamento risponde a un solo esercizio in programma: prima quelli dello
 * stesso giorno, poi gli spostati, scegliendo il giorno più vicino.
 */
export function weekStatuses(plan: PlanItem[], entries: Entry[], monday: string, today: string): Map<string, ItemStatus> {
  const out = new Map<string, ItemStatus>();
  const sunday = addDays(monday, 6);
  const trainings = entries
    .filter((e) => e.kind === 'training' && e.date >= monday && e.date <= sunday && e.date <= today)
    .sort(chrono);
  const used = new Set<string>();
  const items = weekItems(plan, monday);

  // stesso giorno
  for (const p of items) {
    const e = trainings.find((x) => x.exerciseId === p.exerciseId && x.date === p.date && !used.has(x.id));
    if (!e) continue;
    // le altre registrazioni dello stesso esercizio quel giorno sono la stessa sessione: non valgono per un altro giorno
    for (const x of trainings) if (x.exerciseId === p.exerciseId && x.date === p.date) used.add(x.id);
    out.set(p.id, { kind: 'done', entry: e });
  }
  // spostati: il giorno libero più vicino, una sessione (giorno) per esercizio in programma
  for (const p of items) {
    if (out.has(p.id)) continue;
    const free = trainings.filter((x) => x.exerciseId === p.exerciseId && !used.has(x.id));
    const e = free.sort((a, b) => Math.abs(daysBetween(p.date, a.date)) - Math.abs(daysBetween(p.date, b.date)) || chrono(a, b))[0];
    if (e) {
      for (const x of trainings) if (x.exerciseId === p.exerciseId && x.date === e.date) used.add(x.id);
      out.set(p.id, { kind: 'moved', entry: e });
    } else out.set(p.id, { kind: p.date < today ? 'missed' : 'pending' });
  }
  return out;
}

/** Conteggi di un insieme di stati. */
export function summarizeStatuses(statuses: Iterable<ItemStatus>): Adherence {
  const a = { due: 0, done: 0, moved: 0, missed: 0 };
  for (const s of statuses) {
    if (s.kind === 'pending') continue;
    a.due++;
    a[s.kind]++;
  }
  return { ...a, pct: a.due ? Math.round(((a.done + a.moved) / a.due) * 100) : null };
}

/** Rispetto del piano nelle `weeks` settimane fino a quella di oggi compresa (quella di oggi conta fino a ieri). */
export function adherence(plan: PlanItem[], entries: Entry[], today: string, weeks = 4): Adherence {
  const all: ItemStatus[] = [];
  const thisMonday = mondayOf(today);
  for (let i = weeks - 1; i >= 0; i--) all.push(...weekStatuses(plan, entries, addDays(thisMonday, -7 * i), today).values());
  return summarizeStatuses(all);
}

/** "3 di 5 (60%)", con "1 spostato" se ce ne sono. */
export function adherenceText(a: Adherence): string {
  if (a.pct === null) return 'niente da fare finora';
  const moved = a.moved ? `, ${a.moved} ${a.moved === 1 ? 'spostato' : 'spostati'}` : '';
  return `${a.pct}% · ${a.done + a.moved} di ${a.due}${moved}`;
}

/** "Spostato: fatto mer 4". */
export function movedText(date: string): string {
  const d = parseDate(date);
  return `Spostato: fatto ${DAY_SHORT[weekdayIndex(d)].toLowerCase()} ${d.getDate()}`;
}

/** Ultimo allenamento registrato fino a oggi. */
export function lastTrainingDate(entries: Entry[], today: string): string | null {
  let last: string | null = null;
  for (const e of entries) if (e.kind === 'training' && e.date <= today && (!last || e.date > last)) last = e.date;
  return last;
}

export type AlertKind = 'inactive' | 'low-week' | 'no-plan' | 'record';
export interface Alert {
  kind: AlertKind;
  text: string;
}

/** Giorni senza allenamenti oltre i quali l'atleta è "fermo"; finestra per i record nuovi e per il programma. */
export const ALERT_DAYS = 7;

/**
 * Avvisi per il trainer su un atleta (ticket 16), in ordine d'importanza: fermo da 7 giorni pur avendo un programma,
 * settimana scorsa sotto il 50%, niente in programma nei prossimi 7 giorni, record nuovi negli ultimi 7 giorni.
 * `nameOf` dà il nome di un esercizio; `subName` quello di un sotto-esercizio dei livelli.
 */
export function athleteAlerts({
  plan,
  entries,
  levelRecords,
  today,
  nameOf,
  subName,
}: {
  plan: PlanItem[];
  entries: Entry[];
  levelRecords: Pick<LevelRecordRow, 'subId' | 'date'>[];
  today: string;
  nameOf: (exerciseId: string) => string | undefined;
  subName: (subId: string) => string | undefined;
}): Alert[] {
  const out: Alert[] = [];
  const since = addDays(today, -ALERT_DAYS);

  // fermo: niente allenamenti da almeno 7 giorni, mentre nel programma c'era qualcosa
  const last = lastTrainingDate(entries, today);
  const idle = last === null ? null : daysBetween(last, today);
  const hadPlan = plan.some((p) => p.date >= since && p.date < today);
  if (hadPlan && (idle === null || idle >= ALERT_DAYS))
    out.push({ kind: 'inactive', text: idle === null ? 'Non ha ancora registrato allenamenti' : `Fermo da ${idle} giorni (ultimo allenamento ${shortDate(last!)})` });

  const lastWeek = summarizeStatuses(weekStatuses(plan, entries, addDays(mondayOf(today), -7), today).values());
  if (lastWeek.pct !== null && lastWeek.pct < 50)
    out.push({ kind: 'low-week', text: `Settimana scorsa: ${lastWeek.pct}% del programma (${lastWeek.done + lastWeek.moved} di ${lastWeek.due})` });

  const until = addDays(today, ALERT_DAYS);
  if (!plan.some((p) => p.date > today && p.date <= until)) out.push({ kind: 'no-plan', text: `Niente in programma nei prossimi ${ALERT_DAYS} giorni` });

  // record: di livello, o allenamenti che hanno battuto un record (non la prima volta di un esercizio)
  const recent = (d: string) => d > since && d <= today;
  const names: string[] = [];
  for (const r of levelRecords) if (recent(r.date)) names.push(subName(r.subId) ?? r.subId);
  const done = entries.filter((e) => e.date <= today);
  const firsts = new Set<string>();
  const seen = new Set<string>();
  for (const e of [...done].sort(chrono)) {
    if (e.sets.length && !seen.has(e.exerciseId)) {
      seen.add(e.exerciseId);
      firsts.add(e.id);
    }
  }
  for (const id of recordEntryIds(done)) {
    const e = done.find((x) => x.id === id)!;
    if (!firsts.has(id) && recent(e.date)) names.push(nameOf(e.exerciseId) ?? 'esercizio rimosso');
  }
  const unique = [...new Set(names)];
  if (unique.length)
    out.push({
      kind: 'record',
      text: `${unique.length === 1 ? 'Nuovo record' : 'Nuovi record'}: ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? ` e altri ${unique.length - 3}` : ''}`,
    });
  return out;
}
