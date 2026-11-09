import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useToast } from '../../app/toast';
import { Field, PageTitle, PasswordField, Seg, usePageTitle } from '../../components/ui';
import { recovery, supabase } from '../../lib/supabase';
import { authMessage } from './errors';

type Mode = 'signin' | 'signup' | 'reset' | 'sent';
type Msg = { ok: boolean; text: string; resend?: boolean };

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Secondi rimasti prima di poter reinviare un'email. */
function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return [left, () => (setNow(Date.now()), setUntil(Date.now() + RESEND_COOLDOWN * 1000))] as const;
}

function SubmitButton({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button className="btn block" aria-busy={busy} disabled={busy || disabled}>
      {busy && <span className="spinner" aria-hidden="true" />}
      {busy ? 'Attendi…' : children}
    </button>
  );
}

/**
 * Nome del trainer di un codice d'invito, letto prima dell'accesso (audit A10). undefined = in lettura,
 * null = codice non valido (o rete assente: in quel caso semplicemente non si mostra).
 */
function useInviter(code: string | undefined) {
  const [name, setName] = useState<string | null | undefined>(code ? undefined : null);
  useEffect(() => {
    if (!code) return;
    let live = true;
    supabase
      .rpc('invite_trainer_name', { invite_code: code })
      .then(({ data, error }) => live && setName(error ? null : ((data as string | null) ?? null)));
    return () => {
      live = false;
    };
  }, [code]);
  return name;
}

/** `invite`: codice del link d'invito aperto senza account. Chi arriva da un invito di solito è nuovo: parte da Registrati. */
export function AuthScreen({ invite }: { invite?: string }) {
  const [mode, setMode] = useState<Mode>(invite ? 'signup' : 'signin');
  const inviter = useInviter(invite);
  usePageTitle(mode === 'signup' ? 'Registrati' : mode === 'signin' ? 'Accedi' : 'Recupero password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [cooldown, startCooldown] = useCooldown();
  const emailRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // il pulsante premuto sparisce col cambio di modalità: porto il focus in un punto sensato
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (mode === 'sent') titleRef.current?.focus();
    else emailRef.current?.focus();
  }, [mode]);

  const go = (m: Mode) => {
    setMode(m);
    setMsg(null);
    setErrors({});
    // una password scritta per accedere non deve diventare quella di un nuovo account
    setPassword('');
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Scrivi l'email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Email non valida.';
    if (mode !== 'reset') {
      if (!password) e.password = 'Scrivi la password.';
      else if (mode === 'signup' && password.length < 8) e.password = 'Almeno 8 caratteri.';
    }
    setErrors(e);
    return !e.email && !e.password;
  };

  const resend = async () => {
    if (cooldown) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: location.origin } });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: authMessage(error) });
    startCooldown();
    setMsg({ ok: true, text: 'Email reinviata.' });
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy || !validate()) return;
    const addr = email.trim();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) setMsg({ ok: false, text: authMessage(error), resend: error.code === 'email_not_confirmed' });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: addr, password, options: { emailRedirectTo: location.origin } });
        if (error) setMsg({ ok: false, text: authMessage(error) });
        // con la conferma email attiva Supabase non dà errore per un'email già usata:
        // restituisce un utente senza identità e non manda nessuna email
        else if (data.user && data.user.identities?.length === 0)
          setMsg({ ok: false, text: 'Esiste già un account con questa email. Accedi, oppure reimposta la password se non la ricordi.' });
        else if (!data.session) {
          startCooldown();
          setMode('sent');
          setPassword('');
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: location.origin });
        if (error) setMsg({ ok: false, text: authMessage(error) });
        else {
          startCooldown();
          setMsg({ ok: true, text: `Se esiste un account per ${addr}, riceverai un link per scegliere una nuova password. Controlla anche lo spam.` });
        }
      }
    } catch {
      setMsg({ ok: false, text: 'Connessione non riuscita. Controlla la rete e riprova.' });
    } finally {
      setBusy(false);
    }
  };

  const notice = (
    <div aria-live="polite" className="notice-slot">
      {msg && (
        <div className={msg.ok ? 'notice' : 'notice err'}>
          <p>{msg.text}</p>
          {msg.resend && (
            <button type="button" className="link small" onClick={resend} disabled={busy || cooldown > 0}>
              {cooldown ? `Reinvia email di conferma (${cooldown} s)` : 'Reinvia email di conferma'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="auth-page">
      <header className="auth-hero">
        <p className="eyebrow">Registro allenamenti</p>
        <h1>
          Scheda
          <br />
          Calisthenics
        </h1>
        <p className="lede">Programma, serie e record personali. Salvati nel cloud, uguali su telefono e computer.</p>
      </header>
      {inviter && (
        <div className="notice invite-note">
          <p>
            <b>{inviter}</b> ti ha invitato: vuole seguirti come tuo trainer.
          </p>
          <p>{mode === 'signin' ? 'Accedi' : 'Crea il tuo account'}, poi confermi il collegamento.</p>
        </div>
      )}
      {invite && inviter === null && <p className="hint">Il codice d'invito non è valido o è stato cambiato: chiedine uno nuovo al trainer.</p>}

      <section className="card auth-card">
        {mode === 'sent' ? (
          <>
            <h2 className="big" ref={titleRef} tabIndex={-1}>
              Controlla la posta
            </h2>
            <p className="sub">
              Abbiamo mandato un link di conferma a <b className="em">{email.trim()}</b>. Aprilo, poi torna qui e accedi con la tua password.
            </p>
            <p className="hint mt-12">
              Non la trovi? Guarda nello spam, oppure fatti mandare un'altra email.
            </p>
            {notice}
            <div className="stack">
              <button className="btn block" onClick={() => go('signin')}>
                Ho confermato, accedi
              </button>
              <button className="btn ghost block" onClick={resend} disabled={busy || cooldown > 0}>
                {cooldown ? `Reinvia email (${cooldown} s)` : 'Reinvia email'}
              </button>
            </div>
          </>
        ) : (
          <>
            {mode === 'reset' ? (
              <>
                <h2 className="big">Password dimenticata</h2>
                <p className="sub">Ti mandiamo un link per sceglierne una nuova.</p>
              </>
            ) : (
              <Seg
                label="Accesso o registrazione"
                value={mode}
                options={[
                  { v: 'signin', l: 'Accedi' },
                  { v: 'signup', l: 'Registrati' },
                ]}
                onChange={(m) => m !== mode && go(m)}
              />
            )}

            <form className="form" onSubmit={submit} noValidate>
              <fieldset disabled={busy}>
                <Field
                  ref={emailRef}
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete={mode === 'signup' ? 'email' : 'username'}
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  error={errors.email}
                  onChange={(e) => (setEmail(e.target.value), errors.email && setErrors({ ...errors, email: undefined }))}
                />
                {mode !== 'reset' && (
                  <PasswordField
                    label="Password"
                    name="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    error={errors.password}
                    hint={mode === 'signup' ? 'Almeno 8 caratteri.' : undefined}
                    onChange={(e) => (setPassword(e.target.value), errors.password && setErrors({ ...errors, password: undefined }))}
                    aside={
                      mode === 'signin' && (
                        <button type="button" className="link small" onClick={() => go('reset')}>
                          Password dimenticata?
                        </button>
                      )
                    }
                  />
                )}
              </fieldset>
              {notice}
              <SubmitButton busy={busy} disabled={mode === 'reset' && cooldown > 0}>
                {mode === 'signin' ? 'Accedi' : mode === 'signup' ? 'Crea account' : cooldown ? `Invia di nuovo (${cooldown} s)` : 'Invia link'}
              </SubmitButton>
            </form>

            {mode === 'reset' && (
              <div className="auth-foot">
                <button className="link" onClick={() => go('signin')}>
                  ← Torna all'accesso
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** true dopo aver aperto il link di reimpostazione password ricevuto via email (anche dopo un ricaricamento). */
export function NewPasswordScreen({ email }: { email: string | null }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError('Almeno 8 caratteri.');
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setError(authMessage(error));
      recovery.end();
      toast('Password aggiornata');
    } catch {
      setError('Connessione non riuscita. Controlla la rete e riprova.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <PageTitle title="Nuova password" />
      <section className="card auth-card">
        <h2 className="big">Nuova password</h2>
        <p className="sub">Scegline una di almeno 8 caratteri.</p>
        <form className="form" onSubmit={submit} noValidate>
          <fieldset disabled={busy}>
            {/* serve al gestore password per sapere a quale account associare la nuova password */}
            <input type="email" name="email" autoComplete="username" value={email ?? ''} readOnly hidden />
            <PasswordField
              label="Nuova password"
              name="new-password"
              autoComplete="new-password"
              value={password}
              error={error || undefined}
              onChange={(e) => (setPassword(e.target.value), setError(''))}
            />
          </fieldset>
          <SubmitButton busy={busy}>Salva password</SubmitButton>
        </form>
      </section>
    </div>
  );
}
