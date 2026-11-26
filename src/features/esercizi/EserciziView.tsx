import { useState } from 'react';
import { useToast } from '../../app/toast';
import { CategoryRow } from '../../components/ExIcon';
import { EmptyState, MoreMenu, PageTitle } from '../../components/ui';
import { useArchiveExercise, useCatalog, useData, useDeleteExercise, useTrainerLock } from '../../data/hooks';
import type { Exercise } from '../../data/types';
import { todayStr } from '../../lib/dates';
import { plural } from '../../lib/format';
import { AddSheet, EditSheet, Sheet } from './ExerciseSheet';

type Open = { kind: 'add' } | { kind: 'edit' | 'delete'; id: string };

/**
 * Pagina Esercizi (ticket 35): righe con il solo nome e, sotto, l'etichetta quando serve; tutte le azioni nel menu "⋯"
 * (Modifica, Archivia, Elimina); "+ Aggiungi" apre il foglio del catalogo. Sotto, la nota su Elimina e Archivia e
 * l'elenco degli archiviati.
 */
export function EserciziView() {
  const { exercises, active, entries, plan } = useData();
  const locked = useTrainerLock();
  const catalog = useCatalog().data ?? [];
  const archive = useArchiveExercise();
  const del = useDeleteExercise();
  const toast = useToast();
  const [open, setOpen] = useState<Open | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const archived = exercises.filter((e) => e.archivedAt);
  const today = todayStr();
  const count = (id: string) => entries.filter((e) => e.exerciseId === id).length;
  // il trainer lo ha in programma nei prossimi giorni: toglierlo da qui lo farebbe sparire dalla sua scheda
  const byTrainer = (e: Exercise) => plan.some((p) => p.exerciseId === e.id && p.date >= today && locked(p));
  const target = open && open.kind !== 'add' ? exercises.find((e) => e.id === open.id) : undefined;

  const doArchive = (e: Exercise) =>
    byTrainer(e)
      ? toast(`"${e.name}" è nel programma del tuo trainer: chiedigli di toglierlo prima di archiviarlo`)
      : archive.mutate({ id: e.id, archived: true }, { onSuccess: () => toast(`"${e.name}" archiviato: lo ritrovi in fondo, tra gli archiviati`) });
  const askDelete = (e: Exercise) =>
    byTrainer(e) ? toast(`"${e.name}" è nel programma del tuo trainer: chiedigli di toglierlo prima di eliminarlo`) : setOpen({ kind: 'delete', id: e.id });

  const tags = (e: Exercise) => [!e.catalogId && 'Personalizzato', e.measure === 'time' && 'A tempo'].filter(Boolean).join(' · ');

  return (
    <>
      <PageTitle
        show
        title="Esercizi"
        sub={active.length ? plural(active.length, 'esercizio', 'esercizi') : undefined}
        help="Scegli i movimenti dal catalogo, uguale per tutti: così tu e il tuo trainer parlate dello stesso esercizio. Serie e ripetizioni le decidi nel programma, giorno per giorno."
      >
        <button className="btn small" onClick={() => setOpen({ kind: 'add' })}>
          + Aggiungi
        </button>
      </PageTitle>
      <div className="ex-page">
        {!active.length && (
          <EmptyState
            art={<CategoryRow />}
            title="Nessun esercizio"
            actions={
              <button className="btn" onClick={() => setOpen({ kind: 'add' })}>
                Aggiungi dal catalogo
              </button>
            }
          >
            Tirate, spinte, gambe, core e skill: scegli i movimenti che fai, poi li metti nel programma della settimana.
          </EmptyState>
        )}

        <ul className="ex-list">
          {active.map((e) => (
            <li className="ex-row" key={e.id}>
              <span className="ex-txt">
                <b>{e.name}</b>
                {tags(e) && <small className="ex-tag">{tags(e)}</small>}
              </span>
              <MoreMenu
                label={`Azioni per ${e.name}`}
                items={[
                  { label: 'Modifica', onSelect: () => setOpen({ kind: 'edit', id: e.id }) },
                  { label: 'Archivia', onSelect: () => doArchive(e) },
                  { label: 'Elimina', danger: true, onSelect: () => askDelete(e) },
                ]}
              />
            </li>
          ))}
        </ul>

        {exercises.length > 0 && (
          <p className="hint ex-note card">
            <b>Elimina</b> cancella l'esercizio con tutte le sue registrazioni, per sempre. <b>Archivia</b> lo toglie da scheda e liste ma conserva storico e grafici: lo
            ripristini quando vuoi.
          </p>
        )}

        {archived.length > 0 && (
          <>
            <button className="btn small ghost ex-arch" aria-expanded={showArchived} aria-controls="ex-archived" onClick={() => setShowArchived(!showArchived)}>
              Archiviati ({archived.length})
            </button>
            {showArchived && (
              <ul className="ex-list" id="ex-archived" aria-label="Esercizi archiviati">
                {archived.map((e) => {
                  const n = count(e.id);
                  return (
                    <li className="ex-row" key={e.id}>
                      <span className="ex-txt">
                        <b>{e.name}</b>
                        <small className="ex-tag">{n ? `${plural(n, 'registrazione', 'registrazioni')} nello storico` : 'Nessuna registrazione'}</small>
                      </span>
                      <MoreMenu
                        label={`Azioni per ${e.name}`}
                        items={[
                          { label: 'Ripristina', onSelect: () => archive.mutate({ id: e.id, archived: false }, { onSuccess: () => toast(`"${e.name}" ripristinato`) }) },
                          { label: 'Elimina', danger: true, onSelect: () => askDelete(e) },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {open?.kind === 'add' && <AddSheet catalog={catalog} exercises={exercises} onClose={() => setOpen(null)} />}
      {open?.kind === 'edit' && target && <EditSheet exercise={target} exercises={exercises} catalog={catalog} hasEntries={count(target.id) > 0} onClose={() => setOpen(null)} />}
      {open?.kind === 'delete' && target && (
        <DeleteSheet
          exercise={target}
          entries={count(target.id)}
          inPlan={plan.some((p) => p.exerciseId === target.id)}
          onClose={() => setOpen(null)}
          onConfirm={() => {
            del.mutate(target.id);
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

/** Conferma di "Elimina": dice quante registrazioni si perdono; il fuoco non parte dal bottone che cancella. */
function DeleteSheet({ exercise, entries, inPlan, onClose, onConfirm }: { exercise: Exercise; entries: number; inPlan: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Sheet title={`Eliminare "${exercise.name}"?`} onClose={onClose} alert>
      <p className="ex-del">
        {entries ? (
          <>
            Cancelli anche <b>{plural(entries, 'registrazione', 'registrazioni')}</b>: lo storico e i grafici di questo esercizio spariscono.
          </>
        ) : (
          'Non ha registrazioni.'
        )}
        {inPlan && ' Esce anche dalla scheda.'} Non si può annullare.
      </p>
      {entries > 0 && !exercise.archivedAt && <p className="hint">Per tenere lo storico usa Archivia.</p>}
      <div className="row ex-del-act">
        <button type="button" className="btn danger" onClick={onConfirm}>
          {entries ? `Elimina con ${plural(entries, 'registrazione', 'registrazioni')}` : 'Elimina'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          Annulla
        </button>
      </div>
    </Sheet>
  );
}
