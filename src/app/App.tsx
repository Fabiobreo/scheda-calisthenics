import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconAtleti, IconEsercizi, IconGrafici, IconScheda } from '../components/icons';
import { useData, useProfile } from '../data/hooks';
import { AccountView } from '../features/account/AccountView';
import { AtletaView, AtletiView } from '../features/atleti/AtletiView';
import { SchedaModelloView } from '../features/atleti/SchedeView';
import { AuthScreen, NewPasswordScreen, usePasswordRecovery } from '../features/auth/AuthScreen';
import { EserciziView } from '../features/esercizi/EserciziView';
import { GraficiView } from '../features/grafici/GraficiView';
import { LoggerProvider } from '../features/logger/Logger';
import { SchedaView } from '../features/scheda/SchedaView';
import { useSession } from './session';

const TABS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Scheda', icon: <IconScheda /> },
  { to: '/grafici', label: 'Grafici', icon: <IconGrafici /> },
  { to: '/esercizi', label: 'Esercizi', icon: <IconEsercizi /> },
];
const ATLETI_TAB = { to: '/atleti', label: 'Atleti', icon: <IconAtleti /> };

/** Cerchio con l'iniziale del nome (o dell'email): porta ad Account, dove si esce. Lo sostituirà l'avatar (ticket 11–12). */
function AccountBadge({ email }: { email: string | null }) {
  const name = useProfile().data?.displayName;
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();
  return (
    <NavLink to="/account" className={({ isActive }) => `badge${isActive ? ' on' : ''}`} aria-label="Account" title={name || email || 'Account'}>
      {initial}
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
        <AuthScreen />
      </div>
    );

  return (
    <div className="wrap">
      {/* intestazione corta: le sezioni sono nella barra in basso, l'account nel cerchio a destra */}
      <header className="top">
        <Link className="brand" to="/">
          Scheda Calisthenics
        </Link>
        {session.status === 'ready' && !recovery && <AccountBadge email={session.email} />}
      </header>
      <UpdateBanner />
      {session.status === 'loading' && <p className="empty">Caricamento…</p>}
      {session.status === 'ready' &&
        (recovery ? (
          <NewPasswordScreen email={session.email} />
        ) : (
          <LoggerProvider>
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
  const trainer = useProfile().data?.isTrainer;
  const tabs = trainer ? [...TABS, ATLETI_TAB] : TABS;
  return (
    <>
      {/* barra in basso, a portata di pollice; NavLink mette aria-current="page" sulla voce attiva */}
      <nav className="tabbar" aria-label="Sezioni">
        <div className="tabbar-in">
          {tabs.map((t) => (
            // "Atleti" resta acceso anche sulla pagina di un atleta
            <NavLink key={t.to} to={t.to} end={t.to !== '/atleti'} className={({ isActive }) => (isActive ? 'on' : '')}>
              {t.icon}
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      {error && <div className="banner">Non riesco a leggere i dati. Controlla la connessione e riprova.</div>}
      <main>
        {isLoading ? (
          <p className="empty">Caricamento…</p>
        ) : (
          <Routes>
            <Route path="/" element={<SchedaView />} />
            <Route path="/grafici" element={<GraficiView />} />
            {/* il Registro non c'è più (ticket 04): chi l'aveva salvato torna alla Scheda */}
            <Route path="/registro" element={<Navigate to="/" replace />} />
            <Route path="/esercizi" element={<EserciziView />} />
            <Route path="/account" element={<AccountView />} />
            <Route path="/invito/:code" element={<InviteRoute />} />
            <Route path="/atleti" element={<AtletiView />} />
            <Route path="/atleti/:athleteId" element={<AtletaView />} />
            <Route path="/schede/:programId" element={<SchedaModelloView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  );
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
    <div className="banner row" style={{ justifyContent: 'space-between' }}>
      <span>È disponibile una nuova versione.</span>
      <button className="btn small" onClick={() => updateServiceWorker(true)}>
        Aggiorna
      </button>
    </div>
  );
}
