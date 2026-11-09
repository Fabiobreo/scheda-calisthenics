import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icone dell'app da public/icon.svg (ticket 06). Maskable e Apple su fondo scuro, non bianco.
const background = '#0a1013';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
});
