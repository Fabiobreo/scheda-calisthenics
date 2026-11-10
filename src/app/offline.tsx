import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { K } from '../data/hooks';
import { netDown, pendingFor, queue, savesText } from '../data/offline';
import { supabase } from '../lib/supabase';
import { useRepo, useScope } from './session';
import { useToast } from './toast';

/**
 * Offline (ticket 27): chi invia la coda e la pastiglia in testata che dice cosa aspetta. La logica dell'invio è in
 * `data/sync.ts` e si scarica solo quando serve.
 */

const loadSync = () => import('../data/sync');

/** Ogni quanto riprovare mentre la rete manca: la prova è la richiesta stessa. */
const RETRY = 20_000;

export const useNetDown = () => useSyncExternalStore(netDown.subscribe, netDown.get);

export function usePending() {
  const { userId } = useScope();
  const all = useSyncExternalStore(queue.subscribe, queue.get);
  return pendingFor(userId, all);
}

/** Invia la coda e dice com'è andata. Restituisce una funzione per "Invia ora". */
function useFlush() {
  const repo = useRepo();
  const { userId } = useScope();
  const qc = useQueryClient();
  const toast = useToast();
  return async () => {
    if (!pendingFor(userId).length) return;
    // prima un token valido: dopo ore senza rete è scaduto, e con la sola chiave pubblica il server rifiuterebbe tutto
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id !== userId) return;
    const sync = await loadSync();
    const r = await sync.flushQueue(repo, userId);
    const done = [...r.sent, ...r.rejected.map((x) => x.item)];
    if (done.length) await sync.refreshAfter(qc, done);
    // i salvataggi ancora in coda restano visibili anche dopo la rilettura
    sync.reapplyPending(qc, userId);
    if (r.rejected.length)
      toast(`${savesText(r.rejected.length, 'non inviato')}: ${sync.describe(qc, r.rejected[0].item)}. Il server l'ha rifiutato.`, { label: 'Ok', run: () => {} });
    else if (r.sent.length) toast(`${savesText(r.sent.length, 'inviato')} al server`);
  };
}

/**
 * Invia la coda quando la rete torna: alla prima richiesta riuscita, all'evento "online", tornando sull'app e ogni
 * 20 s mentre c'è qualcosa in attesa (con la rete giù quella richiesta è anche la prova che sia tornata). Senza niente
 * in coda, mentre si è offline, ogni 20 s si rilegge il profilo: è la richiesta più piccola e spegne "Offline".
 */
export function SyncAgent() {
  const qc = useQueryClient();
  const { userId } = useScope();
  const down = useNetDown();
  const pending = usePending().length;
  const flush = useFlush();

  // rete tornata: si invia e si rileggono i dati, che possono essere cambiati mentre eravamo offline
  useEffect(() => {
    if (down) return;
    void flush().then(() => qc.invalidateQueries({ type: 'active' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [down]);

  // qualcosa si è aggiunto alla coda con la rete accesa (c'era già una coda): parte subito
  useEffect(() => {
    if (pending && !netDown.get()) void flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  useEffect(() => {
    if (!down && !pending) return;
    const tick = () => (pending ? void flush() : void qc.invalidateQueries({ queryKey: K.profile }));
    const id = window.setInterval(tick, RETRY);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    window.addEventListener('online', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [down, pending]);

  // una rilettura dal server prima dell'invio non deve far sparire i salvataggi in attesa
  useEffect(() => {
    if (!pending) return;
    return qc.getQueryCache().subscribe((e) => {
      // `manual`: è la modifica ottimistica stessa, non una rilettura
      if (e.type === 'updated' && e.action.type === 'success' && !e.action.manual) void loadSync().then((s) => s.reapplyPending(qc, userId));
    });
  }, [pending, qc, userId]);

  return null;
}

const time = (ms: number) => new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Pastiglia in testata: "Offline", "2 in attesa" o tutte e due. Toccandola si vede l'elenco e si può inviare subito. */
export function OfflinePill() {
  const qc = useQueryClient();
  const [sync, setSync] = useState<typeof import('../data/sync') | null>(null);
  const down = useNetDown();
  const pending = usePending();
  const flush = useFlush();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = pending.length;

  useEffect(() => {
    if (open) void loadSync().then(setSync);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!down && !n && !open) return null;
  // corta, per stare accanto al riepilogo del livello a 375 px: con qualcosa in coda il pallino rosso dice "offline"
  const text = n ? `${n} in attesa` : down ? 'Offline' : 'Inviato';
  const full = [down ? 'Offline' : 'In linea', n > 0 && `${n} in attesa di invio`].filter(Boolean).join(', ');

  const send = async () => {
    setBusy(true);
    try {
      await flush();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`net-pill${down ? ' down' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${full}: vedi i dettagli`}
        title={full}
      >
        <span className="net-dot" aria-hidden="true" />
        {text}
      </button>
      {open && (
        <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet net-sheet" role="dialog" aria-modal="true" aria-labelledby="net-title">
            <div className="card-h">
              <h2 id="net-title">{n ? 'In attesa di invio' : down ? 'Senza rete' : 'Tutto inviato'}</h2>
              <button className="x" onClick={() => setOpen(false)} aria-label="Chiudi">
                ×
              </button>
            </div>
            <p className="hint">
              {down
                ? 'Vedi gli ultimi dati salvati sul telefono. Allenamenti, peso e record si salvano qui e partono da soli quando torna la rete, anche se chiudi l’app.'
                : n
                  ? 'La rete c’è: li sto inviando.'
                  : 'Il server ha ricevuto tutto.'}
            </p>
            {n > 0 && (
              <ul className="net-list">
                {pending.map((i) => (
                  <li key={i.id}>
                    <span>{sync?.describe(qc, i) ?? '…'}</span>
                    <small>{time(i.at)}</small>
                  </li>
                ))}
              </ul>
            )}
            {n > 0 && (
              <button type="button" className="btn" onClick={send} disabled={busy} aria-busy={busy}>
                {busy ? 'Invio…' : 'Invia ora'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
