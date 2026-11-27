import { Pentagon } from '../../components/Pentagon';
import { Sheet } from '../../components/Sheet';
import { Skeleton } from '../../components/ui';
import { useFollow, usePersonProfile, useUnfollow } from '../../data/hooks';
import type { FollowState } from '../../data/types';
import { shortDate } from '../../lib/dates';
import { fmtInt } from '../classifiche/rankingView';
import { chainName, pentagonScale, recordText } from '../livello/levelView';
import { followButton, personName, personSub, scoresSummary, sharedRecord, type RecordNews } from './socialView';

/** Chi aprire: l'identificativo, e il nome già noto da dove si è toccato (titolo mentre il profilo arriva). */
export interface PersonRef {
  userId: string;
  name: string | null;
}

/**
 * Profilo di una persona (27 novembre 2026), dal suo nome in classifica, tra le persone o nelle novità. Di tutti:
 * nome, livello, luogo se visibile e il bottone per seguire. Di chi segui (richiesta accettata) anche i punti del
 * complessivo e delle 5 categorie col pentagono, e i record che ha condiviso. Mai il peso corporeo.
 */
export function PersonSheet({ person, onClose }: { person: PersonRef; onClose: () => void }) {
  const profile = usePersonProfile(person.userId);
  const p = profile.data;
  const name = personName(p?.card.name ?? person.name);
  const records = (p?.records ?? []).map(sharedRecord).filter((r): r is RecordNews => r !== null);
  const level = p?.scores && p.scores.total > 0 ? scoresSummary(p.scores) : null;

  return (
    <Sheet title={name} sub={p ? `${personSub(p.card)}${p.card.isPrivate ? ' · privato' : ''}` : undefined} className="ps-sheet" onClose={onClose}>
      {profile.isLoading && <Skeleton inline />}
      {profile.error && !p && (
        <p className="empty" role="alert">
          Non riesco a leggere il profilo. Controlla la connessione e riprova.
        </p>
      )}
      {profile.isSuccess && !p && <p className="empty">Questo profilo non si può aprire.</p>}
      {p && (
        <>
          {/* visibile senza seguirla: sono io */}
          {!(p.visible && p.card.relation !== 'accepted') && <Follow userId={p.card.userId} name={name} relation={p.card.relation} isPrivate={p.card.isPrivate} />}
          {!p.visible ? (
            <p className="hint mt-12">
              {p.card.relation === 'pending'
                ? `La tua richiesta aspetta una risposta: punti e record di ${name} si vedono quando la accetta.`
                : `Segui ${name} per vedere i suoi punti e i record che condivide.`}
            </p>
          ) : (
            <>
              {level ? (
                <>
                  <div className="ps-hero">
                    <p className="ps-total">
                      <b>{fmtInt(level.total)}</b> pt<small>{level.name}</small>
                    </p>
                    <div className="ps-penta">
                      <Pentagon scale={pentagonScale(level)} />
                    </div>
                  </div>
                  <ul className="ps-cats">
                    {level.categories.map((c) => (
                      <li key={c.categoryId}>
                        <span>
                          <b>{c.label}</b>
                          <small>{c.name}</small>
                        </span>
                        <span className="rk-pts">
                          {fmtInt(c.points)}
                          <small> pt</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="empty">{name} non ha ancora punti.</p>
              )}
              <h3 className="ps-h">Record condivisi{records.length > 0 && ` · ${records.length}`}</h3>
              {records.length === 0 ? (
                <p className="empty">Nessun record condiviso finora.</p>
              ) : (
                <ul className="ps-recs">
                  {records.map((r) => (
                    <li key={`${r.subId}/${r.stage}`}>
                      <span>
                        <b>{chainName(r.subId)}</b>
                        <small>{recordText(r)}</small>
                      </span>
                      {r.date && <time dateTime={r.date}>{shortDate(r.date)}</time>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="hint mt-12">Vedi quello che {name} condivide con chi lo segue: il peso corporeo e gli altri record restano privati.</p>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/** "Segui" (a un profilo privato parte una richiesta), oppure lo stato che c'è e il modo di tornare indietro. */
function Follow({ userId, name, relation, isPrivate }: { userId: string; name: string; relation: FollowState; isPrivate: boolean }) {
  const follow = useFollow();
  const unfollow = useUnfollow(relation === 'pending' ? 'Richiesta ritirata' : 'Hai smesso di seguire');
  const b = followButton(relation);
  return (
    <div className="row mt-12">
      <button type="button" className={`btn small${b.disabled ? ' ghost' : ''}`} disabled={b.disabled || follow.isPending} aria-label={b.disabled ? `${b.label}: ${name}` : isPrivate ? `Chiedi di seguire ${name}` : `Segui ${name}`} onClick={() => follow.mutate(userId)}>
        {b.label}
      </button>
      {relation !== 'none' && (
        <button type="button" className="btn small ghost" disabled={unfollow.isPending} onClick={() => unfollow.mutate(userId)}>
          {relation === 'pending' ? 'Ritira la richiesta' : 'Smetti di seguire'}
        </button>
      )}
    </div>
  );
}
