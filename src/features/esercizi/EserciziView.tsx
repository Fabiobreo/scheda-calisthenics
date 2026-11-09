import { useState } from 'react';
import { useToast } from '../../app/toast';
import { ConfirmButton, Field, PageTitle, SearchSelect, Seg } from '../../components/ui';
import { useArchiveExercise, useCatalog, useCreateExercise, useData, useDeleteExercise, useTrainerLock, useUpdateExercise } from '../../data/hooks';
import { todayStr } from '../../lib/dates';
import { CATEGORY_LABEL, MEASURE_LABEL, MEASURES, type CatalogExercise, type Exercise, type Measure } from '../../data/types';
import { byCategory, matchCatalog } from '../../lib/catalog';

type Source = 'catalog' | 'custom';

interface Form {
  /** null = nuovo esercizio */
  id: string | null;
  source: Source;
  catalogId: string;
  name: string;
  inRecords: boolean;
  /** solo per i personalizzati: quelli del catalogo hanno la misura della voce */
  measure: Measure;
}

const blank = (first?: CatalogExercise): Form => ({
  id: null,
  source: first ? 'catalog' : 'custom',
  catalogId: first?.id ?? '',
  name: '',
  inRecords: false,
  measure: 'reps',
});

const toForm = (e: Exercise): Form => ({
  id: e.id,
  source: e.catalogId ? 'catalog' : 'custom',
  catalogId: e.catalogId ?? '',
  name: e.name,
  inRecords: e.inRecords,
  measure: e.measure,
});

/** Confronto dei nomi come lo fa il database: maiuscole e spazi esterni non contano. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function EserciziView() {
  const { exercises, active, entries, plan } = useData();
  const locked = useTrainerLock();
  const catalog = useCatalog().data ?? [];
  const create = useCreateExercise();
  const update = useUpdateExercise('Modifiche salvate');
  const archive = useArchiveExercise();
  const del = useDeleteExercise();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const archived = exercises.filter((e) => e.archivedAt);

  // voci del catalogo che l'utente non ha ancora (gli archiviati contano: si ripristinano dalla lista)
  const linked = new Set(exercises.map((e) => e.catalogId));
  const free = byCategory(catalog.filter((c) => !linked.has(c.id)));
  const editing = form?.id ? exercises.find((e) => e.id === form.id) : undefined;
  const count = (id: string) => entries.filter((e) => e.exerciseId === id).length;
  const measureLocked = !!editing && count(editing.id) > 0;
  const pickedCatalog = form?.source === 'catalog' && !form.id ? catalog.find((c) => c.id === form.catalogId) : undefined;

  const patch = (p: Partial<Form>) => form && setForm({ ...form, ...p });
  const pickCatalog = (id: string) => {
    if (catalog.some((x) => x.id === id)) patch({ catalogId: id });
  };

  const save = () => {
    if (!form) return;
    if (form.source === 'catalog') {
      if (form.id) {
        update.mutate({ id: form.id, patch: { inRecords: form.inRecords } });
        return setForm(null);
      }
      const c = catalog.find((x) => x.id === form.catalogId);
      if (!c) return toast('Scegli un esercizio dal catalogo');
      create.mutate({ catalogId: c.id, name: c.name, inRecords: form.inRecords, measure: c.measure });
      return setForm(null);
    }
    const name = form.name.trim();
    if (!name) return toast("Scrivi il nome dell'esercizio");
    if (name.length > 80) return toast('Nome troppo lungo');
    const twin = exercises.find((e) => e.id !== form.id && sameName(e.name, name));
    if (twin) return toast(twin.archivedAt ? `"${twin.name}" esiste già tra gli archiviati: ripristinalo` : `"${twin.name}" esiste già`);
    // un nome del catalogo va preso dal catalogo: stesso esercizio per tutti, grafici confrontabili
    const known = !form.id && matchCatalog(catalog, name);
    const mine = known && exercises.find((e) => e.catalogId === known.id);
    if (mine) return toast(mine.archivedAt ? `"${mine.name}" ce l'hai già tra gli archiviati: ripristinalo` : `"${mine.name}" ce l'hai già`);
    if (known) {
      setForm({ ...form, source: 'catalog', catalogId: known.id });
      return toast(`"${known.name}" è nel catalogo: l'ho scelto da lì`);
    }
    // con delle registrazioni la misura resta quella: lo storico e i grafici restano coerenti
    const measure = editing && count(editing.id) ? editing.measure : form.measure;
    if (form.id) update.mutate({ id: form.id, patch: { name, inRecords: form.inRecords, measure } });
    else create.mutate({ catalogId: null, name, inRecords: form.inRecords, measure });
    setForm(null);
  };


  return (
    <>
      <PageTitle title="Esercizi" />
      <section className="card">
        <div className="card-h">
          <h2>Esercizi</h2>
          <button className="btn small" onClick={() => setForm(blank(free[0]))}>
            + Aggiungi
          </button>
        </div>
        <p className="sub">
          Scegli i movimenti dal catalogo, uguale per tutti: così tu e il tuo trainer parlate dello stesso esercizio. Serie e ripetizioni le decidi
          nel programma, giorno per giorno.
        </p>

        {form && (
          <div className="form" id="xform">
            {!form.id && (
              <Seg
                label="Da dove"
                value={form.source}
                options={[
                  { v: 'catalog', l: 'Dal catalogo' },
                  { v: 'custom', l: 'Personalizzato' },
                ]}
                onChange={(source) => patch({ source })}
              />
            )}
            {form.source === 'catalog' ? (
              editing ? (
                <p className="pname">
                  {editing.name} <span className="chip mut">Dal catalogo</span>
                  {editing.measure === 'time' && <span className="chip mut">A tempo</span>}
                </p>
              ) : free.length ? (
                <>
                  <SearchSelect
                    label="Esercizio"
                    placeholder="Cerca nel catalogo…"
                    value={form.catalogId}
                    options={free.map((c) => ({ v: c.id, l: c.name, group: CATEGORY_LABEL[c.category], keywords: c.aliases }))}
                    onChange={pickCatalog}
                  />
                  <p className="hint">
                    {pickedCatalog?.measure === 'time' && 'Si misura in secondi di tenuta. '}Non c'è quello che cerchi? Crealo personalizzato.
                  </p>
                </>
              ) : (
                <p className="hint">Hai già tutti gli esercizi del catalogo. Per altri movimenti scegli "Personalizzato".</p>
              )
            ) : (
              <>
                <Field
                  label="Nome"
                  value={form.name}
                  autoComplete="off"
                  autoFocus
                  maxLength={80}
                  hint={form.id ? undefined : 'Solo per movimenti che non sono nel catalogo.'}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <div className="fld">
                  <span>Si misura in</span>
                  {measureLocked ? (
                    <>
                      <p className="pname">{MEASURE_LABEL[form.measure]}</p>
                      <span className="fld-hint">Ha già delle registrazioni: la misura non si cambia più, così storico e grafici restano coerenti.</span>
                    </>
                  ) : (
                    <>
                      <Seg label="Si misura in" value={form.measure} options={MEASURES.map((m) => ({ v: m, l: MEASURE_LABEL[m] }))} onChange={(measure) => patch({ measure })} />
                      <span className="fld-hint">Secondi per le tenute (plank, L-sit, verticale…). Dopo la prima registrazione non si cambia più.</span>
                    </>
                  )}
                </div>
              </>
            )}
            <label className="check-row">
              <input type="checkbox" checked={form.inRecords} onChange={(e) => patch({ inRecords: e.target.checked })} />
              Mostra nei record personali
            </label>
            <div className="row">
              <button className="btn" onClick={save} disabled={form.source === 'catalog' && !form.id && !free.length}>
                {form.id ? 'Salva modifiche' : 'Aggiungi esercizio'}
              </button>
              <button className="btn ghost" onClick={() => setForm(null)}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {!active.length && !form && <p className="empty">Non hai ancora esercizi. Aggiungili dal catalogo.</p>}
        {active.map((e) => (
          <div className="entry" key={e.id}>
            <div>
              <b>{e.name}</b>
              <div className="chips">
                {!e.catalogId && <span className="chip mut">Personalizzato</span>}
                {e.measure === 'time' && <span className="chip mut">A tempo</span>}
                {e.inRecords && <span className="chip mut">Nei record</span>}
              </div>
            </div>
            <div className="pact col">
              <button
                className="btn small ghost"
                onClick={() => {
                  setForm(toForm(e));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Modifica
              </button>
              <ConfirmButton
                confirmLabel="Archivia?"
                onConfirm={() =>
                  // il trainer lo ha in programma nei prossimi giorni: archiviarlo lo nasconderebbe senza toglierlo
                  plan.some((p) => p.exerciseId === e.id && p.date >= todayStr() && locked(p))
                    ? toast(`"${e.name}" è nel programma del tuo trainer: chiedigli di toglierlo prima di archiviarlo`)
                    : archive.mutate({ id: e.id, archived: true })
                }
              >
                Archivia
              </ConfirmButton>
            </div>
          </div>
        ))}
        {active.length > 0 && <p className="hint mt-12">Archiviare toglie l'esercizio da programma e liste, ma conserva lo storico e i grafici. Quelli che il tuo trainer ha in programma li toglie lui.</p>}

        {archived.length > 0 && (
          <>
            <div className="row mt-16">
              <button className="btn small ghost" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? 'Nascondi archiviati' : `Archiviati (${archived.length})`}
              </button>
            </div>
            {showArchived &&
              archived.map((e) => {
                const n = count(e.id);
                return (
                  <div className="entry" key={e.id}>
                    <div>
                      <b>{e.name}</b>
                      <div className="pmeta">{n ? `${n} registrazioni nello storico` : 'Nessuna registrazione'}</div>
                    </div>
                    <div className="pact col">
                      <button className="btn small ghost" onClick={() => archive.mutate({ id: e.id, archived: false })}>
                        Ripristina
                      </button>
                      <ConfirmButton confirmLabel={n ? `Elimina anche ${n} reg.` : 'Conferma'} onConfirm={() => del.mutate(e.id)} />
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </section>
    </>
  );
}
