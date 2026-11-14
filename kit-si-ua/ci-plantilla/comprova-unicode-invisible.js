#!/usr/bin/env node
/**
 * Avisa dels caràcters Unicode invisibles en els fitxers d'instruccions de l'agent (1.51.0):
 * amplada zero, controls bidi, unió de paraules, un BOM enmig del text i _tag characters_.
 *
 * L'editor i el diff no els mostren, i el model els llig com a text: una instrucció escrita amb
 * ells passa una revisió que llig el fitxer sencer. Els fitxers que mira són els que l'agent
 * obeïx, no tot el codi: `CLAUDE.md`, `AGENTS.md`, `CONTEXT-IA.md`, `SKILL.md`, `.mcp.json` i tot
 * el que hi ha davall de `.claude/` (hooks, ordres, agents, skills locals, `settings*.json`).
 * Els patrons viuen a `patrons-unicode.js`, que comparteix amb `valida-skill.js`.
 *
 * Naix en avís (README § «Naixen en avís»): acaba sempre en 0. Un fitxer de text pot portar un
 * U+200B legítim -una ruptura de línia en una URL llarga- i el patró no ho sap. `naix: 2026-10-22`.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --base origin/main --head HEAD
 *      node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --dir .   (sense git: tot l'arbre)
 *      node kit-si-ua/ci-plantilla/comprova-unicode-invisible.js --fitxer CLAUDE.md [--fitxer …]
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
const nomenats = process.argv
  .map((a, i, tots) => (a === '--fitxer' ? tots[i + 1] : null))
  .filter(Boolean)
  .map((f) => f.split('\\').join('/').replace(/^\.\//, ''));

let fitxers, troba;
try {
  fitxers = require('./fitxers.js');
  ({ troba } = require('./patrons-unicode.js'));
} catch (e) {
  console.error("Falten fitxers.js o patrons-unicode.js al costat d'este script (patrons-unicode.js arriba amb ci-plantilla 1.51.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

const INSTRUCCIONS = /(^|\/)(CLAUDE|AGENTS|CONTEXT-IA|SKILL)\.md$|(^|\/)\.mcp\.json$|(^|\/)\.claude\//;

const candidats = (
  nomenats.length
    ? nomenats
    : fitxers.llista({ dir, cmd: `git diff --name-only ${base}...${head}`, nom: 'comprova-unicode-invisible.js' })
).filter((f) => INSTRUCCIONS.test(f) && fs.existsSync(f));

let avisos = 0;
for (const file of candidats) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('\0')) continue; // binari: no és text que l'agent llija
  for (const t of troba(text)) {
    avisos++;
    console.log(`AVÍS: ${file}:${t.linia}:${t.columna} — ${t.punt}, ${t.nom}`);
  }
}

if (!avisos) {
  console.log(`Cap caràcter invisible en els fitxers d'instruccions (${candidats.length} revisat(s)).`);
} else {
  console.log(
    `\n${avisos} caràcter(s) invisible(s). L'editor no els mostra: obri el fitxer amb un visor que els ` +
      "faça visibles, o reescriu la línia. Si n'hi ha un de legítim, digues-ho a la MR: este check no bloqueja."
  );
}
process.exit(0);
