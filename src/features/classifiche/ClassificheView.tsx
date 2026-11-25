import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlaceForm } from '../../components/PlaceFields';
import { PageTitle, Seg, Skeleton } from '../../components/ui';
import { useLevel, useProfile, useRanking, useRankingOverview } from '../../data/hooks';
import { RANKING_SCOPES, type Profile, type RankingMetric, type RankingScope } from '../../data/types';
import { fmtInt, METRICS, metricName, rowLevel, scopeKind, scopePlace, scopeTitle, tileLabel, tileText, unavailableText, withGaps } from './rankingView';

/**
 * Classifiche (ticket 38): le pastiglie della metrica (Generale e le 5 categorie) e i 5 riquadri Amici, Provincia,
 * Regione, Nazione, Mondo con posizione e partecipanti; toccando un riquadro si apre la classifica con le prime 3
 * righe e i vicini. Per ora è una pagina a sé, raggiunta da Account: il ticket 39 porta questo blocco dentro la Home.
 */
export function ClassificheView() {
  const profile = useProfile();
  const [metric, setMetric] = useState<RankingMetric>('generale');
  const [open, setOpen] = useState<RankingScope | null>(null);
  return (
    <>
      <PageTitle title="Classifiche" />
      {profile.data && !profile.data.country && (
        <section className="card">
          <h2>Dove ti alleni?</h2>
          <p className="sub">Serve per le classifiche di provincia, regione e nazione. Lo scegli da un elenco: l'app non usa la posizione del telefono.</p>
          <PlaceForm />
        </section>
      )}
      <RankingBoard metric={metric} onMetric={setMetric} onOpen={setOpen} profile={profile.data} />
      {open && <RankingSheet scope={open} metric={metric} profile={profile.data} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Pastiglie e riquadri: il blocco "Classifica" del mockup Home. */
export function RankingBoard({ metric, onMetric, onOpen, profile }: {
  metric: RankingMetric;
  onMetric: (m: RankingMetric) => void;
  onOpen: (s: RankingScope) => void;
  profile: Profile | undefined;
}) {
  const overview = useRankingOverview(metric);
  const { summary, isLoading } = useLevel();
  const noPoints = !isLoading && summary.total === 0;
  return (
    <section className="card rk">
      <div className="card-h">
        <h2>Classifica</h2>
        {profile && <span className="rk-vis">{profile.isPrivate ? 'Profilo privato' : 'Profilo pubblico'}</span>}
      </div>
      <Seg label="Punteggio della classifica" value={metric} options={METRICS.map((m) => ({ v: m, l: metricName(m) }))} onChange={onMetric} />
      {overview.error && !overview.data ? (
        <p className="empty" role="alert">
          Non riesco a leggere le classifiche. Controlla la connessione e riprova.
        </p>
      ) : (
        <ul className="rk-tiles" aria-busy={overview.isLoading || undefined}>
          {RANKING_SCOPES.map((s) => {
            const place = overview.data?.[s];
            const t = tileText(place);
            return (
              <li key={s}>
                <button type="button" className="rk-tile" aria-label={`${tileLabel(s, profile, place)}. Apri la classifica`} onClick={() => onOpen(s)}>
                  <span className="rk-kind">{scopeKind(s)}</span>
                  <b className={place?.position ? undefined : 'off'}>{t.big}</b>
                  <small>{t.small}</small>
                  <span className="rk-place">{scopePlace(s, profile) ?? ' '}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {noPoints && (
        <p className="hint mt-12">
          Entri in classifica col primo record: <Link to="/livello">vai a Livello</Link>.
        </p>
      )}
      {profile?.isPrivate && (
        <p className="hint mt-12">
          Fuori da chi ti segue nessuno vede il tuo nome: nelle posizioni degli altri conti come una riga nascosta. Si cambia da <Link to="/account">Account</Link>.
        </p>
      )}
    </section>
  );
}

/** Una classifica: dove sono, le prime 3 righe visibili e i vicini. */
function RankingSheet({ scope, metric, profile, onClose }: { scope: RankingScope; metric: RankingMetric; profile: Profile | undefined; onClose: () => void }) {
  const ranking = useRanking(scope, metric);
  const title = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // tastiera: Esc chiude; il fuoco entra nel pannello e, alla chiusura, torna dove era
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    title.current?.focus();
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
      back?.focus?.();
    };
  }, []);

  const r = ranking.data;
  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rk-sheet" role="dialog" aria-modal="true" aria-labelledby="rk-sheet-title">
        <div className="card-h">
          <h2 id="rk-sheet-title" ref={title} tabIndex={-1}>
            {scopeTitle(scope, profile)}
          </h2>
          <button type="button" className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <p className="rk-sheet-sub">
          {scopePlace(scope, profile) ? `${scopeKind(scope)} · ` : ''}
          {metricName(metric)}
          {r?.available && ` · ${fmtInt(r.participants)} ${r.participants === 1 ? 'partecipante' : 'partecipanti'}`}
        </p>
        {ranking.isLoading && <Skeleton inline />}
        {ranking.error && !r && (
          <p className="empty" role="alert">
            Non riesco a leggere la classifica. Controlla la connessione e riprova.
          </p>
        )}
        {r && !r.available && <p className="empty">{unavailableText(scope, profile)}</p>}
        {r?.available && r.rows.length === 0 && <p className="empty">Ancora nessuno in questa classifica.</p>}
        {r?.available && r.rows.length > 0 && (
          <ol className="rk-rows">
            {withGaps(r.rows).map((item) =>
              item.kind === 'gap' ? (
                <li key={item.key} className="rk-gap" aria-hidden="true">
                  ⋯
                </li>
              ) : (
                <li key={item.row.userId} className={item.row.me ? 'rk-row me' : 'rk-row'} aria-current={item.row.me || undefined}>
                  <span className="rk-pos">
                    <span className="sr-only">Posizione </span>
                    {fmtInt(item.row.position)}
                  </span>
                  <span className="rk-who">
                    <b>{item.row.name ?? 'Senza nome'}</b>
                    <small>
                      {rowLevel(metric, item.row.score)}
                      {item.row.me && ' · tu'}
                    </small>
                  </span>
                  <span className="rk-pts">
                    {fmtInt(item.row.score)}
                    <small> pt</small>
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
        {r?.available && r.position === null && (
          <p className="hint mt-12">
            Non hai ancora punti: entri in classifica col primo record.
          </p>
        )}
        {r?.available && scope === 'amici' && r.participants <= 1 && <p className="hint mt-12">Qui compariranno le persone che segui.</p>}
        {r?.available && scope !== 'amici' && (
          <p className="hint mt-12">I profili privati contano nelle posizioni ma le loro righe non si vedono.</p>
        )}
      </div>
    </div>
  );
}
