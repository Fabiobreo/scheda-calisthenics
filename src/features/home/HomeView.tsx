import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Pentagon } from '../../components/Pentagon';
import { IconFondSpinta, IconFondTirata, IconHandbalance, IconSkillSpinta, IconSkillTirata } from '../../components/icons';
import { useLevel, useProfile, useSetBodyWeight } from '../../data/hooks';
import { fmt, numInput, parseNum } from '../../lib/format';
import { shortDate } from '../../lib/dates';
import { subRule, validateBodyweight, LIMITS, type CategoryId, type CategoryScore, type SubId, type SubScore } from '../../lib/levels';
import { AXES, categoryName, recordText, subPercentText } from './levelView';
import { RecordSheet } from './RecordSheet';
import type { LevelRecordRow } from '../../data/types';

const ICON: Record<CategoryId, ReactNode> = {
  'fondamentali-tirata': <IconFondTirata />,
  'fondamentali-spinta': <IconFondSpinta />,
  'skill-spinta': <IconSkillSpinta />,
  'skill-tirata': <IconSkillTirata />,
  handbalance: <IconHandbalance />,
};

type Row = LevelRecordRow & { bodyweightKg: number | null };

/** Home "Livello" (ticket 10): profilo, pentagono, barre delle categorie, sotto-esercizi e record. */
export function HomeView() {
  const level = useLevel();
  const [open, setOpen] = useState<CategoryId | null>(null);
  const [sheet, setSheet] = useState<SubId | null>(null);
  const [party, setParty] = useState<string[]>([]);

  // la celebrazione resta qualche secondo, poi se ne va da sola
  useEffect(() => {
    if (!party.length) return;
    const id = window.setTimeout(() => setParty([]), 6000);
    return () => clearTimeout(id);
  }, [party]);

  if (level.isLoading) return <p className="empty">Caricamento…</p>;

  const { summary, records, weights, bodyweight } = level;
  const byId = new Map(summary.categories.map((c) => [c.categoryId, c]));
  const axes = AXES.map((id) => byId.get(id)!);
  const fresh = records.length === 0;

  return (
    <>
      {level.error && <div className="banner">Non riesco a leggere livello e record. Controlla la connessione e riprova.</div>}
      <Profile level={summary.level} elite={summary.zone === 'elite'} stage={summary.avatar.stage} aura={summary.avatar.aura} bodyweight={bodyweight} />

      <div className="party-slot" role="status" aria-live="polite">
        {party.length > 0 && (
          <div className="party">
            <b>{party[0]}</b>
            {party.slice(1).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}
      </div>

      {(fresh || !bodyweight) && (
        <p className="coach-note">
          {fresh && !bodyweight
            ? 'Per iniziare inserisci il tuo peso qui sopra, poi tocca una categoria e aggiungi i tuoi primi record.'
            : fresh
              ? 'Tocca una categoria qui sotto e aggiungi i tuoi primi record.'
              : 'Inserisci il tuo peso qui sopra: senza, i record in kg non contano.'}
        </p>
      )}

      <section className="card penta-card" aria-label="Pentagono">
        <Pentagon axes={axes.map((c) => ({ label: categoryName(c.categoryId), value: c.value }))} />
      </section>

      <section className="cats" aria-label="Categorie">
        {axes.map((c) => (
          <Category
            key={c.categoryId}
            cat={c}
            open={open === c.categoryId}
            onToggle={() => setOpen(open === c.categoryId ? null : c.categoryId)}
            onPick={setSheet}
          />
        ))}
      </section>

      {sheet && (
        <RecordSheet
          subId={sheet}
          records={records as Row[]}
          weights={weights}
          summary={summary}
          onClose={() => setSheet(null)}
          onCelebrate={setParty}
        />
      )}
    </>
  );
}

/** Intestazione: avatar (segnaposto finché non c'è il ticket 11), nome, livello, peso con modifica rapida. */
function Profile({ level, elite, stage, aura, bodyweight }: { level: number; elite: boolean; stage: number; aura: number; bodyweight: { date: string; kg: number } | null }) {
  const name = useProfile().data?.displayName;
  return (
    <section className="card hero" aria-label="Profilo">
      <div className={`avatar${elite ? ' elite' : ''}`} style={{ ['--aura' as string]: aura }} aria-hidden="true" title={`Stadio ${stage + 1}`}>
        <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>
      </div>
      <div className="hero-txt">
        {name ? (
          <p className="hero-name">{name}</p>
        ) : (
          <Link className="link small" to="/account">
            Scegli il tuo nome
          </Link>
        )}
        <p className="hero-level">
          <span className="eyebrow">Livello</span>
          <b className={elite ? 'elite' : undefined}>{level}</b>
          {elite && <span className="tag-elite">ELITE</span>}
        </p>
      </div>
      <Weight current={bodyweight} />
    </section>
  );
}

function Weight({ current }: { current: { date: string; kg: number } | null }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const save = useSetBodyWeight();

  if (draft === null)
    return (
      <div className="weight">
        <span className="fld-l">Peso</span>
        <b>{current ? `${fmt(current.kg)} kg` : '—'}</b>
        <button type="button" className="link tap" onClick={() => setDraft(current ? numInput(current.kg) : '')} aria-label={current ? 'Modifica peso corporeo' : 'Inserisci peso corporeo'}>
          {current ? 'Modifica' : 'Inserisci'}
        </button>
        {current && <span className="hint">dal {shortDate(current.date)}</span>}
      </div>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Math.round(parseNum(draft) * 10) / 10;
    if (!validateBodyweight(kg)) return setErr(`Tra ${LIMITS.minBodyweightKg} e ${LIMITS.maxBodyweightKg} kg`);
    if (current && kg === current.kg) return setDraft(null);
    save.mutate({ kg }, { onSuccess: () => setDraft(null) });
  };

  return (
    <form className="weight edit" onSubmit={submit}>
      <label className="fld-l" htmlFor="bw-input">
        Peso di oggi (kg)
      </label>
      <div className="row">
        <input
          id="bw-input"
          className="bw-in"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={draft}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? 'bw-err' : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setErr(null);
          }}
        />
        <button className="btn small" disabled={save.isPending} aria-busy={save.isPending || undefined}>
          Salva
        </button>
        <button type="button" className="btn small ghost" onClick={() => setDraft(null)}>
          Annulla
        </button>
      </div>
      {err && (
        <span className="fld-err" id="bw-err">
          {err}
        </span>
      )}
    </form>
  );
}

/** Barra della zona: fino a 100 piena su 100; in ELITE la prima metà è piena e la seconda cresce da 101 a 200. */
function ZoneBar({ value, elite }: { value: number; elite: boolean }) {
  return (
    <span className={`zbar${elite ? ' elite' : ''}`} aria-hidden="true">
      {elite ? (
        <>
          <i className="full" style={{ width: '50%' }} />
          <i className="hot" style={{ left: '50%', width: `${Math.min(100, value - 100) / 2}%` }} />
          <em />
        </>
      ) : (
        <i style={{ width: `${Math.min(100, value)}%` }} />
      )}
    </span>
  );
}

function Category({ cat, open, onToggle, onPick }: { cat: CategoryScore<Row>; open: boolean; onToggle: () => void; onPick: (id: SubId) => void }) {
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
            <SubRow key={s.subId} s={s} onPick={() => onPick(s.subId)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubRow({ s, onPick }: { s: SubScore<Row>; onPick: () => void }) {
  const rule = subRule(s.subId)!;
  const elite = s.zone === 'elite';
  return (
    <li>
      <button type="button" className="subrow" onClick={onPick}>
        <span className="sub-name">{rule.name}</span>
        <span className={`sub-pc${elite ? ' elite' : ''}`}>{subPercentText(s)}</span>
        <span className={`zbar thin${elite ? ' elite' : ''}`} aria-hidden="true">
          <i className={elite ? 'hot' : undefined} style={{ width: `${s.percent}%` }} />
        </span>
        <span className="sub-best">
          {s.best ? `${recordText(s.best)} · ${shortDate(s.best.date)}` : 'Nessun record: tocca per inserirlo'}
          {s.unlocked && !elite && <span className="tag-elite">ELITE sbloccata</span>}
          {s.needsBodyweight && <span className="warn"> · manca il peso</span>}
        </span>
      </button>
    </li>
  );
}
