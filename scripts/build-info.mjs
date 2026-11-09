// Versione mostrata in Account (audit A05): quella di package.json più il commit corto.
// Su Vercel il commit arriva da VERCEL_GIT_COMMIT_SHA, in locale da git. Sta qui (JS) perché vite.config.ts è
// controllato da tsc senza i tipi di Node.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const appVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

export const appCommit = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
})();
