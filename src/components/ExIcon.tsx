import { useCatalog } from '../data/hooks';
import { CATEGORIES, type Category } from '../data/types';

/**
 * Pittogrammi degli esercizi (V02): uno per categoria del catalogo, figure a linea nello stile dell'avatar.
 * I personalizzati, che non hanno categoria, hanno una scintilla. Decorativi: il nome dell'esercizio è accanto.
 */
const PATHS: Record<Category | 'custom', string> = {
  // appeso alla sbarra
  tirata: 'M3 3H21 M8 3L11 10 M16 3L13 10 M12 11V16.5 M12 16.5L10 21 M12 16.5L14 21',
  // piegamento visto di lato
  spinta: 'M2 20.5H22 M16.5 11.5L5 17.5 M5 17.5L3 20 M15.5 12V20.5',
  // squat visto di lato
  gambe: 'M3 21H21 M10 7L11.5 13 M11.5 13L17 13.5 M17 13.5L16 20.5 M10.5 9L17.5 8.5',
  // L-sit sulle mani
  core: 'M3 20H21 M8 8V14.5 M8 14.5H20 M8 10L5 14 M5 14V20',
  // verticale
  skill: 'M3 21H21 M10 21L11.2 14.5 M14 21L12.8 14.5 M12 13.5V6 M12 6L10 2.5 M12 6L14 2.5',
  custom: 'M12 3L13.8 10.2L21 12L13.8 13.8L12 21L10.2 13.8L3 12L10.2 10.2Z',
};
// testa: dove sta in ogni figura
const HEAD: Partial<Record<Category, [number, number]>> = { tirata: [12, 8], spinta: [18.5, 10], gambe: [9.5, 4.5], core: [8, 5.5], skill: [12, 16.5] };

export function CategoryIcon({ category }: { category: Category | null }) {
  const key = category ?? 'custom';
  const head = category ? HEAD[category] : undefined;
  return (
    <svg className={`exi exi-${key}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[key]} />
      {head && <circle cx={head[0]} cy={head[1]} r="2" />}
    </svg>
  );
}

/** Pittogramma di un esercizio dalla sua voce di catalogo (null = personalizzato). */
export function ExIcon({ catalogId }: { catalogId: string | null }) {
  const catalog = useCatalog().data;
  const category = catalogId ? (catalog?.find((c) => c.id === catalogId)?.category ?? null) : null;
  // catalogo non ancora caricato: niente scintilla provvisoria che poi diventa un'altra figura
  if (catalogId && !catalog) return <span className="exi" aria-hidden="true" />;
  return <CategoryIcon category={category} />;
}

/** Le cinque figure in fila: disegno degli stati vuoti di Esercizi e Scheda. */
export function CategoryRow() {
  return (
    <span className="empty-icons" aria-hidden="true">
      {CATEGORIES.map((c) => (
        <CategoryIcon key={c} category={c} />
      ))}
    </span>
  );
}
