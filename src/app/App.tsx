import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { LevelStrip } from '../components/LevelStrip';
import { IconAtleti, IconEsercizi, IconGrafici, IconLivello, IconScheda } from '../components/icons';
import { Avatar } from '../components/Avatar';
import { useData, useLevel, useProfile } from '../data/hooks';
import { Skeleton } from '../components/ui';
import { HomeView } from '../features/home/HomeView';
import { LoggerProvider } from '../features/logger/Logger';
import { whenIdle } from '../lib/idle';
import { netDown, pendingFor, queue } from '../data/offline';
import { usePasswordRecovery, useSession } from './session';

// Home e registratore servono subito; il resto si scarica quando lo apri (audit A12): chi non è trainer non scarica
// mai la parte trainer, chi è già dentro non scarica l'accesso. Il service worker li tiene comunque in cache.
// La Scheda, seconda voce della barra, si scarica subito dopo il primo disegno, appena il browser è libero (audit A4).
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

const TABS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Livello', icon: <IconLivello /> },
  { to: '/scheda', label: 'Scheda', icon: <IconScheda /> },
  { to: '/grafici', label: 'Grafici', icon: <IconGrafici /> },
  { to: '/esercizi', label: 'Esercizi', icon: <IconEsercizi /> },
];
const ATLETI_TAB = { to: '/atleti', label: 'Atleti', icon: <IconAtleti /> };

/** Sezioni con il riepilogo del livello in alto (ticket 12); altrove (Home, Account, Atleti) resta il nome dell'app. */
const STRIP_PATHS = ['/scheda', '/grafici', '/esercizi'];

/**
 * Avatar dell'utente in alto a destra: è l'unico elemento d'identità della testata (audit A11) e porta ad Account,
 * dove si esce. Accanto, nelle sezioni con il riepilogo, ci sono nome e livello: insieme fanno "avatar + livello" (12).
 */
function AccountBadge({ email }: { email: string | null }) {
  const profile = useProfile().data;
  const { summary } = useLevel();
  const name = profile?.displayName;
  return (
    <NavLink to="/account" className={({ isActive }) => `badge${isActive ? ' on' : ''}`} aria-label="Account" title={name || email || 'Account'}>
      <Avatar name={name || email} avatar={summary.avatar} elite={summary.zone === 'elite'} small body={profile?.avatarBody} />
    </NavLink>
  );
}

/**
 * Codice d'invito aperto da chi non ha ancora un account: la mail di conferma riporta alla home,
 * quindi lo ricordo e, dopo l'accesso, riapro la pagina dell'invito. Vale un giorno: più tardi è
 * probabile che il codice sia cambiato, o che ad accedere da questo browser sia un'altra persona.
 */
const PENDING_INVITE = 'scheda:pending-invite';
const PENDING_TTL = 24 * 60 * 60 * 1000;
const INVITE_PATH = /^\/invito\/([A-Za-z0-9]{8})\/?$/;

const pendingInvite = {
  get: (): string | null => {
    try {
      const saved = JSON.parse(localStorage.getItem(PENDING_INVITE) ?? 'null') as { code: string; at: number } | null;
      return saved && Date.now() - saved.at < PENDING_TTL ? saved.code : null;
    } catch {
      return null;
    }
  },
  set: (code: string | null) => {
    try {
      if (code) localStorage.setItem(PENDING_INVITE, JSON.stringify({ code, at: Date.now() }));
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
  const invite = INVITE_PATH.exec(location.pathname)?.[1];

  useEffect(() => {
    if (session.status === 'signed-out' && invite) pendingInvite.set(invite.toUpperCase());
  }, [session.status, invite]);

  if (session.status === 'signed-out')
    return (
      <div className="wrap">
        <UpdateBanner />
        <Suspense fallback={null}>
          <AuthScreen invite={invite?.toUpperCase()} />
        </Suspense>
      </div>
    );

  return (
    <div className="wrap">
      {/* intestazione corta: le sezioni sono nella barra in basso, l'account nel cerchio a destra */}
      <header className="top">
        {session.status === 'ready' && !recovery && STRIP_PATHS.includes(location.pathname) ? (
          <LevelStrip />
        ) : (
          <Link className="brand" to="/">
            Scheda Calisthenics
          </Link>
        )}
        {session.status === 'ready' && !recovery && (
          <span className="top-end">
            <Offline userId={session.userId} part="pill" />
            <AccountBadge email={session.email} />
          </span>
        )}
      </header>
      <UpdateBanner />
      {session.status === 'loading' && <Skeleton />}
      {session.status === 'ready' &&
        (recovery ? (
          <Suspense fallback={<Skeleton />}>
            <NewPasswordScreen email={session.email} />
          </Suspense>
        ) : (
          <LoggerProvider>
            <Offline userId={session.userId} part="agent" />
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
    const code = pendingInvite.get();
    pendingInvite.set(null); // usato o scaduto, non serve più
    if (!code) return;
    if (!INVITE_PATH.test(location.pathname)) navigate(`/invito/${code}`, { replace: true });
  }, [location.pathname, navigate]);
  useEffect(() => whenIdle(() => void loadScheda()), []);
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
              className={({ isActive }) => (isActive || (t.to === '/atleti' && location.pathname.startsWith('/schede/')) ? 'on' : '')}
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
              {/* Home "Livello" (ticket 10); la Scheda, che prima era qui, è a /scheda */}
              <Route path="/" element={<HomeView />} />
              <Route path="/scheda" element={<SchedaView />} />
              <Route path="/grafici" element={<GraficiView />} />
              {/* il Registro non c'è più (ticket 04): chi l'aveva salvato torna alla Scheda */}
              <Route path="/registro" element={<Navigate to="/scheda" replace />} />
              <Route path="/esercizi" element={<EserciziView />} />
              <Route path="/account" element={<AccountView />} />
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

/** Link d'invito di un trainer: si apre Account con il codice già compilato. */
function InviteRoute() {
  const { code } = useParams();
  return <AccountView inviteCode={code} />;
}

function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="banner row between">
      <span>È disponibile una nuova versione.</span>
      <button className="btn small" onClick={() => updateServiceWorker(true)}>
        Aggiorna
      </button>
    </div>
  );
}
