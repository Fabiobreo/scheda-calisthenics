// Tabella di verifica dei punteggi v2 per Michael (ticket 31).
//
//   node scripts/tabella-punteggi.mjs
//
// Regole: `Correzioni punteggi.pdf` (22/11) per i fondamentali, `Correzioni punteggi 26_11.pdf` per skill e handbalance.
// Le lettere sono quelle dei PDF (A = il livello più facile): nell'app si leggono al contrario (A = il più difficile).
//
// Per ogni livello di ogni catena, a 60, 70 e 80 kg di peso corporeo, scrive il valore da inserire a inizio, metà
// e fine livello, la % del livello e i punti. I numeri escono dal motore (`src/lib/levels/v2`): lo script non
// contiene formule, cerca solo i valori da mettere in riga. Rigenerarla dopo ogni cambio a `rules.ts`.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const OUT = fileURLToPath(new URL('../ticket/riferimenti/31-tabella-verifica-punteggi.md', import.meta.url));
const WEIGHTS = [60, 70, 80];
const POINTS = [
  ['inizio', 0],
  ['metà', 0.5],
  ['fine', 1],
];

const vite = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true },
});
const { BANDS, BAND_NAMES, CATEGORIES, CHAINS, LIMITS, REF_KG, chainMax, levelPercent, levelStart, scoreChain } = await vite.ssrLoadModule(
  '/src/lib/levels/v2/index.ts',
);
await vite.close();

const num = (x, digits = 2) => x.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: digits });
const UNIT = { reps: 'rip.', seconds: 's', kg: 'kg' };

/**
 * Valore normalizzato della formula a carico, per chi rifà il conto a mano: G in kg, oppure per gli HSPU zavorrati
 * (formula `ratio`) H = (zavorra / 60) × (60/peso)^esponente, scritto in percentuale.
 */
function normalized(chain, entry, level, value, bw) {
  const d = Math.pow(REF_KG / bw, chain.exponent);
  if (level.formula.kind === 'ratio') return `${num((100 * value * d) / REF_KG)}%`;
  return num(entry.load === 'bilanciere' ? value * d : (bw + value) * d);
}

/** Carico (arrotondato per eccesso al decimo di kg) che porta G (o H, per `ratio`) al valore voluto. */
function loadFor(chain, entry, level, g, bw) {
  const d = Math.pow(REF_KG / bw, chain.exponent);
  const raw = level.formula.kind === 'ratio' ? (g * REF_KG) / d : entry.load === 'bilanciere' ? g / d : g / d - bw;
  const min = 0.1;
  return Math.max(min, Math.ceil(raw * 10 - 1e-6) / 10);
}

/** I tre valori (inizio, metà, fine) di un livello per un peso corporeo. */
function values(chain, entry, level, bw) {
  if (entry.measure === 'kg') {
    const { start, width } = level.formula;
    return POINTS.map(([label, t]) => [label, loadFor(chain, entry, level, start + width * t, bw)]);
  }
  const max = entry.measure === 'reps' ? LIMITS.maxReps : LIMITS.maxSeconds;
  const first = (target) => {
    for (let v = 1; v <= max; v++) if (levelPercent(chain.id, level.letter, v, bw) >= target) return v;
    return max;
  };
  const from = first(1);
  const to = first(100);
  return [
    ['inizio', from],
    ['metà', Math.round((from + to) / 2)],
    ['fine', to],
  ];
}

const lines = [];
const out = (s = '') => lines.push(s);

out('# Tabella di verifica dei punteggi v2');
out();
out('Generata da `node scripts/tabella-punteggi.mjs` con il motore di `src/lib/levels/v2` (ticket 31). Non modificarla a mano.');
out();
out('**Per Michael**: ogni riga è un record inserito nell’app. Rifai il conto con la tua formula e segnala le righe che non tornano.');
out();
out('Skill tirata, skill spinta e handbalance seguono `Correzioni punteggi 26_11.pdf`; i fondamentali il PDF del 22 novembre.');
out('Le lettere dei livelli sono quelle dei PDF (**A = il più facile**): nell’app si leggono al contrario (A = il più difficile).');
out();
out('Come leggerla:');
out();
out('- **Peso**: peso corporeo dentro il record. "—" quando la formula non lo usa (il risultato è uguale per tutti).');
out('- **Valore**: quello che l’utente scrive (ripetizioni, secondi, kg di zavorra o di massimale), all’inizio, a metà e alla');
out('  fine del livello. I kg sono arrotondati per eccesso al decimo, ripetizioni e secondi sono interi: per questo a 70 e');
out('  80 kg "inizio" e "fine" non danno sempre 1% e 100% esatti.');
out('- **G**: solo per i kg, il valore normalizzato della formula: `(peso + zavorra) × (60/peso)^esponente`, oppure');
out('  `massimale × (60/peso)^esponente` per panca e military.');
out('- **H**: solo per gli HSPU zavorrati (PDF del 26 novembre), la zavorra come percentuale dei 60 kg di riferimento:');
out('  `(zavorra / 60) × (60/peso)^0,75`. Il peso del corpo non entra nella somma.');
out('- **% livello**: il risultato della formula del livello (0 se non raggiunto, da 1 a 100).');
out('- **Punti livello**: % × punti massimi del livello, non arrotondati.');
out('- **Punti catena**: quello che vale il record per tutta la catena, arrotondato all’intero: livelli sotto pieni + punti del');
out('  livello raggiunto. Alla **fine** di un livello a carico il record entra già nel livello successivo all’1%: i punti della');
out('  catena contano anche quell’1% (es. trazioni a 60 kg con 27 kg: livello C pieno = 300, più 1% del livello D = 301).');
out();
out('Fasce dei livelli con nome (le skill non hanno Base: partono da Intermedio):');
out();
const BAND_IDS = Object.keys(BAND_NAMES);
out(`| | ${Object.values(BAND_NAMES).join(' | ')} |`);
out(`|---|${BAND_IDS.map(() => '---|').join('')}`);
for (const scope of [...CATEGORIES, { id: 'complessivo', name: 'Complessivo' }]) {
  const cell = (id) => {
    const b = BANDS[scope.id].find((x) => x.id === id);
    return b ? `${b.from}–${b.to}` : '—';
  };
  out(`| ${scope.name} | ${BAND_IDS.map(cell).join(' | ')} |`);
}

let rows = 0;
for (const category of CATEGORIES) {
  out();
  out(`## ${category.name}`);
  for (const chain of CHAINS.filter((c) => c.category === category.id)) {
    out();
    out(`### ${chain.name} (${chainMax(chain)} punti${chain.exponent === null ? '' : `, esponente ${num(chain.exponent)}`})`);
    for (const level of chain.levels) {
      const entry = chain.entries.find((e) => e.levels.includes(level.letter));
      const start = levelStart(chain, level.letter);
      out();
      out(`**Livello ${level.letter} — ${level.name}** · ${BAND_NAMES[level.band]} · ${level.max} punti (da ${start} a ${start + level.max} nella catena) · voce "${entry.name}"`);
      out();
      const kg = entry.measure === 'kg';
      out(`| Peso | Punto | Valore |${kg ? ` ${level.formula.kind === 'ratio' ? 'H' : 'G'} |` : ''} % livello | Punti livello | Punti catena |`);
      out(`|---|---|---|${kg ? '---|' : ''}---|---|---|`);
      for (const bw of entry.usesBodyweight ? WEIGHTS : [null]) {
        // valori uguali (es. a 80 kg bastano 2 ripetizioni: metà = fine) stanno in una riga sola
        const byValue = new Map();
        for (const [label, value] of values(chain, entry, level, bw ?? REF_KG)) byValue.set(value, [...(byValue.get(value) ?? []), label]);
        for (const [value, labels] of byValue) {
          const label = labels.join(' = ');
          const percent = levelPercent(chain.id, level.letter, value, bw ?? REF_KG);
          const record = { chainId: chain.id, entry: entry.id, value, bodyweightKg: bw };
          const chainPoints = scoreChain(chain.id, [record]).points;
          const g = kg ? ` ${normalized(chain, entry, level, value, bw)} |` : '';
          out(`| ${bw === null ? '—' : `${bw} kg`} | ${label} | ${num(value, 1)} ${UNIT[entry.measure]} |${g} ${num(percent)}% | ${num((percent / 100) * level.max)} | ${chainPoints} |`);
          rows++;
        }
      }
    }
  }
}
out();

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Scritte ${rows} righe in ${OUT}`);
