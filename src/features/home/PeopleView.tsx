import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../app/toast';
import { Sheet } from '../../components/Sheet';
import { ConfirmButton, EmptyPeople, EmptyState, Field, MoreMenu, PageTitle, SearchField, Skeleton, type MenuItem } from '../../components/ui';
import {
  useAcceptFollow,
  useBlockUser,
  useDeleteSharedWorkout,
  useFollow,
  useFollowCode,
  useFollowInvite,
  useMySharedWorkouts,
  usePeople,
  useProfile,
  useRejectFollow,
  useRemoveFollower,
  useReportUser,
  useRotateFollowCode,
  useSearchPeople,
  useUnblockUser,
  useUnfollow,
} from '../../data/hooks';
import type { PersonCard } from '../../data/types';
import { shortDate } from '../../lib/dates';
import { plural } from '../../lib/format';
import { publicProfilesEnabled } from '../../lib/privacy';
import { followButton, followLink, initial, personName, personSub } from './socialView';

/**
 * Persone (ticket 39), dalla lente della Home: cerca per nome, il proprio link "seguimi", le richieste da accettare,
 * chi segui, chi ti segue, chi hai bloccato, gli allenamenti che hai condiviso. Di ognuno si vedono nome e livello; il luogo solo se il profilo è
 * pubblico o se lo segui. `inviteCode`: si arriva dal link di un'altra persona, che compare in cima.
 */
export function PeopleView({ inviteCode }: { inviteCode?: string }) {
  const people = usePeople();
  const [report, setReport] = useState<PersonCard | null>(null);
  const p = people.data;
  return (
    <>
      <PageTitle show title="Persone" />
      {inviteCode && <InviteCard code={inviteCode} onReport={setReport} />}
      <SearchCard onReport={setReport} />
      {p && p.requests.length > 0 && <Requests people={p.requests} onReport={setReport} />}
      <LinkCard />
      {people.isLoading && <Skeleton />}
      {people.error && !p && (
        <div className="banner" role="alert">
          Non riesco a leggere le persone. Controlla la connessione e riprova.
        </div>
      )}
      {p && (
        <>
          <section className="card" aria-labelledby="pp-following">
            <h2 id="pp-following">Persone che segui{p.following.length > 0 && ` · ${p.following.length}`}</h2>
            {p.following.length === 0 ? (
              <EmptyState small art={<EmptyPeople />} title="Non segui ancora nessuno">
                Cerca qualcuno per nome qui sopra, o fatti mandare il suo link.
              </EmptyState>
            ) : (
              <ul className="pp-list">
                {p.following.map((x) => (
                  <Person key={x.userId} person={x} onReport={setReport} />
                ))}
              </ul>
            )}
          </section>
          {p.followers.length > 0 && (
            <section className="card" aria-labelledby="pp-followers">
              <h2 id="pp-followers">Ti seguono · {p.followers.length}</h2>
              <p className="sub">Vedono il tuo nome in classifica, i record che condividi e gli allenamenti che condividi.</p>
              <ul className="pp-list">
                {p.followers.map((x) => (
                  <Person key={x.userId} person={x} onReport={setReport} followBack />
                ))}
              </ul>
            </section>
          )}
          {p.blocked.length > 0 && <Blocked people={p.blocked} />}
        </>
      )}
      <MyShared />
      <p className="pp-back">
        <Link className="link" to="/">
          ← Torna alla Home
        </Link>
      </p>
      {report && <ReportSheet person={report} onClose={() => setReport(null)} />}
    </>
  );
}

/** Tondo con l'iniziale, nome, livello (e luogo se visibile); a destra le azioni. */
function Row({ person, wide, children }: { person: Pick<PersonCard, 'name' | 'band' | 'country' | 'province' | 'isPrivate'>; /** più azioni: sul telefono vanno a capo */ wide?: boolean; children?: ReactNode }) {
  return (
    <li className={wide ? 'pp-row req' : 'pp-row'}>
      <span className="nv-av" aria-hidden="true">
        {initial(person.name)}
      </span>
      <span className="pp-who">
        <b>{personName(person.name)}</b>
        <small>
          {personSub(person)}
          {person.isPrivate && ' · privato'}
        </small>
      </span>
      {children && <span className="pp-act">{children}</span>}
    </li>
  );
}

/** "Segui" (a un profilo privato manda una richiesta); disattivato quando lo segui già o la richiesta è partita. */
function FollowButton({ person }: { person: PersonCard }) {
  const follow = useFollow();
  const b = followButton(person.relation);
  const name = personName(person.name);
  return (
    <button
      type="button"
      className={`btn small${b.disabled ? ' ghost' : ''}`}
      disabled={b.disabled || follow.isPending}
      aria-label={b.disabled ? `${b.label}: ${name}` : person.isPrivate ? `Chiedi di seguire ${name}` : `Segui ${name}`}
      onClick={() => follow.mutate(person.userId)}
    >
      {b.label}
    </button>
  );
}

/** Una persona con le azioni che valgono per il rapporto che c'è: seguire, smettere, togliere, segnalare, bloccare. */
function Person({ person, onReport, followBack }: { person: PersonCard; onReport: (p: PersonCard) => void; followBack?: boolean }) {
  const unfollow = useUnfollow(person.relation === 'pending' ? 'Richiesta ritirata' : 'Hai smesso di seguire');
  const remove = useRemoveFollower();
  const block = useBlockUser();
  const name = personName(person.name);
  const items: MenuItem[] = [];
  if (person.relation === 'accepted') items.push({ label: 'Smetti di seguire', onSelect: () => unfollow.mutate(person.userId) });
  if (person.relation === 'pending') items.push({ label: 'Ritira la richiesta', onSelect: () => unfollow.mutate(person.userId) });
  if (person.followsMe === 'accepted') items.push({ label: 'Togli da chi ti segue', onSelect: () => remove.mutate(person.userId) });
  items.push({ label: 'Segnala…', onSelect: () => onReport(person) });
  items.push({ label: 'Blocca', danger: true, onSelect: () => block.mutate(person.userId) });
  return (
    <Row person={person}>
      {/* in "Ti seguono" il bottone serve solo per ricambiare; in ricerca e in "Persone che segui" dice lo stato */}
      {(!followBack || person.relation !== 'accepted') && <FollowButton person={person} />}
      <MoreMenu label={`Azioni per ${name}`} items={items} />
    </Row>
  );
}

/**
 * Ricerca per nome tra tutti i profili. Spenta finché l'informativa sulla privacy non è completa (come i profili
 * pubblici, ticket 38): la ricerca mostra il nome di chi è iscritto, e l'informativa deve prima dire a chi scrivere.
 * Il link "seguimi" funziona comunque: lì il nome lo dà chi lo condivide.
 */
function SearchCard({ onReport }: { onReport: (p: PersonCard) => void }) {
  const enabled = publicProfilesEnabled();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  // si cerca quando si smette di scrivere
  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const found = useSearchPeople(enabled ? term : '');
  const ready = term.length >= 2;
  return (
    <section className="card" aria-labelledby="pp-search">
      <h2 id="pp-search">
        Cerca persone
      </h2>
      {enabled ? (
        <>
          <SearchField label="Cerca per nome" hideLabel placeholder="Nome…" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} />
          <div aria-live="polite">
            {!ready && <p className="hint mt-10">Scrivi almeno due lettere del nome. Di un profilo privato vedi solo nome e livello.</p>}
            {ready && found.isLoading && <Skeleton inline />}
            {ready && found.error && !found.data && (
              <p className="empty" role="alert">
                Non riesco a cercare. Controlla la connessione e riprova.
              </p>
            )}
            {ready && found.data?.length === 0 && <p className="empty">Nessuno con questo nome.</p>}
            {ready && found.data && found.data.length > 0 && (
              <ul className="pp-list">
                {found.data.map((x) => (
                  <Person key={x.userId} person={x} onReport={onReport} />
                ))}
              </ul>
            )}
            {ready && found.data?.length === 20 && <p className="hint mt-10">Sono i primi 20: scrivi il nome per intero per restringere.</p>}
          </div>
        </>
      ) : (
        <p className="sub">
          La ricerca per nome si accende quando l'<Link to="/privacy">informativa sulla privacy</Link> sarà completa. Intanto puoi seguire qualcuno col suo link, e farti seguire col tuo.
        </p>
      )}
    </section>
  );
}

/** Richieste di seguirti: chi le manda vedrà il tuo nome in classifica e quello che condividi. */
function Requests({ people, onReport }: { people: PersonCard[]; onReport: (p: PersonCard) => void }) {
  const accept = useAcceptFollow();
  const reject = useRejectFollow();
  const block = useBlockUser();
  const busy = accept.isPending || reject.isPending;
  return (
    <section className="card" aria-labelledby="pp-req">
      <h2 id="pp-req">Richieste · {people.length}</h2>
      <p className="sub">Chi accetti vede il tuo nome e i tuoi punti in classifica, i record e gli allenamenti che condividi.</p>
      <ul className="pp-list">
        {people.map((x) => (
          <Row key={x.userId} person={x} wide>
            <button type="button" className="btn small" disabled={busy} onClick={() => accept.mutate(x.userId)} aria-label={`Accetta ${personName(x.name)}`}>
              Accetta
            </button>
            <button type="button" className="btn small ghost" disabled={busy} onClick={() => reject.mutate(x.userId)} aria-label={`Rifiuta ${personName(x.name)}`}>
              Rifiuta
            </button>
            <MoreMenu
              label={`Azioni per ${personName(x.name)}`}
              items={[
                { label: 'Segnala…', onSelect: () => onReport(x) },
                { label: 'Blocca', danger: true, onSelect: () => block.mutate(x.userId) },
              ]}
            />
          </Row>
        ))}
      </ul>
    </section>
  );
}

/** Il proprio link "seguimi": si genera, si copia o si condivide, e si può cambiare (quello vecchio smette di valere). */
function LinkCard() {
  const profile = useProfile();
  const code = useFollowCode();
  const rotate = useRotateFollowCode();
  const toast = useToast();
  const link = code.data ? followLink(location.origin, code.data) : null;
  const noName = profile.data && !profile.data.displayName;

  const send = async () => {
    if (!link) return;
    try {
      if (navigator.share) await navigator.share({ title: 'Scheda Calisthenics', text: 'Seguimi su Scheda Calisthenics', url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast('Link copiato');
      }
    } catch {
      /* condivisione annullata, o appunti non disponibili: il link resta scritto qui sotto */
    }
  };

  return (
    <section className="card" aria-labelledby="pp-link">
      <h2 id="pp-link">Il tuo link</h2>
      <p className="sub">
        Mandalo a chi vuoi che ti segua. {profile.data?.isPrivate ? 'Il tuo profilo è privato: chi lo apre ti manda una richiesta, e decidi tu.' : 'Il tuo profilo è pubblico: chi lo apre può seguirti subito.'}
      </p>
      {noName ? (
        <p className="hint mt-10">
          Per farti seguire scegli prima il tuo nome in <Link to="/account">Account</Link>.
        </p>
      ) : link ? (
        <>
          <p className="pp-link">{link}</p>
          <div className="row mt-10">
            <button type="button" className="btn small" onClick={send}>
              Condividi il link
            </button>
            <button type="button" className="btn small ghost" disabled={rotate.isPending} onClick={() => rotate.mutate(undefined, { onSuccess: () => toast('Link nuovo: quello di prima non vale più') })}>
              Cambia link
            </button>
          </div>
        </>
      ) : (
        <div className="row mt-14">
          <button type="button" className="btn small" disabled={code.isLoading || rotate.isPending} onClick={() => rotate.mutate()}>
            Crea il mio link
          </button>
        </div>
      )}
    </section>
  );
}

/** Chi c'è dietro il link che si è aperto. */
function InviteCard({ code, onReport }: { code: string; onReport: (p: PersonCard) => void }) {
  const invite = useFollowInvite(code);
  // lo stato (seguo già, richiesta inviata) cambia dopo il tocco: lo si rilegge dall'elenco delle mie persone
  const mine = usePeople().data?.following.find((p) => p.userId === invite.data?.userId);
  const person = invite.data ? { ...invite.data, relation: mine?.relation ?? invite.data.relation } : null;
  return (
    <section className="card star" aria-labelledby="pp-inv">
      <h2 id="pp-inv">Ti hanno mandato un link</h2>
      {invite.isLoading && <Skeleton inline />}
      {invite.error && (
        <p className="empty" role="alert">
          {invite.error instanceof Error && /Troppi/.test(invite.error.message) ? invite.error.message : 'Non riesco ad aprire il link. Controlla la connessione e riprova.'}
        </p>
      )}
      {invite.isSuccess && !person && <p className="empty">Questo link non vale più: chiedine uno nuovo.</p>}
      {person && (
        <ul className="pp-list">
          <Person person={person} onReport={onReport} />
        </ul>
      )}
    </section>
  );
}

/** Gli allenamenti che hai condiviso: si possono togliere, e spariscono dalle novità di chi ti segue. */
function MyShared() {
  const mine = useMySharedWorkouts();
  const del = useDeleteSharedWorkout();
  if (!mine.data?.length) return null;
  return (
    <section className="card" aria-labelledby="pp-shared">
      <h2 id="pp-shared">Allenamenti che hai condiviso · {mine.data.length}</h2>
      <p className="sub">Li vede chi ti segue. Togliendone uno sparisce anche dalle sue novità.</p>
      <ul className="pp-list">
        {mine.data.map((w) => (
          <li className="pp-row" key={w.id}>
            <span className="pp-who">
              <b>{w.name}</b>
              <small>{shortDate(w.date)}</small>
            </span>
            <span className="pp-act">
              <ConfirmButton onConfirm={() => del.mutate(w.id)}>Togli</ConfirmButton>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Blocked({ people }: { people: { userId: string; name: string | null }[] }) {
  const unblock = useUnblockUser();
  return (
    <section className="card" aria-labelledby="pp-blocked">
      <h2 id="pp-blocked">Bloccati · {people.length}</h2>
      <p className="sub">Non possono seguirti né trovarti nella ricerca, e in classifica non vi vedete.</p>
      <ul className="pp-list">
        {people.map((x) => (
          <li className="pp-row" key={x.userId}>
            <span className="nv-av" aria-hidden="true">
              {initial(x.name)}
            </span>
            <span className="pp-who">
              <b>{personName(x.name)}</b>
            </span>
            <span className="pp-act">
              <button type="button" className="btn small ghost" disabled={unblock.isPending} onClick={() => unblock.mutate(x.userId)} aria-label={`Togli il blocco a ${personName(x.name)}`}>
                Sblocca
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Segnalazione di una persona: un motivo scritto e, se si vuole, anche il blocco. La legge chi gestisce l'app. */
function ReportSheet({ person, onClose }: { person: PersonCard; onClose: () => void }) {
  const report = useReportUser();
  const block = useBlockUser();
  const [reason, setReason] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const name = personName(person.name);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = reason.trim();
    if (!v) return setError('Scrivi che cosa non va.');
    report.mutate(
      { userId: person.userId, reason: v },
      {
        onSuccess: () => {
          if (alsoBlock) block.mutate(person.userId);
          onClose();
        },
      },
    );
  };

  return (
    <Sheet title={`Segnala ${name}`} sub="La segnalazione arriva a chi gestisce l'app, non alla persona." onClose={onClose}>
      <form className="form mt-14" onSubmit={submit} noValidate>
        <Field
          label="Che cosa non va"
          value={reason}
          maxLength={500}
          autoComplete="off"
          error={error ?? undefined}
          hint={`Per esempio: nome offensivo, richieste insistenti. ${plural(500 - reason.length, 'carattere rimasto', 'caratteri rimasti')}.`}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
        />
        <label className="check-row">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
          Blocca anche questa persona
        </label>
        <div className="row">
          <button className="btn small" disabled={report.isPending} aria-busy={report.isPending || undefined}>
            Invia la segnalazione
          </button>
          <button type="button" className="btn small ghost" onClick={onClose}>
            Annulla
          </button>
        </div>
      </form>
    </Sheet>
  );
}
