import type { Session } from '@supabase/auth-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Repo } from '../data/repo';
import { createSupabaseRepo } from '../data/supabaseRepo';
import { CACHE_KEY } from '../data/offline';
import { AUTH_STORAGE_KEY, recovery, supabase } from '../lib/supabase';

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; userId: string; email: string | null; repo: Repo };

const Ctx = createContext<SessionState>({ status: 'loading' });

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // undefined = sessione non ancora letta
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const lastUser = useRef<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => setSession(s ?? (event === 'INITIAL_SESSION' ? storedSession() : null)));
    // Senza rete e con il token scaduto auth-js riprova il rinnovo per 30 s prima di rispondere: dopo un secondo si
    // parte con la sessione salvata (ticket 27). Se poi auth-js dice altro, vale quello.
    const slow = window.setTimeout(() => setSession((cur) => (cur === undefined ? storedSession() ?? undefined : cur)), 1000);
    return () => {
      clearTimeout(slow);
      data.subscription.unsubscribe();
    };
  }, []);

  const loading = session === undefined;
  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? null;

  // Uscita o cambio utente: non mostrare i dati in cache dell'account precedente.
  // Solo se prima c'era un utente, e con resetQueries invece di clear: gli effetti dei figli
  // girano prima di questo, quindi le query delle viste sono già agganciate e clear() le
  // staccherebbe dai componenti, lasciandoli in "Caricamento…" per sempre.
  useEffect(() => {
    if (loading) return;
    if (lastUser.current && lastUser.current !== userId) void qc.resetQueries();
    // fuori dall'account: i dati salvati sul telefono per l'offline non devono restare a chi lo usa dopo
    if (!userId) forget(CACHE_KEY);
    lastUser.current = userId;
  }, [loading, userId, qc]);

  const value = useMemo<SessionState>(() => {
    if (loading) return { status: 'loading' };
    if (!userId) return { status: 'signed-out' };
    return { status: 'ready', userId, email, repo: createSupabaseRepo(supabase, userId) };
  }, [loading, userId, email]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);

/**
 * Apertura senza rete con il token scaduto (dura un'ora): auth-js non riesce a rinnovarlo e dice "nessuna sessione",
 * ma la lascia nel localStorage, perché toglie la sessione solo se il server rifiuta il rinnovo. Se c'è ancora, l'utente
 * è dentro: si mostrano i dati in cache e, al ritorno della rete, il rinnovo automatico manda TOKEN_REFRESHED (ticket 27).
 */
function storedSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? 'null') as Session | null;
    return s?.user?.id && s.refresh_token ? s : null;
  } catch {
    return null;
  }
}

function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

/** Di chi sono i dati che le viste stanno mostrando. */
export interface Scope {
  repo: Repo;
  userId: string;
  /** dati di un altro utente (un atleta visto dal suo trainer): si leggono soltanto */
  readOnly: boolean;
}

const ScopeCtx = createContext<Scope | null>(null);

/** Le viste dentro leggono i dati dell'atleta invece che quelli dell'utente collegato. */
export function AthleteScope({ athleteId, children }: { athleteId: string; children: ReactNode }) {
  const value = useMemo<Scope>(() => ({ repo: createSupabaseRepo(supabase, athleteId), userId: athleteId, readOnly: true }), [athleteId]);
  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export function useScope(): Scope {
  const scoped = useContext(ScopeCtx);
  const s = useSession();
  if (scoped) return scoped;
  if (s.status !== 'ready') throw new Error('useScope fuori da una sessione pronta');
  return { repo: s.repo, userId: s.userId, readOnly: false };
}

export const useRepo = (): Repo => useScope().repo;

/** Si è aperto il link per reimpostare la password: finché non la cambia, l'utente vede solo quella schermata. */
export function usePasswordRecovery() {
  return useSyncExternalStore(recovery.subscribe, recovery.get);
}
