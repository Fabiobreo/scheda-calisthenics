import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useScope } from '../../app/session';
import { Bust } from '../../components/Bust';
import { Pentagon } from '../../components/Pentagon';
import { IconFondSpinta, IconFondTirata, IconHandbalance, IconSkillSpinta, IconSkillTirata } from '../../components/icons';
import { PageTitle, Skeleton, Sparks, useNested } from '../../components/ui';
import { useData, useLevel, useLinks, useProfile, type LevelRow } from '../../data/hooks';
import { shortDate, todayStr } from '../../lib/dates';
import { whenIdle } from '../../lib/idle';
import type { CategoryId, CategoryScore, ChainId, ChainScore } from '../../lib/levels';
import { current, position, totalItems } from '../../lib/workout';
import { useWorkout } from '../logger/Logger';
import { dismissKey, firstSteps } from './firstSteps';
import { FirstSteps } from './FirstStepsCard';
import { CARDS, categoryName, chainLevelText, chainName, chainPercent, missingBodyweight, pentagonScale, recordText } from './levelView';

// Il foglio del record si apre a un tocco: si scarica dopo il primo disegno della pagina (audit A4)
const loadRecordSheet = () => import('./RecordSheet');
const RecordSheet = lazy(() => loadRecordSheet().then((m) => ({ default: m.RecordSheet })));

const ICON: Record<CategoryId, ReactNode> = {
  'fondamentali-tirata': <IconFondTirata />,
  'fondamentali-spinta': <IconFondSpinta />,
  'skill-spinta': <IconSkillSpinta />,
  'skill-tirata': <IconSkillTirata />,
  handbalance: <IconHandbalance />,
};

/**
 * Pagina Livello (ticket 34): busto a sinistra, pentagono a destra, 5 categorie a tendina che si aprono sulle catene,
 * e da una catena il foglio del record. A categorie chiuse sta tutta in una schermata (le altezze sono in CSS, sulla
 * altezza dello schermo). Tutti i numeri arrivano dal motore v2 attraverso `useLevel`: qui non si calcola niente.
 * Dentro `AthleteScope` è il livello di un atleta visto dal suo trainer (ticket 15): si legge soltanto.
 */
export function LivelloView() {
  const level = useLevel();
  const nested = useNested();
  const { readOnly, userId } = useScope();
  const [open, setOpen] = useState<CategoryId | null>(null);
  const [sheet, setSheet] = useState<ChainId | null>(null);
  const [party, setParty] = useState<string[]>([]);
  const guide = useGuide(level.isLoading ? null : level, readOnly, userId);
  useEffect(() => whenIdle(() => void loadRecordSheet()), []);

  // tutti i passi fatti adesso, a card aperta: si festeggia
  const wasOpen = useRef(false);
  useEffect(() => {
    if (guide.visible) wasOpen.current = true;
    else if (wasOpen.current && guide.steps.complete) {
      wasOpen.current = false;
      setParty(['Primi passi fatti!', 'Da qui conta ogni allenamento']);
    }
  }, [guide.visible, guide.steps.complete]);

  // la celebrazione resta qualche secondo, poi se ne va da sola
  useEffect(() => {
    if (!party.length) return;
    const id = window.setTimeout(() => setParty([]), 6000);
    return () => clearTimeout(id);
  }, [party]);

  if (level.isLoading) return <Skeleton />;

  const { summary, records } = level;
  const cats = CARDS.map((id) => summary.categories.find((c) => c.categoryId === id)!);

  const toggle = (id: CategoryId) => {
    const next = open === id ? null : id;
    setOpen(next);
    // la tendina aperta può finire sotto la barra: la si porta in vista
    if (next) requestAnimationFrame(() => document.getElementById(`lv-cat-${next}`)?.scrollIntoView({ behavior: smooth(), block: 'nearest' }));
  };

  // frecce, Inizio e Fine passano da un'intestazione all'altra, come in ogni fisarmonica
  const onKeys = (e: KeyboardEvent<HTMLElement>) => {
    const heads = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.lv-cat-h')];
    const i = heads.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? heads.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    heads[(to + heads.length) % heads.length].focus();
  };

  return (
    <>
      <PageTitle title="Livello" />
      {level.error && <div className="banner">Non riesco a leggere livello e record. Controlla la connessione e riprova.</div>}
      <div className={nested ? 'lv nested' : 'lv'}>
        {guide.visible && <FirstSteps steps={guide.steps} onRecord={() => toggle(CARDS[0])} onDismiss={guide.dismiss} />}
        {readOnly && records.length === 0 && <p className="coach-note">Non ha ancora inserito record: li inserisce dalla sua pagina Livello.</p>}

        <section className="lv-hero" aria-label={`Livello complessivo: ${summary.name}, ${summary.percent}%`}>
          <Bust band={summary.band} />
          <Pentagon scale={pentagonScale(summary)} />
        </section>

        {!readOnly && <StartWorkout />}

        <section className="lv-cats" aria-label="Categorie" onKeyDown={onKeys}>
          {cats.map((c) => (
            <Category key={c.categoryId} cat={c} open={open === c.categoryId} onToggle={() => toggle(c.categoryId)} onPick={setSheet} records={records} readOnly={readOnly} />
          ))}
        </section>
      </div>

      <div className="lv-party" role="status" aria-live="polite">
        {party.length > 0 && (
          <div className="party" key={party.join('|')}>
            <Sparks />
            <b>{party[0]}</b>
            {party.slice(1).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}
      </div>

      {sheet && (
        <Suspense fallback={null}>
          <RecordSheet chainId={sheet} records={records} summary={summary} onClose={() => setSheet(null)} onCelebrate={setParty} readOnly={readOnly} />
        </Suspense>
      )}
    </>
  );
}

const smooth = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

const readDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/**
 * Primo accesso guidato (ticket 28): i passi dai dati che ci sono già, "Più tardi" in `localStorage` per utente.
 * Mai nella vista del trainer né sulla pagina di un account in modalità trainer.
 */
function useGuide(level: { records: unknown[] } | null, readOnly: boolean, userId: string) {
  const profile = useProfile();
  const data = useData();
  const links = useLinks();
  const key = dismissKey(userId);
  const [dismissed, setDismissed] = useState(() => readDismissed(key));
  const today = todayStr();
  const steps = firstSteps({
    records: level?.records.length ?? 0,
    trainings: data.done.filter((e) => e.kind === 'training').length,
    linked: !!links.data?.some((l) => l.athleteId === userId),
    plannedToday: data.plan.some((p) => p.date === today),
  });
  // si aspetta di avere tutto: niente checklist che compare e scompare mentre i dati arrivano
  const ready = !!level && profile.isSuccess && links.isSuccess && !data.isLoading;
  return {
    steps,
    // il trainer ha il suo lavoro: la checklist è per chi si allena
    visible: !readOnly && ready && !profile.data?.isTrainer && !dismissed && !steps.complete,
    dismiss: () => {
      setDismissed(true);
      try {
        localStorage.setItem(key, '1');
      } catch {
        /* storage bloccato: resta nascosta finché la pagina è aperta */
      }
    },
  };
}

/**
 * "Inizia allenamento" (modalità sessione, ticket 25). Stava nella scheda "Oggi", che da questa pagina è stata tolta:
 * il suo posto sarà la Scheda (ticket 37). Finché il 37 non c'è resta qui, in una riga sola e soltanto quando oggi c'è
 * qualcosa da fare, perché altrimenti la sessione non si potrebbe più avviare da nessuna parte.
 */
function StartWorkout() {
  const { exercises, entries, plan } = useData();
  const workout = useWorkout();
  const today = todayStr();
  const known = new Set(exercises.map((e) => e.id));
  const items = plan.filter((p) => p.date === today && known.has(p.exerciseId));
  const left = items.filter((p) => !entries.some((e) => e.exerciseId === p.exerciseId && e.kind === 'training' && e.date === today)).length;
  const live = workout.session && !workout.session.ended && current(workout.session) ? workout.session : null;
  if (!live && left === 0) return null;
  return (
    <div className="lv-go">
      {live ? (
        <>
          <button type="button" className="btn small" onClick={workout.resume}>
            Continua allenamento {position(live)}/{totalItems(live)}
          </button>
          <button type="button" className="btn small ghost" onClick={workout.end}>
            Termina
          </button>
        </>
      ) : (
        <button type="button" className="btn small ghost" onClick={workout.start}>
          <span aria-hidden="true">▶&nbsp;</span>Inizia allenamento
        </button>
      )}
    </div>
  );
}

/** Scheda di una categoria: nome, livello, % dentro il livello, barra dorata con la stessa %. Si apre sulle catene. */
function Category({
  cat,
  open,
  onToggle,
  onPick,
  records,
  readOnly,
}: {
  cat: CategoryScore<LevelRow>;
  records: readonly LevelRow[];
  open: boolean;
  onToggle: () => void;
  onPick: (id: ChainId) => void;
  readOnly: boolean;
}) {
  const id = `lv-cat-${cat.categoryId}`;
  const head = useRef<HTMLButtonElement>(null);
  const name = categoryName(cat.categoryId);
  return (
    <div className={open ? 'card lv-cat open' : 'card lv-cat'} id={id}>
      <h2 className="lv-cat-t">
        <button ref={head} type="button" className="lv-cat-h" id={`${id}-h`} aria-expanded={open} aria-controls={`${id}-p`} onClick={onToggle}>
          <span className="lv-cat-ico">{ICON[cat.categoryId]}</span>
          <span className="lv-cat-name">{name}</span>
          <span className="lv-cat-lvl">{cat.name}</span>
          <span className="lv-cat-pc">
            {cat.percent}
            <i>%</i>
          </span>
          <span className="lv-chev" aria-hidden="true">
            ›
          </span>
          <span className="zbar" aria-hidden="true">
            {/* a zero niente barra: il bagliore farebbe una macchia luminosa all'inizio del binario vuoto */}
            {cat.percent > 0 && <i style={{ width: `${cat.percent}%` }} />}
          </span>
        </button>
      </h2>
      {open && (
        <div
          id={`${id}-p`}
          role="region"
          aria-labelledby={`${id}-h`}
          onKeyDown={(e) => {
            // Esc chiude la tendina e riporta il fuoco sulla sua intestazione
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onToggle();
            head.current?.focus();
          }}
        >
          <ul className="lv-chains">
            {cat.chains.map((c) => (
              <ChainRow
                key={c.chainId}
                chain={c}
                onPick={() => onPick(c.chainId)}
                readOnly={readOnly}
                // record convertiti dal formato vecchio senza peso corporeo (ticket 32): non contano finché non lo si aggiunge
                noWeight={records.some((r) => r.chainId === c.chainId && missingBodyweight(r))}
              />
            ))}
            </ul>
        </div>
      )}
    </div>
  );
}

/** Riga di una catena: livello attuale (voce e lettera), % del livello, miglior record. Apre il foglio del record. */
function ChainRow({ chain, onPick, readOnly, noWeight }: { chain: ChainScore<LevelRow>; onPick: () => void; readOnly: boolean; noWeight: boolean }) {
  const pc = chainPercent(chain);
  const best = chain.best;
  return (
    <li>
      <button type="button" className="lv-chain" onClick={onPick}>
        <span className="lv-ch-name">{chainName(chain.chainId)}</span>
        <span className="lv-ch-pc">{chain.level ? `${pc}%` : '–'}</span>
        <span className="lv-ch-lvl">{chainLevelText(chain) ?? 'Nessun livello'}</span>
        <span className="zbar thin" aria-hidden="true">
          {pc > 0 && <i style={{ width: `${pc}%` }} />}
        </span>
        <span className="lv-ch-best">
          {best ? `Record: ${recordText(best)} · ${shortDate(best.date)}` : readOnly ? 'Nessun record' : 'Nessun record: tocca per inserirlo'}
          {noWeight && <span className="warn"> · a un record manca il peso</span>}
        </span>
      </button>
    </li>
  );
}
