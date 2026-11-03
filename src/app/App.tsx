import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useData } from '../data/hooks';
import { AccountView } from '../features/account/AccountView';
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

export function App() {
  const session = useSession();
  const recovery = usePasswordRecovery();

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
  return (
    <>
      <nav className="nav">
        <div className="seg">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </>
  );
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
