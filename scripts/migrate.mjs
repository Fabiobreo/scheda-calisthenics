// Applica al database Supabase le migration nuove di supabase/migrations/.
// Gira alla fine di `npm run build`, solo nei deploy di produzione su Vercel: le anteprime e i build locali non toccano il database.
// Se fallisce, fallisce il build e Vercel non pubblica il codice nuovo su un database vecchio.
import { spawnSync } from 'node:child_process';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('migrate: non è un deploy di produzione, salto le migration');
  process.exit(0);
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('migrate: manca SUPABASE_DB_URL nelle variabili di Vercel (vedi README, "Migration automatiche")');
  process.exit(1);
}

const res = spawnSync('supabase', ['db', 'push', '--yes', `--remote=${url}`], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(res.status ?? 1);
