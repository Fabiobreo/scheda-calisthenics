import { InstallPrompt } from './install';
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { IconAtleti, IconEsercizi, IconGrafici, IconHome, IconLivello, IconScheda } from '../components/icons';
import { useData, useProfile, useScoreSync } from '../data/hooks';
import { Skeleton } from '../components/ui';
import { HomeView } from '../features/home/HomeView';
import { LoggerProvider } from '../features/logger/Logger';
import { whenIdle } from '../lib/idle';
import { netDown, pendingFor, queue } from '../data/offline';
import { usePasswordRecovery, useSession } from './session';

// Home (la prima pagina, ticket 39) e registratore servono subito; il resto si scarica quando lo apri (audit A12): chi
// non è trainer non scarica mai la parte trainer, chi è già dentro non scarica l'accesso. Il service worker li tiene
// comunque in cache. Livello e Scheda, le voci accanto nella barra, si scaricano subito dopo il primo disegno, appena
// il browser è libero (audit A4).
const loadLivello = () => import('../features/livello/LivelloView');
const LivelloView = lazy(() => loadLivello().then((m) => ({ default: m.LivelloView })));
const loadScheda = () => import('../features/scheda/SchedaView');
const SchedaView = lazy(() => loadScheda().then((m) => ({ default: m.SchedaView })));
const AccountView = lazy(() => import('../features/account/AccountView').then((m) => ({ default: m.AccountView })));
const AtletiView = lazy(() => import('../features/atleti/AtletiView').then((m) => ({ default: m.AtletiView })));
const AtletaPage = lazy(() => import('../features/atleti/AtletiView').then((m) => ({ default: m.AtletaPage })));
const SchedaModelloView = lazy(() => import('../features/atleti/SchedeView').then((m) => ({ default: m.SchedaModelloView })));
const AuthScreen = lazy(() => import('../features/auth/AuthScreen').then((m) => ({ default: m.AuthScreen })));
const NewPasswordScreen = lazy(() => import('../features/auth/AuthScreen').then((m) => ({ default: m.NewPasswordScreen })));
const EserciziView = lazy(() => import('../features/esercizi/EserciziView').then((m) => ({ default: m.EserciziView })));
// offline (ticket 27): pastiglia e invio della coda servono solo senza rete o con qualcosa in attesa
const OfflinePill = lazy(() => import('./offline').then((m) => ({ default: m.OfflinePill })));
const SyncAgent = lazy(() => import('./offline').then((m) => ({ default: m.SyncAgent })));
const GraficiView = lazy(() => import('../features/grafici/GraficiView').then((m) => ({ default: m.GraficiView })));
// informativa (ticket 38): si apre da Account
const PrivacyView = lazy(() => import('../features/privacy/PrivacyView').then((m) => ({ default: m.PrivacyView })));
// persone (ticket 39): dalla lente della Home, o da un link "seguimi"
const PeopleView = lazy(() => import('../features/home/PeopleView').then((m) => ({ default: m.PeopleView })));

const TABS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Home', icon: <IconHome /> },
  { to: '/livello', label: 'Livello', icon: <IconLivello /> },
  { to: '/scheda', label: 'Scheda', icon: <IconScheda /> },
  { to: '/grafici', label: 'Grafici', icon: <IconGrafici /> },
  { to: '/esercizi', label: 'Esercizi', icon: <IconEsercizi /> },
];
const ATLETI_TAB = { to: '/atleti', label: 'Atleti', icon: <IconAtleti /> };

/**
 * Link d'invito aperto da chi non ha ancora un account (quello di un trainer, `/invito/…`, o un link "seguimi",
 * `/segui/…`, ticket 39): la mail di conferma riporta alla home, quindi lo ricordo e, dopo l'accesso, riapro la sua
 * pagina. Vale un giorno: più tardi è probabile che il codice sia cambiato, o che ad accedere da questo browser sia
 * un'altra persona.
 */
const PENDING_INVITE = 'scheda:pending-invite';
const PENDING_TTL = 24 * 60 * 60 * 1000;
const INVITE_PATH = /^\/(invito|segui)\/([A-Za-z0-9]{8})\/?$/;

/** Percorso dell'invito ricordato ("/invito/ABCD2345"). */
const pendingInvite = {
  get: (): string | null => {
    try {
      // `kind` manca negli inviti ricordati prima del ticket 39: erano tutti di un trainer
      const saved = JSON.parse(localStorage.getItem(PENDING_INVITE) ?? 'null') as { code: string; at: number; kind?: string } | null;
      if (!saved || Date.now() - saved.at >= PENDING_TTL) return null;
      const path = `/${saved.kind === 'segui' ? 'segui' : 'invito'}/${saved.code}`;
      return INVITE_PATH.test(path) ? path : null;
    } catch {
      return null;
    }
  },
  set: (invite: { kind: string; code: string } | null) => {
    try {
      if (invite) localStorage.setItem(PENDING_INVITE, JSON.stringify({ ...invite, at: Date.now() }));
      else localStorage.removeItem(PENDING_INVITE);
    } catch {
      /* ignora */
    }
  },
};

export function App() {
  const session = useSession();
  const recovery = usePasswordRecovery();
  const location = useLocation();
  const [, inviteKind, inviteCode] = INVITE_PATH.exec(location.pathname) ?? [];
  // solo l'invito di un trainer mostra il suo nome prima dell'accesso; di un link "seguimi" non si dice niente
  const invite = inviteKind === 'invito' ? inviteCode : undefined;

  useEffect(() => {
    if (session.status === 'signed-out' && inviteCode) pendingInvite.set({ kind: inviteKind, code: inviteCode.toUpperCase() });
  }, [session.status, inviteKind, inviteCode]);

  if (session.status === 'signed-out')
    return (
      <div className="wrap">
        {/* l'informativa si legge anche prima di registrarsi */}
        <Suspense fallback={null}>{location.pathname === '/privacy' ? <PrivacyView signedIn={false} /> : <AuthScreen invite={invite?.toUpperCase()} />}</Suspense>
      </div>
    );

  return (
    <div className="wrap">
      {/* testata comune (ticket 33): nome e livello portano ad Account, il cerchio "Totale" a Livello; le sezioni sono
          nella barra in basso. Mentre la sessione si apre, e nel cambio password, resta il nome dell'app. */}
      <header className="top">
        {session.status === 'ready' && !recovery ? (
          <TopBar email={session.email} end={<Offline userId={session.userId} part="pill" />} />
        ) : (
          <Link className="brand" to="/">
            Scheda Calisthenics
          </Link>
        )}
      </header>
      {session.status === 'loading' && <Skeleton />}
      {session.status === 'ready' &&
        (recovery ? (
          <Suspense fallback={<Skeleton />}>
            <NewPasswordScreen email={session.email} />
          </Suspense>
        ) : (
          <LoggerProvider>
            <Offline userId={session.userId} part="agent" />
            <ScoreSync />
            <InstallPrompt />
            <Main />
          </LoggerProvider>
        ))}
    </div>
  );
}

function Main() {
  const { isLoading, error } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  // invito ricordato da prima dell'accesso: si riapre una volta sola
  useEffect(() => {
    const path = pendingInvite.get();
    pendingInvite.set(null); // usato o scaduto, non serve più
    if (!path) return;
    if (!INVITE_PATH.test(location.pathname)) navigate(path, { replace: true });
  }, [location.pathname, navigate]);
  useEffect(
    () =>
      whenIdle(() => {
        void loadLivello();
        void loadScheda();
      }),
    [],
  );
  const trainer = useProfile().data?.isTrainer;
  // senza rete lo dice la pastiglia in testata, e i dati in cache restano (ticket 27)
  const down = useSyncExternalStore(netDown.subscribe, netDown.get);
  const tabs = trainer ? [...TABS, ATLETI_TAB] : TABS;
  return (
    <>
      {/* barra in basso, a portata di pollice; NavLink mette aria-current="page" sulla voce attiva */}
      <nav className="tabbar" aria-label="Sezioni">
        <div className="tabbar-in">
          {tabs.map((t) => (
            // "Atleti" resta acceso anche sulla pagina di un atleta e nelle schede modello
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to !== '/atleti'}
              // "Home" resta accesa anche su Persone, che si apre dalla sua lente
              className={({ isActive }) =>
                isActive || (t.to === '/atleti' && location.pathname.startsWith('/schede/')) || (t.to === '/' && /^\/(persone|segui)\b/.test(location.pathname)) ? 'on' : ''
              }
            >
              {t.icon}
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      {error && !down && <div className="banner">Non riesco a leggere i dati. Controlla la connessione e riprova.</div>}
      <main>
        {isLoading ? (
          <Skeleton />
        ) : (
          <Suspense fallback={<Skeleton />}>
            {/* chiave sul percorso: cambiando pagina il contenuto si rimonta ed entra con l'animazione (V02) */}
            <Routes key={location.pathname}>
              {/* Home (ticket 39) sulla rotta "/"; Livello (ticket 34) resta su "/livello" */}
              <Route path="/" element={<HomeView />} />
              <Route path="/livello" element={<LivelloView />} />
              <Route path="/persone" element={<PeopleView />} />
              <Route path="/segui/:code" element={<FollowRoute />} />
              <Route path="/scheda" element={<SchedaView />} />
              <Route path="/grafici" element={<GraficiView />} />
              {/* il Registro non c'è più (ticket 04): chi l'aveva salvato torna alla Scheda */}
              <Route path="/registro" element={<Navigate to="/scheda" replace />} />
              <Route path="/esercizi" element={<EserciziView />} />
              <Route path="/account" element={<AccountView />} />
              {/* le classifiche erano una pagina a sé (ticket 38): ora stanno nella Home */}
              <Route path="/classifiche" element={<Navigate to="/" replace />} />
              <Route path="/privacy" element={<PrivacyView signedIn />} />
              <Route path="/invito/:code" element={<InviteRoute />} />
              <Route path="/atleti" element={<AtletiView />} />
              <Route path="/atleti/:athleteId" element={<AtletaPage />} />
              <Route path="/schede/:programId" element={<SchedaModelloView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>
    </>
  );
}

/** Punti sul server per le classifiche (ticket 38): seguono i record dell'utente. Non disegna niente. */
function ScoreSync() {
  useScoreSync();
  return null;
}

/**
 * Pastiglia "Offline · 2 in attesa" e invio della coda (ticket 27): si scaricano la prima volta che la rete manca o che
 * c'è qualcosa in coda, poi restano montati (al ritorno della rete devono inviare e rileggere i dati).
 */
function Offline({ userId, part }: { userId: string; part: 'pill' | 'agent' }) {
  const down = useSyncExternalStore(netDown.subscribe, netDown.get);
  const pending = pendingFor(userId, useSyncExternalStore(queue.subscribe, queue.get)).length > 0;
  const [needed, setNeeded] = useState(false);
  if ((down || pending) && !needed) setNeeded(true);
  if (!needed) return null;
  return <Suspense fallback={null}>{part === 'pill' ? <OfflinePill /> : <SyncAgent />}</Suspense>;
}

/** Link "seguimi" di un'altra persona: si apre Persone con lei in cima. */
function FollowRoute() {
  const { code } = useParams();
  return <PeopleView inviteCode={code?.toUpperCase()} />;
}

/** Link d'invito di un trainer: si apre Account con il codice già compilato. */
function InviteRoute() {
  const { code } = useParams();
  return <AccountView inviteCode={code} />;
}
