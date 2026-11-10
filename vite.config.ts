import { defineConfig } from 'vitest/config';
import { appCommit, appVersion } from './scripts/build-info.mjs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Scheda Calisthenics',
        short_name: 'Scheda',
        description: 'Registro allenamenti: programma, serie, record e grafici.',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a1013',
        theme_color: '#0a1013',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    // le sessioni parallele lavorano in .claude/worktrees: i loro test non sono quelli di questa copia
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
