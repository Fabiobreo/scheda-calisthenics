import { CountUp, PageTitle, Skeleton, Sparks, useNested } from '../../components/ui';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useScope } from '../../app/session';
import { Avatar } from '../../components/Avatar';
import { Pentagon } from '../../components/Pentagon';
import { IconFondSpinta, IconFondTirata, IconHandbalance, IconSkillSpinta, IconSkillTirata } from '../../components/icons';
import { useData, useLevel, useLinks, useProfile } from '../../data/hooks';
import { adherence, weekStreak } from '../../lib/adherence';
import { mondayOf, shortDate, todayStr } from '../../lib/dates';
import { levelSummary, subRule, type AvatarStage, type CategoryId, type CategoryScore, type SubId, type SubScore } from '../../lib/levels';
import { AXES, categoryName, recordText, subPercentText } from './levelView';
import { dismissKey, firstSteps } from './firstSteps';
import { FirstSteps } from './FirstStepsCard';
import { TodayCard } from './TodayCard';
import type { LevelRecordRow } from '../../data/types';
import { whenIdle } from '../../lib/idle';

// Il foglio del record si apre a un tocco: si scarica dopo il primo disegno della Home (audit A4)
const loadRecordSheet = () => import('./RecordSheet');
const RecordSheet = lazy(() => loadRecordSheet().then((m) => ({ default: m.RecordSheet })));

const ICON: Record<CategoryId, ReactNode> = {
  'fondamentali-tirata': <IconFondTirata />,
  'fondamentali-spinta': <IconFondSpinta />,
  'skill-spinta': <IconSkillSpinta />,
  'skill-tirata': <IconSkillTirata />,
  handbalance: <IconHandbalance />,
};

type Row = LevelRecordRow;

/**
 * Home "Livello" (ticket 10): profilo, pentagono, barre delle categorie, sotto-esercizi e record.
 * Dentro `AthleteScope` è il livello di un atleta visto dal suo trainer (ticket 15): si legge soltanto.
 */
export function HomeView() {
  const level = useLevel();
  const nested = useNested();
  const { readOnly, userId } = useScope();
  const [open, setOpen] = useState<CategoryId | null>(null);
  const [sheet, setSheet] = useState<SubId | null>(null);
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
  const byId = new Map(summary.categories.map((c) => [c.categoryId, c]));
  const axes = AXES.map((id) => byId.get(id)!);
  const fresh = records.length === 0;
  // tendenza (ticket 21): il livello di adesso contro quello con i soli record di prima di lunedì
  const before = levelSummary(records.filter((r) => r.date < mondayOf(todayStr()))).level;

  return (
    <>
      <PageTitle title="Livello" />
      {level.error && <div className="banner">Non riesco a leggere livello e record. Controlla la connessione e riprova.</div>}
      {/* su schermo largo: oggi, profilo e pentagono a sinistra, categorie a destra (audit A06) */}
      <div className={nested ? 'flat' : 'cols'}>
      <div className={nested ? 'flat' : 'col'}>
      {!readOnly && <TodayCard />}
      <Profile level={summary.level} gain={summary.level - before} elite={summary.zone === 'elite'} avatar={summary.avatar} readOnly={readOnly} guided={guide.visible} />

      {guide.visible && (
        <FirstSteps
          steps={guide.steps}
          onRecord={() => {
            setOpen(AXES[0]);
            requestAnimationFrame(() => document.getElementById(`cat-${AXES[0]}`)?.scrollIntoView({ behavior: smooth(), block: 'center' }));
          }}
          onDismiss={guide.dismiss}
        />
      )}

      <div className="party-slot" role="status" aria-live="polite">
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

      {readOnly && fresh && <p className="coach-note">Non ha ancora inserito record: li inserisce dalla sua Home.</p>}
      {!readOnly && !guide.visible && fresh && <p className="coach-note">Tocca una categoria qui sotto e aggiungi i tuoi primi record.</p>}

      <section className="card penta-card" aria-label="Pentagono">
        <Pentagon axes={axes.map((c) => ({ label: categoryName(c.categoryId), value: c.value }))} />
      </section>
      </div>

      <section className="cats" aria-label="Categorie">
        {axes.map((c) => (
          <Category
            key={c.categoryId}
            cat={c}
            open={open === c.categoryId}
            onToggle={() => setOpen(open === c.categoryId ? null : c.categoryId)}
            onPick={setSheet}
            readOnly={readOnly}
          />
        ))}
      </section>
      </div>

      {sheet && (
        <Suspense fallback={null}>
          <RecordSheet
            subId={sheet}
            records={records}
            summary={summary}
            onClose={() => setSheet(null)}
            onCelebrate={setParty}
            readOnly={readOnly}
          />
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
 * Mai nella vista del trainer né sulla Home di un account in modalità trainer.
 */
function useGuide(level: { records: unknown[] } | null, readOnly: boolean, userId: string) {
  const profile = useProfile();
  const data = useData();
  const links = useLinks();
  const key = dismissKey(userId);
  const [dismissed, setDismissed] = useState(() => readDismissed(key));
  const today = todayStr();
  const steps = firstSteps({
    hasAvatarBody: !!profile.data?.avatarBody,
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

/** Intestazione: avatar, nome, livello. Il peso corporeo non è più del profilo: sta dentro ogni record (ticket 32). */
function Profile({
  level,
  gain,
  elite,
  avatar,
  readOnly,
  guided,
}: {
  level: number;
  /** punti guadagnati da lunedì */
  gain: number;
  elite: boolean;
  avatar: AvatarStage;
  readOnly: boolean;
  /** c'è la checklist del primo accesso: il suo passo sostituisce il link alla figura */
  guided: boolean;
}) {
  const profile = useProfile().data;
  const name = profile?.displayName;
  const { entries, plan } = useData();
  const today = todayStr();
  const streak = weekStreak(entries, today);
  const adh = adherence(plan, entries, today);
  return (
    <section className="card hero" aria-label="Profilo">
      <Avatar name={name} avatar={avatar} elite={elite} body={profile?.avatarBody} />
      <div className="hero-txt">
        {name || readOnly ? (
          <p className="hero-name">{name || 'Atleta senza nome'}</p>
        ) : (
          <Link className="link small" to="/account">
            Scegli il tuo nome
          </Link>
        )}
        <p className="hero-level">
          <span className="eyebrow">Livello</span>
          <b className={elite ? 'elite' : undefined}>
            <CountUp value={level} />
          </b>
          {elite && <span className="tag-elite">ELITE</span>}
          {gain > 0 && <span className="delta">▲ {gain} questa settimana</span>}
        </p>
      </div>
      {!readOnly && !guided && !profile?.avatarBody && (
        <Link className="link small pick-fig" to="/account">
          Scegli la figura del tuo avatar
        </Link>
      )}
      {(streak > 0 || adh.pct !== null) && (
        <div className="stats">
          <div className="stat">
            <b className={streak >= 2 ? 'fire' : undefined}><CountUp value={streak} /> {streak === 1 ? 'settimana' : 'settimane'}</b>
            <small>di fila con un allenamento</small>
          </div>
          <div className="stat">
            <b>{adh.pct === null ? '—' : <><CountUp value={adh.pct} />%</>}</b>
            <small>del programma, ultime 4 sett.</small>
          </div>
        </div>
      )}
    </section>
  );
}

/** Barra della zona: fino a 100 piena su 100; in ELITE la prima metà è piena e la seconda cresce da 101 a 200. */
function ZoneBar({ value, elite }: { value: number; elite: boolean }) {
  return (
    <span className={`zbar${elite ? ' elite' : ''}`} aria-hidden="true">
      {elite ? (
        <>
          <i className="full" />
          <i className="hot" style={{ left: '50%', width: `${Math.min(100, value - 100) / 2}%` }} />
          <em />
        </>
      ) : (
        // a zero niente barra: il bagliore farebbe una macchia luminosa all'inizio del binario vuoto
        value > 0 && <i style={{ width: `${Math.min(100, value)}%` }} />
      )}
    </span>
  );
}

function Category({
  cat,
  open,
  onToggle,
  onPick,
  readOnly,
}: {
  cat: CategoryScore<Row>;
  open: boolean;
  onToggle: () => void;
  onPick: (id: SubId) => void;
  readOnly: boolean;
}) {
  const elite = cat.zone === 'elite';
  const panel = `cat-${cat.categoryId}`;
  return (
    <div className={`card cat${elite ? ' elite' : ''}${open ? ' open' : ''}`}>
      <button type="button" className="cat-h" aria-expanded={open} aria-controls={panel} onClick={onToggle}>
        <span className="cat-ico">{ICON[cat.categoryId]}</span>
        <span className="cat-name">{categoryName(cat.categoryId)}</span>
        <span className="cat-val">
          <b>{cat.value}</b> / {elite ? 200 : 100}
          {elite && <span className="tag-elite">ELITE</span>}
        </span>
        <ZoneBar value={cat.value} elite={elite} />
        <span className="chev" aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <ul className="subs" id={panel}>
          {cat.subs.map((s) => (
            <SubRow key={s.subId} s={s} onPick={() => onPick(s.subId)} readOnly={readOnly} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubRow({ s, onPick, readOnly }: { s: SubScore<Row>; onPick: () => void; readOnly: boolean }) {
  const rule = subRule(s.subId)!;
  const elite = s.zone === 'elite';
  return (
    <li>
      <button type="button" className="subrow" onClick={onPick}>
        <span className="sub-name">{rule.name}</span>
        <span className={`sub-pc${elite ? ' elite' : ''}`}>{subPercentText(s)}</span>
        <span className={`zbar thin${elite ? ' elite' : ''}`} aria-hidden="true">
          {s.percent > 0 && <i className={elite ? 'hot' : undefined} style={{ width: `${s.percent}%` }} />}
        </span>
        <span className="sub-best">
          {s.best ? `${recordText(s.best)} · ${shortDate(s.best.date)}` : readOnly ? 'Nessun record' : 'Nessun record: tocca per inserirlo'}
          {s.unlocked && !elite && <span className="tag-elite">ELITE sbloccata</span>}
          {s.needsBodyweight && <span className="warn"> · manca il peso</span>}
        </span>
      </button>
    </li>
  );
}
