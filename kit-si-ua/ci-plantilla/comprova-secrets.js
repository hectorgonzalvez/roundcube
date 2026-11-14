#!/usr/bin/env node
/**
 * Detecta claus d'API, contrasenyes i altres secrets probables abans que acaben
 * en un commit o al servidor Git. Determinista (regex), sense dependències -mateix
 * mecanisme que comprova-tokens-hardcoded.js, aplicat a seguretat en lloc de disseny.
 * És l'excepció legítima de "negació": un secret filtrat és un incident, no un
 * estil a millorar -per això bloqueja per defecte, sense --warn.
 *
 * Tres modes:
 *   --staged                       fitxers staged (`git diff --cached`) -ús local, hook de commit
 *   --base origin/main --head HEAD fitxers canviats entre dos refs -ús CI, com la resta de checks
 *   --dir <carpeta>                tots els fitxers de l'arbre -sense git, i més estricte: mira
 *                                  el codi sencer i no només el tocat en un PR
 *
 * Bypass: marcador [secrets-ok] obrint o tancant una línia del missatge de commit (mateix patró
 * que [no-doc] -anomenar-lo enmig d'una frase no l'invoca), comprovat pel hook que crida este
 * script, no per este script -ell sempre reporta trobades.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-secrets.js --staged
 *      node kit-si-ua/ci-plantilla/comprova-secrets.js --base origin/main --head HEAD
 *      node kit-si-ua/ci-plantilla/comprova-secrets.js --dir .
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const staged = process.argv.includes('--staged');
const dir = arg('dir', null);
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');

const diffCmd = staged ? 'git diff --cached --name-only' : `git diff --name-only ${base}...${head}`;

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

// Fitxers on una cadena semblant a un secret és, per definició, un exemple -no un secret real.
// `ci-plantilla/proves/` hi entra pel mateix motiu que el propi script: els controls negatius
// del check contenen secrets falsos a propòsit, i sense esta excepció el check acusaria el
// material de les seues pròpies proves. El patró no s'ancora a l'arrel perquè al consumidor la
// carpeta viu a `ci-plantilla/` i ací a `kit-si-ua/ci-plantilla/`.
const EXEMPT = [
  /\.example$/,
  /\.sample$/,
  /docmap\.exemple\.json$/,
  /^kit-si-ua\/ci-plantilla\/comprova-secrets\.js$/,
  /(^|\/)ci-plantilla\/patrons-secrets\.js$/,
  /(^|\/)ci-plantilla\/proves\//,
];

const changed = fitxers
  .llista({ dir, cmd: diffCmd, nom: 'comprova-secrets.js' })
  .filter(f => !EXEMPT.some(r => r.test(f)) && fs.existsSync(f));

// Els patrons viuen a `patrons-secrets.js` des de la 1.45.0: el hook `oculta-secrets-eixida.js`
// de `hooks-plantilla/` aplica els mateixos a l'eixida de les eines, i dos còpies divergirien.
let PATTERNS, PLACEHOLDER_RE, TRUNCAT_RE;
try {
  ({ PATTERNS, PLACEHOLDER_RE, TRUNCAT_RE } = require('./patrons-secrets.js'));
} catch (e) {
  console.error("Falta patrons-secrets.js al costat d'este script (arriba amb ci-plantilla 1.45.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

let found = 0;
for (const file of changed) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { re, motiu, captura } of PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      if (captura && (PLACEHOLDER_RE.test(m[captura]) || TRUNCAT_RE.test(m[captura]))) continue; // valor d'exemple, no un secret real
      found++;
      console.log(`✖ ${file}:${i + 1} — ${motiu}: ${line.trim().slice(0, 90)}`);
      break;
    }
  });
}

if (!found) console.log('Cap secret probable als fitxers canviats.');
else console.log(`\n${found} troballa(es) — si és un fals positiu (valor d'exemple no cobert per PLACEHOLDER_RE), afig-lo com a excepció al script en lloc d'ometre el check.`);
process.exit(found ? 1 : 0);
