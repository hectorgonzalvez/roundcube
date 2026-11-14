#!/usr/bin/env node
/**
 * Verifica que el kit de documentació de projecte (generat per kit-projecte/genera-kit.js) existix
 * i no ha divergit de la plantilla canònica. Nivell 1 bloqueja (exit 1) -"tot projecte UA viu" el
 * necessita, segons kit-si-ua/kit-projecte/documentacio-projecte.md; Nivell 2/3 només avisen (exit 0),
 * mateixa filosofia d'adopció incremental que eixe document defén.
 *
 * Diferència amb kit-projecte/genera-kit.js: allò genera una vegada: açò es repeteix a cada PR per a
 * detectar deriva posterior (fitxer esborrat, secció eliminada), no només comprovar el dia 1.
 *
 * També emet avisos de govern (mai bloquegen): títol encara amb "(plantilla)", seccions "Pendent"
 * sense omplir, i "Last-review" de fa més de 180 dies -l'únic mode de fallada real del kit és que
 * ningú torne a estos fitxers als mesos i ningú se n'adona.
 *
 * Ús: node kit-si-ua/ci-plantilla/valida-documentacio.js --dir <ruta-projecte>
 */
'use strict';
const fs = require('fs');
const path = require('path');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}

const dir = arg('dir', '.');
const arrel = path.join(__dirname, '..');
const plantilles = path.join(arrel, 'kit-projecte', 'plantilles');

// El punt d'entrada és neutre (CONTEXT-IA.md) i `CLAUDE.md`/`AGENTS.md` només hi remeten
// (DECISIONS.md § "Punt d'entrada del kit de projecte"). Els punters es comproven a banda: no
// tenen capçaleres `##` a comparar, però sí que han d'anomenar el fitxer neutre -un punter que no
// hi apunta deixa l'eina corresponent sense context i és una fallada silenciosa.
const PUNTERS = ['CLAUDE.md', 'AGENTS.md'];

// El disseny (kit a doc-projecte/ o a l'arrel) el resol disseny-kit.js; ací només hi ha rutes
// relatives a doc-projecte/.
let disseny;
try {
  disseny = require('./disseny-kit.js');
} catch (e) {
  console.error("Falta disseny-kit.js al costat d'este script (arriba amb ci-plantilla 1.50.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

const N1 = [
  { rel: 'CONTEXT-IA.md', plantilla: path.join(plantilles, 'CONTEXT-IA.md.plantilla') },
  { rel: 'PROJECTE.md', plantilla: path.join(plantilles, 'PROJECTE.md.plantilla') },
  { rel: 'DECISIONS.md', plantilla: path.join(plantilles, 'DECISIONS.md.plantilla') },
  { rel: 'ESTANDARDS.md', plantilla: path.join(arrel, 'ESTANDARDS.md') },
];
// Companions de N1 (kit-projecte/README.md): van amb el nivell 1, però faltar-ne un només avisa
// -fer-los obligatoris faria fallar la CI de projectes generats abans que existiren. `prompts/`
// no hi és a posta: és una convenció, no un requisit (kit-projecte 2.5.0).
const N1_COMPANIONS = [
  { rel: 'historial-decisions.md' },
];
const N2 = [
  { rel: 'CONEIXEMENT-VIU.md' },
  { rel: 'SEGURETAT.md' },
  { rel: 'TECH-DEBT.md' },
  { rel: 'historial-bugs.md' },
  { rel: path.join('producte', 'README.md') },
];
const N3 = [
  { rel: 'ARCHITECTURE.md' },
  { rel: 'UX-CHECKLIST.md' },
];

function capcaleres(contingut) {
  return (contingut.match(/^## .+$/gm) || []).map(l => l.trim());
}

const DIES_OBSOLET = 180;

// Avisos de govern (no bloquegen, § "Troballes pendents" de l'auditoria del kit, 2026-07-30): el
// kit no té cap manera de detectar que un fitxer generat s'ha quedat sense personalitzar als mesos
// -estos avisos ho fan visible en lloc de deixar-ho passar en silenci.
function avisosGovern(rel, contingut) {
  const avisos = [];
  if (/\(plantilla\)/.test(contingut.split('\n', 1)[0])) {
    avisos.push('el títol encara conté "(plantilla)" -sembla no personalitzat');
  }
  const pendents = (contingut.match(/\bPendent\b/g) || []).length;
  if (pendents > 0) {
    avisos.push(`${pendents} secció(ns) encara marcada(es) "Pendent"`);
  }
  const m = contingut.match(/\*\*Last-review\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const dies = Math.floor((Date.now() - new Date(m[1]).getTime()) / 86400000);
    if (dies > DIES_OBSOLET) {
      avisos.push(`Last-review de fa ${dies} dies (> ${DIES_OBSOLET}) -revisió obsoleta`);
    }
  }
  return avisos;
}

let fallat = false;

// Les dos còpies alhora és pitjor que cap: l'agent en llig una, la persona n'edita l'altra, i cap
// de les dos sap que divergixen. No bloqueja (una migració a mitges és un estat legítim d'un PR),
// però es diu sempre.
function revisa(f, siFalta) {
  const rel = disseny.ruta(dir, f.rel);
  const altra = disseny.rutaAltra(dir, f.rel);
  if (!fs.existsSync(path.join(dir, rel))) {
    siFalta(disseny.barres(rel));
    if (fs.existsSync(path.join(dir, altra))) {
      console.log(`  ⚠ però hi ha ${disseny.barres(altra)}, en l'altre disseny del kit -mou-lo a ${disseny.barres(rel)}`);
    }
    return null;
  }
  console.log(`✔ ${disseny.barres(rel)}`);
  if (fs.existsSync(path.join(dir, altra))) {
    console.log(`  ⚠ també hi ha ${disseny.barres(altra)}: dos còpies del mateix document -esborra la que sobra`);
  }
  const contingut = fs.readFileSync(path.join(dir, rel), 'utf8');
  if (f.plantilla && fs.existsSync(f.plantilla)) {
    const esperades = capcaleres(fs.readFileSync(f.plantilla, 'utf8'));
    const reals = capcaleres(contingut);
    const falten = esperades.filter(h => !reals.includes(h));
    if (falten.length) {
      console.log(`  ⚠ seccions de la plantilla no trobades (possible deriva): ${falten.join(', ')}`);
    }
  }
  for (const avis of avisosGovern(rel, contingut)) {
    console.log(`  ⚠ ${avis}`);
  }
  return rel;
}

console.log(`Disseny del kit: ${disseny.esDissenyNou(dir) ? disseny.DIR_KIT + '/' : "a l'arrel (anterior a kit-projecte 3.0.0)"}`);
console.log('\n== Nivell 1 (obligatori) ==');
for (const f of N1) {
  revisa(f, r => {
    console.log(`✖ falta ${r}`);
    fallat = true;
  });
}

// El punter ha d'anomenar la ruta on està de veres CONTEXT-IA.md, no només el nom: un
// `@CONTEXT-IA.md` en un projecte que el té a doc-projecte/ no carrega res, i res no ho diu.
const contextEsperat = disseny.barres(disseny.ruta(dir, 'CONTEXT-IA.md'));
for (const rel of PUNTERS) {
  const p = path.join(dir, rel);
  if (!fs.existsSync(p)) {
    console.log(`✖ falta ${rel} (punter cap a ${contextEsperat})`);
    fallat = true;
    continue;
  }
  const mencions = fs.readFileSync(p, 'utf8').match(/[\w./-]*CONTEXT-IA\.md(?![\w-]|\.\w)/g) || [];
  if (!mencions.length) {
    console.log(`✖ ${rel} existix però no remet a CONTEXT-IA.md -l'eina que el llig es queda sense context`);
    fallat = true;
    continue;
  }
  // Totes, no alguna: la prosa del punter pot anomenar bé la ruta mentre l'`@import` de baix, que
  // és el que carrega de veres, apunta a un lloc buit.
  const dolenta = mencions.find(m => m.replace(/^@?\.?\//, '').replace(/^@/, '') !== contextEsperat);
  if (dolenta) {
    console.log(`✖ ${rel} remet a ${dolenta}, però CONTEXT-IA.md és a ${contextEsperat} -l'eina que el llig es queda sense context`);
    fallat = true;
    continue;
  }
  console.log(`✔ ${rel} (punter)`);
}

for (const f of N1_COMPANIONS) {
  revisa(f, r => console.log(`- pendent: ${r} (companion de N1, avís)`));
}

console.log('\n== Nivell 2 (avís si falta) ==');
for (const f of N2) revisa(f, r => console.log(`- pendent: ${r}`));

console.log('\n== Nivell 3 (avís si falta) ==');
for (const f of N3) revisa(f, r => console.log(`- pendent: ${r}`));

if (fallat) {
  console.log('\nFalten fitxers de Nivell 1 -obligatoris per a "tot projecte UA viu"' +
    ' (kit-si-ua/kit-projecte/documentacio-projecte.md). Genera els que falten amb' +
    ' kit-projecte/genera-kit.js.');
  process.exit(1);
}
console.log('\nKit de documentació de Nivell 1 complet.');
