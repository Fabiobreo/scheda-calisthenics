import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const RECOVERY_KEY = 'scheda:password-recovery';

if (!url || !key)
  throw new Error('Supabase non configurato: copia .env.example in .env.local (vedi README, "Avvio in locale")');

export const supabase = createClient(url, key);

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
