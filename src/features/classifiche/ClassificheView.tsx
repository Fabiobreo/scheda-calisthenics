import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Seg, Skeleton } from '../../components/ui';
import { useLevel, useRanking, useRankingOverview } from '../../data/hooks';
import { RANKING_SCOPES, type Profile, type RankingMetric, type RankingRow, type RankingScope } from '../../data/types';
import { fmtInt, homeRows, METRICS, metricName, rowLevel, scopeKind, scopePlace, scopeTitle, tileLabel, tileText, unavailableText, withGaps } from './rankingView';

/**
 * Classifiche (ticket 38): le pastiglie della metrica (Generale e le 5 categorie) e i 5 riquadri Amici, Provincia,
 * Regione, Nazione, Mondo con posizione e partecipanti; toccando un riquadro si apre la classifica con le prime 3
 * righe e i vicini. Sotto i riquadri, "Tra amici": la classifica di chi segui, già aperta. Dal ticket 39 non è più una pagina a sé: `RankingBoard` e `RankingSheet` stanno nella Home.
 */

/** Pastiglie e riquadri: il blocco "Classifica" del mockup Home. */
export function RankingBoard({ metric, onMetric, onOpen, onPerson, profile }: {
  metric: RankingMetric;
  onMetric: (m: RankingMetric) => void;
  onOpen: (s: RankingScope) => void;
  /** tocco sul nome di una riga: apre il profilo di quella persona */
  onPerson: (row: RankingRow) => void;
  profile: Profile | undefined;
}) {
  const overview = useRankingOverview(metric);
  const { summary, isLoading } = useLevel();
  const noPoints = !isLoading && summary.total === 0;
  return (
    <section className="rk">
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
      {!overview.error && <FriendsRanking metric={metric} onOpen={() => onOpen('amici')} onPerson={onPerson} />}
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

/** Quante righe della classifica tra amici stanno nella Home; le altre dietro "Vedi tutti". */
const HOME_FRIENDS = 5;

/**
 * "Tra amici", nella Home sotto i riquadri: la classifica di chi segui si legge senza aprire niente (feedback del 27
 * novembre 2026). Le prime righe e la tua; tutta la classifica nel foglio.
 */
function FriendsRanking({ metric, onOpen, onPerson }: { metric: RankingMetric; onOpen: () => void; onPerson: (row: RankingRow) => void }) {
  const ranking = useRanking('amici', metric);
  const r = ranking.data;
  if (!r?.available) return null;
  const alone = r.rows.every((row) => row.me);
  return (
    <div className="rk-fr">
      <div className="rk-fr-h">
        <h3>Tra amici</h3>
        {r.rows.length > HOME_FRIENDS && (
          <button type="button" className="link small" onClick={onOpen}>
            Vedi tutti ({fmtInt(r.participants)})
          </button>
        )}
      </div>
      {alone ? (
        <p className="rk-fr-empty">
          Qui vedi la classifica con le persone che segui, dal loro primo record: <Link to="/persone">cerca i tuoi amici</Link>.
        </p>
      ) : (
        <RankingRows rows={homeRows(r.rows, HOME_FRIENDS)} metric={metric} onPerson={onPerson} />
      )}
    </div>
  );
}

/** Le righe di una classifica, col segno di salto tra due non consecutive. Il nome degli altri apre il loro profilo. */
function RankingRows({ rows, metric, onPerson }: { rows: readonly RankingRow[]; metric: RankingMetric; onPerson: (row: RankingRow) => void }) {
  return (
    <ol className="rk-rows">
      {withGaps(rows).map((item) =>
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
            {item.row.me ? (
              <span className="rk-who">
                <b>{item.row.name ?? 'Senza nome'}</b>
                <small>{rowLevel(metric, item.row.score)} · tu</small>
              </span>
            ) : (
              <button type="button" className="rk-who who-btn" onClick={() => onPerson(item.row)} aria-label={`${item.row.name ?? 'Senza nome'}, ${rowLevel(metric, item.row.score)}: apri il profilo`}>
                <b>{item.row.name ?? 'Senza nome'}</b>
                <small>{rowLevel(metric, item.row.score)}</small>
              </button>
            )}
            <span className="rk-pts">
              {fmtInt(item.row.score)}
              <small> pt</small>
            </span>
          </li>
        ),
      )}
    </ol>
  );
}

/** Una classifica: dove sono e le righe (tra amici tutte; negli altri ambiti le prime 3 visibili e i vicini). */
export function RankingSheet({ scope, metric, profile, onClose, onPerson }: { scope: RankingScope; metric: RankingMetric; profile: Profile | undefined; onClose: () => void; onPerson: (row: RankingRow) => void }) {
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
        {r?.available && r.rows.length > 0 && <RankingRows rows={r.rows} metric={metric} onPerson={onPerson} />}
        {r?.available && r.position === null && (
          <p className="hint mt-12">
            Non hai ancora punti: entri in classifica col primo record.
          </p>
        )}
        {r?.available && scope === 'amici' && r.participants <= 1 && (
          <p className="hint mt-12">
            Qui compariranno le persone che segui: <Link to="/persone">cerca i tuoi amici</Link>.
          </p>
        )}
        {r?.available && scope === 'amici' && r.participants > 1 && (
          <p className="hint mt-12">Chi segui compare qui dal suo primo record.</p>
        )}
        {r?.available && scope !== 'amici' && (
          <p className="hint mt-12">I profili privati contano nelle posizioni ma le loro righe non si vedono.</p>
        )}
      </div>
    </div>
  );
}
