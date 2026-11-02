import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createLocalRepo } from '../data/localRepo';
import type { Repo } from '../data/repo';
import { createSupabaseRepo } from '../data/supabaseRepo';
import { supabase } from '../lib/supabase';

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; mode: 'cloud' | 'local'; email: string | null; repo: Repo };

const Ctx = createContext<SessionState>({ status: 'loading' });

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  // undefined = sessione non ancora letta
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const lastUser = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
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
    lastUser.current = userId;
  }, [loading, userId, qc]);

  const value = useMemo<SessionState>(() => {
    if (!supabase) return { status: 'ready', mode: 'local', email: null, repo: createLocalRepo() };
    if (loading) return { status: 'loading' };
    if (!userId) return { status: 'signed-out' };
    return { status: 'ready', mode: 'cloud', email, repo: createSupabaseRepo(supabase) };
  }, [loading, userId, email]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);

export function useRepo(): Repo {
  const s = useSession();
  if (s.status !== 'ready') throw new Error('useRepo fuori da una sessione pronta');
  return s.repo;
}
