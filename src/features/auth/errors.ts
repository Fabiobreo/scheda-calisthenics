import type { AuthError } from '@supabase/auth-js';

/**
 * Messaggio in italiano per un errore di Supabase Auth. Mai il testo grezzo: arriva in inglese.
 * Nota: supabase-js restituisce gli errori di rete (AuthRetryableFetchError) invece di lanciarli.
 */
export function authMessage(error: AuthError): string {
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'Connessione non riuscita. Controlla la rete e riprova.';
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email o password non corretti.';
    case 'email_not_confirmed':
      return "Devi ancora confermare l'email: apri il link che ti abbiamo mandato.";
    case 'user_already_exists':
    case 'email_exists':
      return 'Esiste già un account con questa email.';
    case 'weak_password':
      return 'Password troppo debole: usa almeno 8 caratteri, meglio con numeri e simboli.';
    case 'same_password':
      return 'La nuova password deve essere diversa da quella attuale.';
    case 'over_email_send_rate_limit':
      return 'Troppe email inviate. Riprova tra qualche minuto.';
    case 'over_request_rate_limit':
      return 'Troppi tentativi. Aspetta qualche secondo e riprova.';
    case 'email_address_invalid':
      return 'Indirizzo email non valido.';
    case 'signup_disabled':
      return 'Le registrazioni sono chiuse.';
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'Per sicurezza esci e rientra, poi cambia la password.';
    case 'email_address_not_authorized':
      return 'Non posso mandare email a questo indirizzo.';
  }
  if (error.status === 429) return 'Troppi tentativi. Aspetta qualche secondo e riprova.';
  return 'Qualcosa è andato storto. Riprova.';
}
