import { Link } from 'react-router-dom';
import { PageTitle } from '../../components/ui';
import { PRIVACY_CONTROLLER, PRIVACY_UPDATED, privacyEmail } from '../../lib/privacy';

/**
 * Informativa sulla privacy (ticket 38, audit A05). Si legge anche senza account: `signedIn` decide solo dove porta
 * "indietro". Il contatto del titolare arriva da `VITE_PRIVACY_EMAIL`: finché manca la pagina lo dice e i profili non
 * si possono rendere pubblici (vedi `src/lib/privacy.ts`).
 */
export function PrivacyView({ signedIn }: { signedIn: boolean }) {
  const email = privacyEmail();
  return (
    <>
      <PageTitle show title="Privacy" />
      <article className="card legal">
        <h2>Informativa sulla privacy</h2>
        <p className="sub">Ultimo aggiornamento: {PRIVACY_UPDATED}</p>

        <h3>Chi tratta i dati</h3>
        <p>
          Il titolare del trattamento è <b>{PRIVACY_CONTROLLER}</b>.{' '}
          {email ? (
            <>
              Per qualsiasi richiesta sui tuoi dati scrivi a <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            <>
              L'indirizzo a cui scrivere per le richieste sui dati <b>non è ancora stato indicato</b>: sarà pubblicato qui, e fino ad allora nessun profilo può essere reso pubblico.
            </>
          )}
        </p>

        <h3>Quali dati</h3>
        <ul>
          <li>Email e password dell'account (la password è salvata cifrata: non la leggiamo).</li>
          <li>Il nome che scegli, la nazione e, in Italia, la provincia (da cui si ricava la regione). Li indichi tu da un elenco: l'app non legge la posizione del telefono.</li>
          <li>Esercizi, allenamenti registrati, programma e note.</li>
          <li>Record di livello, col peso corporeo dove la formula del punteggio lo richiede.</li>
          <li>I punteggi del livello calcolati dai tuoi record.</li>
          <li>Il collegamento con un trainer, se lo usi.</li>
          <li>Chi segui, chi ti segue, le richieste, le persone che blocchi o segnali.</li>
          <li>Gli allenamenti che scegli di condividere e le novità che nascono dai record che condividi.</li>
        </ul>

        <h3>A cosa servono</h3>
        <p>A far funzionare l'app: tenere il registro degli allenamenti, calcolare il livello, mostrare le classifiche, farti trovare e seguire dagli amici e, se lo vuoi, farti seguire da un trainer. Nessuna pubblicità, nessuna profilazione, nessun dato ceduto o venduto.</p>

        <h3>Chi vede cosa</h3>
        <ul>
          <li>
            <b>Solo tu</b>: email, allenamenti, programma, note, peso corporeo e i record che non condividi.
          </li>
          <li>
            <b>Chiunque usi l'app</b>, cercandoti per nome o aprendo il tuo link: il tuo nome e il tuo livello (Base, Intermedio… non i punti). Se il profilo è pubblico anche il luogo.
          </li>
          <li>
            <b>Le persone che ti seguono</b> (se il profilo è privato le accetti tu, una per una): nome, punti e luogo, i record che condividi (esercizio, valore, data: mai il peso corporeo), gli allenamenti che condividi e il fatto che le hai superate in classifica. I record si condividono da soli quando migliorano il punteggio: lo spegni da Account, o record per record.
          </li>
          <li>
            <b>Il trainer che colleghi</b>, finché resta collegato: nome, luogo, allenamenti, programma, record e peso dentro i record. Lo scolleghi quando vuoi da Account.
          </li>
          <li>
            <b>Classifiche, profilo privato</b> (è così per tutti finché non lo cambi): nome e punti li vedono solo le persone che ti seguono dopo che le hai accettate. Per tutti gli altri conti come una posizione senza nome.
          </li>
          <li>
            <b>Classifiche, profilo pubblico</b> (lo scegli tu da Account): gli altri utenti dell'app vedono il tuo nome e i tuoi punti nelle classifiche del mondo, della tua nazione, regione e provincia.
          </li>
        </ul>
        <p>
          Record e peso corporeo non compaiono mai nelle classifiche. Puoi smettere di essere seguito da qualcuno, bloccarlo o segnalarlo dalla pagina Persone: una segnalazione la legge solo il titolare.
        </p>

        <h3>Dove stanno e per quanto</h3>
        <p>
          I dati sono salvati nel database dell'app presso Supabase; l'app è pubblicata tramite Vercel. Restano finché esiste l'account. Con <b>Elimina account</b> si cancella tutto subito, compresi la tua riga nelle classifiche, chi segui, le tue novità e gli allenamenti condivisi. Una copia degli ultimi dati resta sul tuo dispositivo per usare l'app senza rete: si cancella uscendo dall'account.
        </p>

        <h3>I tuoi diritti</h3>
        <p>
          Puoi vedere e scaricare i tuoi dati (Account → Esporta i dati), correggerli, cancellarli (Account → Elimina account), tornare privato in ogni momento e opporti al trattamento scrivendo al titolare. Puoi anche presentare un reclamo al Garante per la protezione dei dati personali.
        </p>

        <p className="mt-16">
          <Link className="link" to={signedIn ? '/account' : '/'}>
            ← {signedIn ? 'Torna ad Account' : 'Torna all\'accesso'}
          </Link>
        </p>
      </article>
    </>
  );
}
