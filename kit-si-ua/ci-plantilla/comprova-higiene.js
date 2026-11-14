#!/usr/bin/env node
/**
 * Avisa de tres coses que cap altre check mira, perquè no depenen del llenguatge (1.54.0):
 *
 *   1. **Un fitxer gran que entra nou** (per defecte, més de 500 KB): un PDF, un bolcat d'Oracle, un
 *      binari. Només els que naixen al diff: un document que ja hi era i creix no és un accident, i
 *      avisar-ne a cada edició és el soroll que fa que no es llija l'avís. Git
 *      el guarda per sempre, i esborrar-lo en un commit posterior no el trau de l'historial ni de
 *      cap clon. És un canvi que no es desfà revertint (`ESTANDARDS.md` §9.1). Com que una branca
 *      entra a `PREPRODUCCION` amb squash, la MR és l'últim punt on encara no ha arribat a
 *      l'historial compartit.
 *   2. **Un marcador de conflicte** (`<<<<<<<`, `|||||||`, `>>>>>>>` a principi de línia) en
 *      qualsevol fitxer de text. En codi ho para la compilació; en un `.md` del kit, en un
 *      `pla.md` o en una plantilla no ho para res, i arriba sencer a qui el llig. `=======` sol no
 *      compta: en Markdown subratlla un títol.
 *   3. **Un JSON de configuració que no es pot llegir**: `.claude/settings*.json`, `.mcp.json`,
 *      `docmap.json` i `skillmap.json`. Claude Code se salta sencer un fitxer de configuració que
 *      no és JSON vàlid: amb ell cauen els hooks i els `permissions` del projecte. En una sessió
 *      interactiva ho diu i deixa continuar sense el fitxer; en una execució `-p` no ho diu.
 *
 * Naix en avís (README § «Naixen en avís»): acaba sempre en 0. `naix: 2026-10-27`.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-higiene.js --base origin/main --head HEAD [--maxkb 500]
 *      node kit-si-ua/ci-plantilla/comprova-higiene.js --dir .   (sense git: tot l'arbre)
 */
'use strict';
const fs = require('fs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');
const dir = arg('dir', null);
const maxkb = Number(arg('maxkb', '500'));

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script.");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

// `--diff-filter=d`: un fitxer esborrat no existix al `head` i no hi ha res a mirar.
const candidats = fitxers
  .llista({ dir, cmd: `git diff --name-only --diff-filter=d ${base}...${head}`, nom: 'comprova-higiene.js' })
  .filter((f) => fs.existsSync(f));

// Amb `--dir` no hi ha diff: tot l'arbre compta com a nou, que és el que es vol en una primera passada.
const nous = new Set(
  dir ? candidats : fitxers.llista({ cmd: `git diff --name-only --diff-filter=A ${base}...${head}`, nom: 'comprova-higiene.js' })
);

const MARCADOR = /^(<{7}|\|{7}|>{7})( |$)/;
const CONFIGURACIO = /(^|\/)\.claude\/settings[^/]*\.json$|(^|\/)\.mcp\.json$|(^|\/)(docmap|skillmap)\.json$/;

let avisos = 0;
function avisa(text) {
  avisos++;
  console.log('AVÍS: ' + text);
}

for (const file of candidats) {
  const kb = Math.round(fs.statSync(file).size / 1024);
  if (nous.has(file) && kb > maxkb) avisa(`${file} — ${kb} KB${dir ? '' : ', fitxer nou'} (més de ${maxkb} KB)`);

  const buf = fs.readFileSync(file);
  if (buf.includes(0)) continue; // binari: ni marcadors ni JSON
  const text = buf.toString('utf8');

  text.split(/\r?\n/).forEach((linia, i) => {
    if (MARCADOR.test(linia)) avisa(`${file}:${i + 1} — marcador de conflicte \`${linia.slice(0, 7)}\``);
  });

  if (CONFIGURACIO.test(file)) {
    try {
      JSON.parse(text.replace(/^﻿/, ''));
    } catch (e) {
      avisa(`${file} — no és JSON vàlid (${e.message}): Claude Code se'l salta sencer`);
    }
  }
}

if (!avisos) {
  console.log(`Cap fitxer gran, marcador de conflicte ni JSON de configuració trencat (${candidats.length} revisat(s)).`);
} else {
  console.log(
    `\n${avisos} avís(os). Un fitxer gran es trau de la branca abans de fusionar (git rm --cached i ` +
      '.gitignore): després ja és a l\'historial de tots. Un marcador o un JSON trencat és una resolució ' +
      'de conflicte a mitges. Si un fitxer gran és volgut, digues-ho a la MR: este check no bloqueja.'
  );
}
process.exit(0);
