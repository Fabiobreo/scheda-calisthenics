import { useState } from 'react';
import { CATEGORY_LABEL, type CatalogExercise, type ExerciseRef } from '../data/types';
import { byCategory, matchCatalog } from '../lib/catalog';
import { Field, Select } from './ui';

const CUSTOM = '__custom';

/**
 * Scelta di un esercizio per un giorno: una voce del catalogo o, in fondo alla lista, un nome personalizzato.
 * Un nome scritto a mano che è nel catalogo diventa la voce del catalogo: stesso esercizio per tutti.
 */
export function useExercisePicker(catalog: CatalogExercise[], exclude: (ref: ExerciseRef) => boolean = () => false) {
  const options = byCategory(catalog).filter((c) => !exclude({ catalogId: c.id, customName: null }));
  const [sel, setSel] = useState('');
  const [custom, setCustom] = useState('');
  const value = sel === CUSTOM || options.some((c) => c.id === sel) ? sel : (options[0]?.id ?? CUSTOM);

  const ref = (): ExerciseRef | null => {
    if (value !== CUSTOM) return { catalogId: value, customName: null };
    const name = custom.trim();
    if (!name) return null;
    const known = matchCatalog(catalog, name);
    return known ? { catalogId: known.id, customName: null } : { catalogId: null, customName: name.slice(0, 80) };
  };

  const view = (
    <>
      <Select
        label="Esercizio"
        value={value}
        options={[
          ...options.map((c) => ({ v: c.id, l: c.name, group: CATEGORY_LABEL[c.category] })),
          { v: CUSTOM, l: 'Personalizzato…', group: 'Altro' },
        ]}
        onChange={setSel}
      />
      {value === CUSTOM && (
        <Field label="Nome" value={custom} maxLength={80} autoComplete="off" autoFocus onChange={(e) => setCustom(e.target.value)} />
      )}
    </>
  );

  return { view, ref, key: value };
}

/** Nome da mostrare per un riferimento a un esercizio. */
export const refName = (catalog: CatalogExercise[], ref: { catalogId: string | null; customName: string | null }) =>
  ref.catalogId ? (catalog.find((c) => c.id === ref.catalogId)?.name ?? ref.catalogId) : (ref.customName ?? '');
