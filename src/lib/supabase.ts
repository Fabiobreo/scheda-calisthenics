import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { netDown } from '../data/offline';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const RECOVERY_KEY = 'scheda:password-recovery';

if (!url || !key)
  throw new Error('Supabase non configurato: copia .env.example in .env.local (vedi README, "Avvio in locale")');

/**
 * Client Supabase ridotto a quello che l'app usa: accesso (auth) e database (from, rpc). `createClient` di supabase-js
 * si porta dietro anche storage, realtime e functions, che qui non servono e pesavano ~30 KB compressi (audit A12).
 * Le opzioni sono quelle di `createClient` (supabase-js 2.109): stessa chiave della sessione nel localStorage, quindi
 * chi era già dentro resta dentro; stesso flusso dei link via email (implicit); token rinnovato da solo.
 */
const base = new URL(url.trim().endsWith('/') ? url.trim() : `${url.trim()}/`);

/** Dove auth-js tiene la sessione: offline la si rilegge da qui (vedi `session.tsx`). */
export const AUTH_STORAGE_KEY = `sb-${base.hostname.split('.')[0]}-auth-token`;

/**
 * Ogni richiesta dice se la rete c'è (ticket 27): una richiesta che non arriva accende "Offline", la prima che
 * arriva lo spegne. Un 5xx del gateway (Supabase giù) conta come rete assente.
 */
const netFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    netDown.set(res.status >= 502 && res.status <= 504);
    return res;
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) netDown.set(true);
    throw e;
  }
};

const auth = new AuthClient({
  url: new URL('auth/v1', base).href,
  headers: { Authorization: `Bearer ${key}`, apikey: key },
  storageKey: AUTH_STORAGE_KEY,
  fetch: netFetch,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
});

/** Ogni richiesta al database porta il token dell'utente (o la chiave pubblica, prima dell'accesso). */
const authedFetch: typeof fetch = async (input, init) => {
  const { data } = await auth.getSession();
  const headers = new Headers(init?.headers);
  if (!headers.has('apikey')) headers.set('apikey', key);
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${data.session?.access_token ?? key}`);
  return netFetch(input, { ...init, headers });
};

const rest = new PostgrestClient(new URL('rest/v1', base).href, { schema: 'public', fetch: authedFetch });

export const supabase = {
  auth,
  from: rest.from.bind(rest),
  rpc: rest.rpc.bind(rest),
};
export type Db = typeof supabase;

// Il client legge il link di reset dall'URL appena creato: il listener va registrato qui,
// non in un effect React che arriverebbe dopo l'evento. Il flag sopravvive al ricaricamento.
if (/type=recovery/.test(location.hash)) setRecovery(true);
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setRecovery(true);
  if (event === 'SIGNED_OUT') setRecovery(false);
});

const listeners = new Set<() => void>();

function setRecovery(on: boolean) {
  try {
    if (on) sessionStorage.setItem(RECOVERY_KEY, '1');
    else sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignora */
  }
  listeners.forEach((l) => l());
}

export const recovery = {
  get: () => {
    try {
      return sessionStorage.getItem(RECOVERY_KEY) === '1';
    } catch {
      return false;
    }
  },
  end: () => setRecovery(false),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};
