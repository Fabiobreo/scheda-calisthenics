// Foto di sfondo (ticket 33): dalla foto della palestra di Michael (688×1536) prepara le due larghezze WebP che
// index.html carica, precarica e il service worker tiene in cache.
//
//   node scripts/bg-photo.mjs percorso/della/foto.jpg   → public/bg/palestra-688.webp e palestra-480.webp
//   node scripts/bg-photo.mjs                           → segnaposto scuro con gli anelli, finché la foto non c'è
//   node scripts/bg-photo.mjs percorso/della/foto.webp marmo
//                                                       → public/bg/marmo-960.webp e marmo-640.webp: la foto chiara del
//                                                         fondo Marmo (ticket 43), che è orizzontale (2000×1116). Se ne
//                                                         tiene il centro in 4:3: sul telefono la fascia è più alta che
//                                                         larga e i lati non si vedrebbero comunque.
//
// Usa sharp, che arriva con @vite-pwa/assets-generator (già tra le dipendenze di sviluppo).
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'bg');
const W = 688;
const H = 1536;
const SIZES = [688, 480];

/** Segnaposto: fondo caldo che sfuma nel nero, due anelli appesi. Nessun dettaglio: deve solo occupare il posto. */
const placeholder = () =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="l" cx="50%" cy="8%" r="75%"><stop offset="0" stop-color="#5a4a35"/><stop offset=".55" stop-color="#231d17"/><stop offset="1" stop-color="#0b0b0d"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#l)"/>
  <g fill="none" stroke="#8a7350" stroke-width="5" opacity=".7">
    <path d="M250 0v330M438 0v330"/>
    <circle cx="250" cy="385" r="55"/><circle cx="438" cy="385" r="55"/>
  </g>
</svg>`);

const src = process.argv[2];
mkdirSync(OUT, { recursive: true });
if (process.argv[3] === 'marmo') {
  for (const w of [960, 640]) {
    const file = join(OUT, `marmo-${w}.webp`);
    await sharp(src).resize(w, (w * 3) / 4, { fit: 'cover', position: 'centre' }).webp({ quality: 68 }).toFile(file);
    console.log(file);
  }
  process.exit(0);
}
const input = src ? sharp(src) : sharp(placeholder());
for (const w of SIZES) {
  const file = join(OUT, `palestra-${w}.webp`);
  // stessa proporzione per le due larghezze (l'img in index.html dichiara 688×1536)
  await input.clone().resize(w, Math.round((H * w) / W), { fit: 'cover', position: 'top' }).webp({ quality: src ? 72 : 60 }).toFile(file);
  console.log(file);
}
