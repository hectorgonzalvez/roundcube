#!/usr/bin/env node
/**
 * Versió CI de la regla "zero valors hardcoded" d'ua-vue-uacloud: detecta colors
 * literals (#hex, rgb(), oklch()) i mides en style="" inline als fitxers frontend canviats,
 * fora dels fitxers font de tokens (que són els únics on un literal és legítim).
 *
 * Inclou també la regla "només transform/opacity" i el check de
 * `prefers-reduced-motion` d'ua-ux-moviment: transicions/animacions sobre altres
 * propietats (layout shift) i fitxers amb animació sense cap gestió de
 * `prefers-reduced-motion`. Determinista (regex), mateix cost que la resta d'este
 * script -no invoca cap agent, per això és apte per a executar-se en cada PR.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --base origin/main --head HEAD [--warn]
 *      node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --dir .   (sense git: tot l'arbre)
 *      node kit-si-ua/ci-plantilla/comprova-tokens-hardcoded.js --fitxer components/A.vue [--fitxer …]
 *      --warn: reporta sense fallar (per a adopció gradual en un legacy)
 *
 * `--fitxer` (repetible, 1.37.0): mateix contracte que a `comprova-antipatrons.js`. És la porta del
 * hook `hooks-plantilla/comprova-edicio.js`, que passa el fitxer que l'agent acaba d'editar.
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');
const warnOnly = process.argv.includes('--warn');
const dir = arg('dir', null);

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

// Fitxers on un literal és legítim: definicions de tokens i bundles generats. `.packed.html` i
// `.artifact.html` són l'eixida de `pack.mjs` (gen-html-plan), que inlinea el CSS del runtime; la
// font `.html` sí que es revisa.
const EXEMPT = [/tokens?\.css$/, /^vendor\//, /ua-ds\.(bundled\.)?(css|js)$/, /\.(packed|artifact)\.html$/, /^demos\//, /^marc-referencial\//, /^planificacio\//];
const FRONTEND = /\.(css|vue|html)$/;

// `--fitxer` guanya sobre `--dir` i sobre el diff: qui nomena les rutes sap què vol revisar.
const nomenats = process.argv
  .map((a, i, tots) => (a === '--fitxer' ? tots[i + 1] : null))
  .filter(Boolean)
  .map((f) => f.split('\\').join('/').replace(/^\.\//, ''));

// Un fitxer només reanomenat (R100: mateix contingut, ruta nova) no afig cap línia, però el check
// el llegiria sencer: moure una carpeta acusaria tot el que ja hi havia abans de la regla.
const reanomenats = new Set(
  nomenats.length || dir
    ? []
    : fitxers
        .llista({ cmd: `git diff --name-status -M ${base}...${head}`, nom: 'comprova-tokens-hardcoded.js' })
        .map(l => l.split('\t'))
        .filter(c => c[0] === 'R100')
        .map(c => c[2])
);

const changed = (
  nomenats.length
    ? nomenats
    : fitxers.llista({ dir, cmd: `git diff --name-only ${base}...${head}`, nom: 'comprova-tokens-hardcoded.js' })
)
  .filter(f => FRONTEND.test(f) && !EXEMPT.some(r => r.test(f)) && !reanomenats.has(f) && fs.existsSync(f));

const PATTERNS = [
  { re: /#[0-9a-fA-F]{3,8}\b/, motiu: 'color hex literal' },
  { re: /\b(rgb|rgba|oklch|hsl)\(/, motiu: 'funció de color literal' },
  { re: /style="[^"]*\b\d+px/, motiu: 'mida en px dins de style inline' },
];

// ua-ux-moviment § "Regla no negociable": només transform/opacity es transicionen/animen.
const MOTION_LAYOUT_RE = /\b(transition|animation)(-property)?\s*:\s*[^;]*\b(width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|background(-color)?|color)\b/i;
const MOTION_ANY_RE = /\b(transition|animation)\s*:|@keyframes\b/i;
const REDUCED_MOTION_RE = /prefers-reduced-motion/i;

let found = 0;
for (const file of changed) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let hasMotion = false;
  lines.forEach((line, i) => {
    if (MOTION_ANY_RE.test(line)) hasMotion = true;
    if (line.includes('var(--')) return; // ús de token: correcte encara que la línia continga parèntesis
    for (const { re, motiu } of PATTERNS) {
      if (re.test(line)) {
        found++;
        console.log(`${warnOnly ? 'avís' : '✖'} ${file}:${i + 1} — ${motiu}: ${line.trim().slice(0, 90)}`);
        break;
      }
    }
    if (MOTION_LAYOUT_RE.test(line)) {
      found++;
      console.log(`${warnOnly ? 'avís' : '✖'} ${file}:${i + 1} — transition/animation sobre propietat que no és transform/opacity (layout shift, ua-ux-moviment): ${line.trim().slice(0, 90)}`);
    }
  });
  if (hasMotion && !REDUCED_MOTION_RE.test(content)) {
    found++;
    console.log(`${warnOnly ? 'avís' : '✖'} ${file} — té transition/animation/@keyframes però no gestiona prefers-reduced-motion (ua-ux-moviment)`);
  }
}

if (!found) console.log('Cap valor hardcoded ni infracció de moviment als fitxers frontend canviats.');
else console.log(`\n${found} troballa(es) — tokens sempre var(--token), moviment sempre transform/opacity + prefers-reduced-motion (ua-vue-uacloud / ua-ux-moviment).`);
process.exit(found && !warnOnly ? 1 : 0);
