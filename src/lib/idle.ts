/**
 * Esegue `fn` appena il browser è libero, dopo il primo disegno (audit A4): serve a scaricare in anticipo i pezzi
 * caricati con `lazy()`, così chi tocca un foglio o cambia scheda non aspetta la rete. Safari non ha
 * `requestIdleCallback`: lì basta un ritardo. Restituisce la funzione che annulla.
 */
export function whenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 3000 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 1500);
  return () => clearTimeout(t);
}
