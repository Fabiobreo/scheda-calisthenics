import { useEffect } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useData, useProfile } from '../data/hooks';
import { AccountView } from '../features/account/AccountView';
import { AtletaView, AtletiView } from '../features/atleti/AtletiView';
import { SchedaModelloView } from '../features/atleti/SchedeView';
import { AuthScreen, NewPasswordScreen, usePasswordRecovery } from '../features/auth/AuthScreen';
import { EserciziView } from '../features/esercizi/EserciziView';
import { GraficiView } from '../features/grafici/GraficiView';
import { LoggerProvider } from '../features/logger/Logger';
import { RegistroView } from '../features/registro/RegistroView';
import { SchedaView } from '../features/scheda/SchedaView';
import { supabase } from '../lib/supabase';
import { useSession } from './session';

const TABS = [
  { to: '/', label: 'Scheda' },
  { to: '/grafici', label: 'Grafici' },
  { to: '/registro', label: 'Registro' },
  { to: '/esercizi', label: 'Esercizi' },
];

/**
 * Codice d'invito aperto da chi non ha ancora un account: la mail di conferma riporta alla home,
 * quindi lo ricordo e, dopo l'accesso, riapro la pagina dell'invito.
 */
const PENDING_INVITE = 'scheda:pending-invite';
const INVITE_PATH = /^\/invito\/([A-Za-z0-9]{8})\/?$/;

const pendingInvite = {
  get: () => {
    try {
      return localStorage.getItem(PENDING_INVITE);
    } catch {
      return null;
    }
  },
  set: (code: string | null) => {
    try {
      if (code) localStorage.setItem(PENDING_INVITE, code);
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
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">Registro allenamenti</p>
          {session.status === 'ready' && (
            <span className="row">
              <Link className="link" to="/account" title={session.email ?? undefined}>
                Account
              </Link>
              <button className="link" onClick={() => supabase.auth.signOut()}>
                Esci
              </button>
            </span>
          )}
        </div>
        <h1>
          Scheda
          <br />
          Calisthenics
        </h1>
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
    if (!code) return;
    pendingInvite.set(null);
    if (!INVITE_PATH.test(location.pathname)) navigate(`/invito/${code}`, { replace: true });
  }, [location.pathname, navigate]);
  const trainer = useProfile().data?.isTrainer;
  const tabs = trainer ? [...TABS, { to: '/atleti', label: 'Atleti' }] : TABS;
  return (
    <>
      <nav className="nav">
        <div className="seg">
          {tabs.map((t) => (
            // "Atleti" resta acceso anche sulla pagina di un atleta
            <NavLink key={t.to} to={t.to} end={t.to !== '/atleti'} className={({ isActive }) => (isActive ? 'on' : '')}>
              {t.label}
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
            <Route path="/registro" element={<RegistroView />} />
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
