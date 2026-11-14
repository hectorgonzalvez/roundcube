'use strict';
/**
 * D'on ix la llista de fitxers que mira un check.
 *
 * Tres dels checks d'esta carpeta -secrets, tokens hardcodejats i antipatrons- usaven git només
 * per a una cosa: **obtindre noms de fitxer**. El que fan després (obrir-los i passar-los regex)
 * no sap res de commits. Això vol dir que la seua dependència de git era accidental, no de fons,
 * i es notava en el pitjor moment: fora d'un repositori petaven amb un rastre de pila de Node en
 * lloc de dir què passava (comprovat el 2026-09-10 en una carpeta sense `.git`).
 *
 * Ací es separen les dos preguntes. `--base/--head` respon "què ha canviat" i necessita historial;
 * `--dir` respon "què hi ha" i no necessita res. La segona serveix a qui treballa sense git -un
 * TFS antic, una carpeta compartida, un projecte encara sense repositori- i de propina és més
 * estricta, perquè mira tot el codi i no només el tocat en un PR.
 *
 * El que NO es pot portar ací és `comprova-documentacio.js` (comprova que el codi i la seua
 * documentació canvien *junts*: sense diff no hi ha "junts") ni `comprova-frescor.js` (compta
 * commits des de l'últim toc d'un document: sense historial no hi ha res a comptar). Per a eixos
 * dos hi ha `exigixGit()`, que almenys ho diu en una línia en lloc de petar.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Carpetes que no són codi del projecte. `packages/` NO hi entra a propòsit: en un monorepo pnpm
// -sistema-disseny-ua, sense anar més lluny- és precisament on viu el codi.
const IGNORA = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  'bin',
  'obj',
  '.vs',
  '.idea',
  '.venv',
  '__pycache__',
]);

function dinsDeGit(dir) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dir || process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Rutes relatives al directori de treball, amb barres cap avant: és la forma que tenen els noms
// que dóna `git diff --name-only`, i les llistes d'exempcions de cada check estan escrites així.
function arbre(dir) {
  const trobats = [];
  (function recorre(actual) {
    for (const e of fs.readdirSync(actual, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!IGNORA.has(e.name)) recorre(path.join(actual, e.name));
      } else if (e.isFile()) {
        trobats.push(path.relative(process.cwd(), path.join(actual, e.name)).split(path.sep).join('/'));
      }
    }
  })(path.resolve(dir));
  return trobats.sort();
}

function delDiff(cmd, nom) {
  if (!dinsDeGit()) {
    console.error(`${nom}: ací no hi ha cap repositori git, i este mode compara dos punts de l'historial.`);
    console.error(`Sense git: node ${nom} --dir . -mira l'arbre sencer en lloc del diff.`);
    process.exit(2);
  }
  return execSync(cmd, { encoding: 'utf8' }).split('\n').filter(Boolean);
}

/** La llista de fitxers d'un check: de l'arbre si hi ha `dir`, del diff si no. */
function llista({ dir, cmd, nom }) {
  return dir ? arbre(dir) : delDiff(cmd, nom);
}

/** Per als checks que no tenen versió sense historial: dir-ho clar i eixir. */
function exigixGit(nom, motiu) {
  if (dinsDeGit()) return;
  console.error(`${nom}: ací no hi ha cap repositori git, i este check ${motiu}.`);
  console.error('No té mode sense git -no és una limitació de la implementació, és la pregunta que fa.');
  console.error('Sense git continuen valent: valida-documentacio.js --dir, comprova-desfasament.js,');
  console.error('comprova-secrets.js --dir, comprova-tokens-hardcoded.js --dir i comprova-antipatrons.js --dir.');
  process.exit(2);
}

module.exports = { dinsDeGit, arbre, llista, exigixGit };
