import { useEffect, useState, type FormEvent } from 'react';
import { Field } from '../../components/ui';
import { supabase } from '../../lib/supabase';

type Mode = 'signin' | 'signup' | 'reset';

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email o password non corretti.',
  'Email not confirmed': "Conferma prima l'email: controlla la posta.",
  'User already registered': 'Esiste già un account con questa email.',
};
const it = (msg: string) => MESSAGES[msg] ?? msg;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg({ ok: false, text: it(error.message) });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
        if (error) setMsg({ ok: false, text: it(error.message) });
        else if (!data.session) setMsg({ ok: true, text: "Ti ho mandato un'email: apri il link per confermare l'account, poi accedi." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
        setMsg(error ? { ok: false, text: it(error.message) } : { ok: true, text: "Se l'account esiste, riceverai un'email per reimpostare la password." });
      }
    } catch {
      setMsg({ ok: false, text: 'Connessione non riuscita. Riprova.' });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signin' ? 'Accedi' : mode === 'signup' ? 'Crea account' : 'Password dimenticata';

  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="sub">I tuoi allenamenti, salvati nel cloud e sincronizzati tra telefono e computer.</p>
      <form className="form" onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'reset' && (
          <Field
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {msg && <p className={msg.ok ? 'hint' : 'error'}>{msg.text}</p>}
        <div className="row">
          <button className="btn" disabled={busy}>
            {busy ? 'Attendi…' : mode === 'signin' ? 'Accedi' : mode === 'signup' ? 'Registrati' : 'Invia email'}
          </button>
        </div>
      </form>
      <div className="row" style={{ marginTop: 14 }}>
        {mode !== 'signin' && (
          <button className="link" onClick={() => (setMode('signin'), setMsg(null))}>
            Ho già un account
          </button>
        )}
        {mode !== 'signup' && (
          <button className="link" onClick={() => (setMode('signup'), setMsg(null))}>
            Crea un account
          </button>
        )}
        {mode === 'signin' && (
          <button className="link" onClick={() => (setMode('reset'), setMsg(null))}>
            Password dimenticata?
          </button>
        )}
      </div>
    </section>
  );
}

/** true dopo aver aperto il link di reimpostazione password ricevuto via email. */
export function usePasswordRecovery() {
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => event === 'PASSWORD_RECOVERY' && setRecovery(true));
    return () => data.subscription.unsubscribe();
  }, []);
  return [recovery, () => setRecovery(false)] as const;
}

export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(it(error.message));
    else onDone();
  };

  return (
    <section className="card">
      <h2>Nuova password</h2>
      <form className="form" onSubmit={submit}>
        <Field label="Password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="btn" disabled={busy}>
            Salva password
          </button>
        </div>
      </form>
    </section>
  );
}
