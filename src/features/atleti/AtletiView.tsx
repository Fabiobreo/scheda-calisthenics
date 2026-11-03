import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AthleteScope, useSession } from '../../app/session';
import { ConfirmButton, Seg, TypeChip } from '../../components/ui';
import { useData, useEndLink, useLinks } from '../../data/hooks';
import { DAY_SHORT, addDays, longDate, mondayOf, parseDate, shortDate, todayStr, weekLabel, weekdayIndex } from '../../lib/dates';
import { fmt, fmtSets } from '../../lib/format';
import { byDay } from '../../lib/plan';
import { GraficiView } from '../grafici/GraficiView';
import { RegistroView } from '../registro/RegistroView';

const nameOf = (n: string | null) => n ?? 'Atleta senza nome';

/** Gli atleti che il trainer segue. */
export function AtletiView() {
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  const end = useEndLink('Atleta scollegato');
  const athletes = links.data?.filter((l) => l.trainerId === myId) ?? [];

  return (
    <section className="card">
      <h2>Atleti</h2>
      <p className="sub">Gli atleti che segui: vedi programma, storico e grafici. Per ora in sola lettura.</p>
      {links.isLoading ? (
        <p className="empty">Caricamento…</p>
      ) : !athletes.length ? (
        <p className="empty">
          Nessun atleta. Manda il tuo link d'invito da <Link to="/account">Account</Link>.
        </p>
      ) : (
        athletes.map((l) => (
          <div className="entry" key={l.id}>
            <div>
              <b>{nameOf(l.athleteName)}</b>
              <div className="pmeta">Collegato dal {shortDate(l.createdAt.slice(0, 10))}</div>
            </div>
            <div className="pact col">
              <Link className="btn small" to={`/atleti/${l.athleteId}`}>
                Apri
              </Link>
              <ConfirmButton confirmLabel="Scollegare?" onConfirm={() => end.mutate(l.id)}>
                Scollega
              </ConfirmButton>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

type Tab = 'programma' | 'registro' | 'grafici';

/** Un atleta visto dal suo trainer: le viste dentro leggono i suoi dati, senza poterli modificare. */
export function AtletaView() {
  const { athleteId = '' } = useParams();
  const session = useSession();
  const myId = session.status === 'ready' ? session.userId : '';
  const links = useLinks();
  const [tab, setTab] = useState<Tab>('programma');
  const link = links.data?.find((l) => l.trainerId === myId && l.athleteId === athleteId);

  if (links.isLoading) return <p className="empty">Caricamento…</p>;
  if (!link)
    return (
      <section className="card">
        <h2>Atleta</h2>
        <p className="empty">
          Non segui questo atleta, o si è scollegato. Torna ad <Link to="/atleti">Atleti</Link>.
        </p>
      </section>
    );

  return (
    <>
      <section className="card">
        <div className="card-h">
          <h2>{nameOf(link.athleteName)}</h2>
          <Link className="link small" to="/atleti">
            ‹ Atleti
          </Link>
        </div>
        <p className="sub">Sola lettura: i dati sono dell'atleta.</p>
        <div style={{ marginTop: 14 }}>
          <Seg
            label="Sezione"
            value={tab}
            options={[
              { v: 'programma', l: 'Programma' },
              { v: 'registro', l: 'Storico' },
              { v: 'grafici', l: 'Grafici' },
            ]}
            onChange={setTab}
          />
        </div>
      </section>
      <AthleteScope athleteId={athleteId}>
        <AthleteData tab={tab} />
      </AthleteScope>
    </>
  );
}

function AthleteData({ tab }: { tab: Tab }) {
  const { isLoading, error } = useData();
  if (isLoading) return <p className="empty">Caricamento…</p>;
  if (error) return <div className="banner">Non riesco a leggere i dati dell'atleta. Riprova.</div>;
  if (tab === 'registro') return <RegistroView />;
  if (tab === 'grafici') return <GraficiView />;
  return <AthletePlan />;
}

/** Programma dell'atleta settimana per settimana, con quello che ha già registrato. */
function AthletePlan() {
  const { active, exercises, entries, plan } = useData();
  const today = todayStr();
  const thisMonday = mondayOf(today);
  const [monday, setMonday] = useState(thisMonday);
  const [day, setDay] = useState(weekdayIndex());
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const visible = plan.filter((p) => active.some((e) => e.id === p.exerciseId));
  const date = addDays(monday, day);
  const items = visible.filter((p) => p.date === date).sort(byDay);
  const title = longDate(date);

  return (
    <section className="card">
      <h2>Programma</h2>
      <div className="weeknav">
        <button className="x" onClick={() => setMonday(addDays(monday, -7))} aria-label="Settimana precedente">
          ‹
        </button>
        <div className="weeknav-t">
          <b>{weekLabel(monday)}</b>
          {monday === thisMonday ? (
            <span>Questa settimana</span>
          ) : (
            <button
              className="link small"
              onClick={() => {
                setMonday(thisMonday);
                setDay(weekdayIndex());
              }}
            >
              Torna a oggi
            </button>
          )}
        </div>
        <button className="x" onClick={() => setMonday(addDays(monday, 7))} aria-label="Settimana successiva">
          ›
        </button>
      </div>
      <div className="days">
        {DAY_SHORT.map((d, i) => {
          const dt = addDays(monday, i);
          const n = visible.filter((p) => p.date === dt).length;
          return (
            <button
              key={d}
              className={`day${i === day ? ' on' : ''}${dt === today ? ' today' : ''}`}
              onClick={() => setDay(i)}
              aria-label={`${longDate(dt)}, ${n} ${n === 1 ? 'esercizio' : 'esercizi'}`}
              aria-pressed={i === day}
            >
              <span>{d}</span>
              <i>{parseDate(dt).getDate()}</i>
              <small>{n ? `${n} es.` : '–'}</small>
            </button>
          );
        })}
      </div>
      <h3 style={{ fontSize: 22, marginTop: 18 }}>{title.charAt(0).toUpperCase() + title.slice(1)}</h3>
      <div className="plan">
        {items.length === 0 && <p className="empty">Niente in programma.</p>}
        {items.map((p) => {
          const ex = byId.get(p.exerciseId)!;
          const sc = p.scheme;
          const saved = entries.find((e) => e.exerciseId === ex.id && e.kind === 'training' && e.date === date);
          return (
            <div className="pitem" key={p.id}>
              <div>
                <div className="pname">{ex.name}</div>
                <div className="pmeta">
                  Previsto: {sc.sets} × {sc.reps} · {fmt(sc.weight)} kg{sc.rest > 0 && ` · rec. ${sc.rest} s`}
                </div>
                <div className="pmeta">
                  {saved ? `Fatto: ${fmtSets(saved.sets)}` : date < today ? 'Non registrato' : 'Da fare'}
                </div>
                <div className="chips">
                  <TypeChip type={ex.type} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
