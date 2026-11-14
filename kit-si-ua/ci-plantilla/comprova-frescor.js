#!/usr/bin/env node
/**
 * Detector de documentació rançosa (el mecanisme invers del hook de commit): per a cada
 * regla del docmap, compta els commits que han tocat el codi des de l'últim commit que va
 * tocar la seua documentació. Si passen del llindar, avisa -mai bloqueja (exit sempre 0):
 * la frescor és un senyal per al revisor, no una porta.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-frescor.js [--config docmap.json] [--llindar 15]
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const configPath = arg('config', path.join(__dirname, 'docmap.json'));
const llindar = parseInt(arg('llindar', '15'), 10);

if (!fs.existsSync(configPath)) {
  console.error(`Config no trobada: ${configPath}`);
  process.exit(0); // avís, mai bloqueig
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Fora d'un repositori, git() tornava '' per a tot i el check acabava dient "cap senyal de
// documentació rançosa": verd damunt de no haver mirat res, que és el mode de fallada que este
// catàleg persiguix. Ara ho diu i para. No té mode sense git perquè el que compta són commits
// des de l'últim toc d'un document: sense historial no hi ha res a comptar. L'eixida 2 no
// contradiu que este check mai bloquege -no bloqueja per una troballa; això és no poder córrer.
let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}
fitxers.exigixGit('comprova-frescor.js', "compta commits des de l'última vegada que es va tocar cada document");

function git(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch { return ''; }
}

let stale = 0;
for (const regla of config.regles || []) {
  const docs = regla.documentacio.filter(d => fs.existsSync(d));
  if (!docs.length) { console.log(`avís "${regla.nom}": cap document del mapa existix encara (${regla.documentacio.join(', ')})`); stale++; continue; }

  const lastDocCommit = git(`git log -1 --format=%H -- ${docs.map(d => `"${d}"`).join(' ')}`);
  if (!lastDocCommit) continue;

  // Els patrons del docmap són regex; git pathspec no els entén. Filtrem a mà.
  //
  // `nomes_naixement_o_mort` s'ignora ACÍ a propòsit (2026-08-24). Els dos consumidors del mateix
  // mapa no volen el mateix llindar: qui bloqueja (`comprova-documentacio.js`, i el hook local)
  // ha de callar davant d'una edició de cos, perquè acusar-la és el soroll que acaba fent que
  // algú apague el guardia; ací, en canvi, que el catàleg es moga molt sense que la seua
  // documentació es toque **és exactament el senyal que es busca** -és el motiu pel qual la regla
  // inversa existix (el mes de deriva del marc referencial, CHANGELOG 2026-08-23). Estrényer-la
  // també ací tornaria a deixar el detector cec. La mateixa distinció que la regla de govern fixa
  // per a la severitat, aplicada ara a l'abast d'una regla.
  const codiRe = regla.codi.map(p => new RegExp(p));
  // El marcador `@@` davant del hash delimita els commits. Amb `--format=%H` pelat, git
  // separa el hash de la llista de fitxers amb una línia en blanc però els commits entre si
  // només amb un salt de línia, de manera que tallar per `\n\n` desalineava els blocs: el
  // primer fitxer de cada commit es perdia amb el `slice(1)` i un commit d'un sol fitxer es
  // tornava invisible. El check donava 0 sobre històries que sí que havien tocat el codi
  // (detectat pel control negatiu de proves/, 2026-08-24).
  const commits = git(`git log --format=@@%H ${lastDocCommit}..HEAD --name-only`).split('@@').slice(1);
  let count = 0;
  for (const block of commits) {
    const files = block.split('\n').slice(1).filter(Boolean);
    if (files.some(f => codiRe.some(r => r.test(f)))) count++;
  }

  if (count >= llindar) {
    stale++;
    console.log(`avís "${regla.nom}": ${count} commits toquen el codi des de l'última actualització de ${docs.join('/')} (llindar: ${llindar}) -revisa si la documentació seguix sent certa.`);
  } else {
    console.log(`✔ "${regla.nom}": ${count} commits des de l'última actualització de documentació.`);
  }
}
if (!stale) console.log('\nCap senyal de documentació rançosa.');
process.exit(0);
