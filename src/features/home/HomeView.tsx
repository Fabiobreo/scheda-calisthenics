import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconSearch } from '../../components/icons';
import { PlaceForm } from '../../components/PlaceFields';
import { EmptyPeople, EmptyState, PageTitle, Skeleton } from '../../components/ui';
import { useFeed, usePeople, useProfile } from '../../data/hooks';
import type { FeedEvent, RankingMetric, RankingScope } from '../../data/types';
import { whenIdle } from '../../lib/idle';
import { RankingBoard, RankingSheet } from '../classifiche/ClassificheView';
import { FirstStepsGuide } from '../livello/FirstStepsCard';
import { initial, newsLine, overtakeMetric, personName, requestsText, timeAgo } from './socialView';

// i fogli delle novità si aprono a un tocco: si scaricano dopo il primo disegno
const loadSheets = () => import('./FeedSheets');
const NewsSheet = lazy(() => loadSheets().then((m) => ({ default: m.NewsSheet })));
const RecordNewsSheet = lazy(() => loadSheets().then((m) => ({ default: m.RecordNewsSheet })));
const WorkoutSheet = lazy(() => loadSheets().then((m) => ({ default: m.WorkoutSheet })));

/** Quante novità stanno nella Home; le altre dietro "Vedi tutte". */
const HOME_NEWS = 4;

type HomeSheet =
  | { kind: 'ranking'; scope: RankingScope; metric: RankingMetric; fromNews?: boolean }
  | { kind: 'news' }
  | { kind: 'record'; event: FeedEvent; fromNews?: boolean }
  | { kind: 'workout'; event: FeedEvent; fromNews?: boolean };

/**
 * Home (ticket 39): "Cerca persone", la Classifica (le pastiglie della metrica e i 5 riquadri del 38: toccandone uno
 * si apre la classifica con i vicini) e le Novità delle persone che segui. In cima, solo quando servono: i primi
 * passi (28), il luogo per chi non l'ha ancora indicato (38) e le richieste di seguirti. È la stessa per atleti e
 * trainer.
 */
export function HomeView() {
  const profile = useProfile();
  const people = usePeople();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<RankingMetric>('generale');
  const [sheet, setSheet] = useState<HomeSheet | null>(null);
  useEffect(() => whenIdle(() => void loadSheets()), []);

  const requests = people.data?.requests ?? [];

  /** Il bottone di una novità: apre il record, l'allenamento o la classifica del sorpasso. */
  const openEvent = (event: FeedEvent, fromNews = false) => {
    const m = overtakeMetric(event);
    if (event.kind === 'record') setSheet({ kind: 'record', event, fromNews });
    else if (event.kind === 'workout') setSheet({ kind: 'workout', event, fromNews });
    else if (m) setSheet({ kind: 'ranking', scope: 'amici', metric: m, fromNews });
  };
  // un foglio aperto da "Vedi tutte" si richiude sull'elenco
  const close = () => setSheet(sheet && sheet.kind !== 'news' && sheet.fromNews ? { kind: 'news' } : null);

  return (
    <>
      <PageTitle title="Home" />
      <FirstStepsGuide onRecord={() => navigate('/livello')} />

      {profile.data && !profile.data.country && (
        <section className="card">
          <h2>Dove ti alleni?</h2>
          <p className="sub">Serve per le classifiche di provincia, regione e nazione. Lo scegli da un elenco: l'app non usa la posizione del telefono.</p>
          <PlaceForm />
        </section>
      )}

      {requests.length > 0 && (
        <Link className="card home-req" to="/persone">
          <span className="nv-av" aria-hidden="true">
            {initial(requests[0].name)}
          </span>
          <span className="home-req-t">{requestsText(requests.map((r) => r.name))}</span>
          <span className="home-req-go" aria-hidden="true">
            Vedi ›
          </span>
        </Link>
      )}

      <RankingBoard metric={metric} onMetric={setMetric} onOpen={(scope) => setSheet({ kind: 'ranking', scope, metric })} profile={profile.data} />

      <News
        onOpen={openEvent}
        onAll={() => setSheet({ kind: 'news' })}
        loading={people.isLoading}
        friends={people.data ? people.data.following.filter((p) => p.relation === 'accepted').length : null}
        waiting={people.data?.following.some((p) => p.relation === 'pending') ?? false}
      />

      {/* in fondo: nel mockup di Michael la Home apre con la Classifica (25 novembre 2026) */}
      <Link className="home-find" to="/persone">
        <IconSearch />
        <span>Cerca persone</span>
        {requests.length > 0 && (
          <b className="badge" aria-label={`${requests.length} ${requests.length === 1 ? 'richiesta' : 'richieste'} di seguirti`}>
            {requests.length}
          </b>
        )}
      </Link>

      {sheet?.kind === 'ranking' && <RankingSheet scope={sheet.scope} metric={sheet.metric} profile={profile.data} onClose={close} />}
      {sheet && sheet.kind !== 'ranking' && (
        <Suspense fallback={null}>
          {sheet.kind === 'news' && <NewsSheet onClose={close} onOpen={(e) => openEvent(e, true)} />}
          {sheet.kind === 'record' && <RecordNewsSheet event={sheet.event} onClose={close} />}
          {sheet.kind === 'workout' && <WorkoutSheet event={sheet.event} onClose={close} />}
        </Suspense>
      )}
    </>
  );
}

/**
 * Novità: le ultime delle persone che segui, col contatore delle non lette e "Vedi tutte". `friends`: quante persone
 * segui (null = non si è riusciti a saperlo); `waiting`: hai richieste non ancora accettate.
 */
function News({ onOpen, onAll, loading, friends, waiting }: { onOpen: (e: FeedEvent) => void; onAll: () => void; loading: boolean; friends: number | null; waiting: boolean }) {
  const feed = useFeed(HOME_NEWS);
  const events = feed.data?.events ?? [];
  const unread = feed.data?.unread ?? 0;
  return (
    <section className="nv" aria-labelledby="nv-h">
      <div className="card-h">
        <span className="card-t">
          <h2 id="nv-h">Novità</h2>
          {unread > 0 && (
            <b className="badge" aria-label={`${unread} non ${unread === 1 ? 'letta' : 'lette'}`}>
              {unread > 99 ? '99+' : unread}
            </b>
          )}
        </span>
        {events.length > 0 && (
          <button type="button" className="link small" onClick={onAll}>
            Vedi tutte
          </button>
        )}
      </div>
      {feed.error && !feed.data ? (
        <p className="empty" role="alert">
          Non riesco a leggere le novità. Controlla la connessione e riprova.
        </p>
      ) : feed.isLoading || loading ? (
        <Skeleton inline />
      ) : events.length > 0 ? (
        <NewsList events={events} onOpen={onOpen} />
      ) : friends === 0 ? (
        <EmptyState
          small
          art={<EmptyPeople />}
          title="Cerca i tuoi amici"
          actions={
            <Link className="btn" to="/persone">
              Cerca persone
            </Link>
          }
        >
          {waiting
            ? 'Le tue richieste aspettano una risposta: le novità arrivano quando vengono accettate.'
            : 'Segui chi si allena con te: qui vedrai i loro record, gli allenamenti che condividono e quando ti superano in classifica.'}
        </EmptyState>
      ) : (
        <p className="empty">Ancora nessuna novità dalle persone che segui.</p>
      )}
    </section>
  );
}

/** Righe delle novità: iniziale, nome, che cosa è successo, quando, e il bottone che la apre. */
export function NewsList({ events, onOpen }: { events: FeedEvent[]; onOpen: (e: FeedEvent) => void }) {
  return (
    <ul className="nv-list">
      {events.map((e) => {
        const line = newsLine(e);
        const name = personName(e.actorName);
        return (
          <li key={e.id} className={e.unread ? 'nv-row new' : 'nv-row'}>
            <span className="nv-av" aria-hidden="true">
              {initial(e.actorName)}
            </span>
            <span className="nv-txt">
              <span>
                <b>{name}</b> {line.text}
              </span>
              <small>
                {timeAgo(e.createdAt)}
                {e.unread && <span className="sr-only"> · non letta</span>}
              </small>
            </span>
            {line.action && (
              <button type="button" className="btn small ghost" onClick={() => onOpen(e)} aria-label={`${line.action}: ${name}, ${line.text}`}>
                {line.action}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
