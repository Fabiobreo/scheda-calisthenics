/**
 * Dati dell'informativa sulla privacy (ticket 38, audit A05).
 *
 * Il titolare del trattamento è Fabio Brea, come persona (deciso il 25 novembre 2026). L'email di contatto per le
 * richieste sui dati NON è ancora stata decisa: arriva da `VITE_PRIVACY_EMAIL`. Finché manca l'informativa è
 * incompleta, e per questo nessun profilo si può rendere pubblico (`publicProfilesEnabled`): nome e luogo non
 * diventano visibili ad altri prima che l'informativa dica a chi scrivere.
 */
export const PRIVACY_CONTROLLER = 'Fabio Brea';

export const PRIVACY_UPDATED = '25 novembre 2026';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** L'email di contatto, se è configurata e ha la forma di un indirizzo; altrimenti null. */
export function privacyEmail(raw: string | undefined = import.meta.env.VITE_PRIVACY_EMAIL): string | null {
  const v = raw?.trim() ?? '';
  return EMAIL_RE.test(v) ? v : null;
}

/** I profili pubblici si possono accendere solo con l'informativa completa. */
export const publicProfilesEnabled = (raw?: string) => privacyEmail(raw) !== null;
