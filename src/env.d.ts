/** Scritti da vite.config.ts al build (`define`): versione di package.json e commit corto. */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

interface ImportMetaEnv {
  /** Facoltativa: email del supporto mostrata in Account. Senza, la voce non compare. */
  readonly VITE_SUPPORT_EMAIL?: string;
}
