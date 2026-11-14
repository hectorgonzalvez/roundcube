#!/usr/bin/env node
'use strict';
/**
 * Avisa si la descripció d'una PR/MR arriba amb seccions de la plantilla sense omplir.
 * Sempre avís (exit 0): una regla nova de ci-plantilla naix en mode avís.
 *
 * Llig la descripció amb `context-pr.js` (variable de GitLab o API d'Azure DevOps / TFS), o d'un
 * fitxer amb `--fitxer <ruta>`. Si no la pot llegir, ho diu. Una secció és un `## Títol`; està buida si, llevat dels
 * comentaris HTML, no té text, o si només té caselles sense marcar. Una secció que acaba en
 * `(opcional)` no avisa mai: es pot deixar buida o esborrar (1.47.0).
 *
 * Secció «Requisitos (RF)» (1.57.0): si el projecte té un PRD amb RF (`doc-projecte/producte/<faena>/prd.md`),
 * la descripció ha de portar-la, amb els verbs fixos `Tanca`, `Avança`, `Reobri` i `Cap: <motiu>`, i
 * els RF que cita han d'existir al PRD i no estar retirats. Sempre avís. **No comprova** que un `Tanca`
 * no tanque un RF que ja ho està: això demana l'historial de `main` (els trailers `Tanca:`), no la
 * descripció, i queda per a una passada pròpia.
 *
 * Camins: passa per la pipeline de PR de GitLab o d'Azure DevOps. No passa per una PR sense
 * pipeline; ho cobrix la plantilla mateixa i qui fusiona.
 */
const fs = require('fs');
const path = require('path');
const { llegixPrd, RF_RE } = require('./producte');
const { descripcio } = require('./context-pr');

function seccions(cos) {
  const res = [];
  let actual = null;
  for (const linia of cos.split(/\r?\n/)) {
    const m = linia.match(/^##\s+(.+?)\s*$/);
    if (m) {
      actual = { titol: m[1], linies: [] };
      res.push(actual);
    } else if (actual) {
      actual.linies.push(linia);
    }
  }
  return res;
}

const OPCIONAL = /\(opcional\)$/i;

function buida(seccio) {
  const text = seccio.linies.join('\n').replace(/<!--[\s\S]*?-->/g, '');
  const linies = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (linies.length === 0) return true;
  const caselles = linies.filter((l) => /^- \[[ xX]\]/.test(l));
  return caselles.length === linies.length && caselles.every((l) => /^- \[ \]/.test(l));
}

const VERBS = ['Tanca', 'Avança', 'Reobri', 'Cap'];
const SECCIO_RF = /^Requisit/i;

/** Els RF definits als PRD de `doc-projecte/producte/` (o `docs/producte/`), amb si estan retirats. */
function rfsDelProjecte(arrel = process.cwd()) {
  const res = new Map();
  for (const dir of ['doc-projecte/producte', 'docs/producte']) {
    const base = path.join(arrel, dir);
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base, { withFileTypes: true })) {
      const prd = path.join(base, d.name, 'prd.md');
      if (!d.isDirectory() || !fs.existsSync(prd)) continue;
      for (const [rf, info] of llegixPrd(prd).rfs) {
        if (!res.has(rf) || res.get(rf).retirat) res.set(rf, { retirat: info.retirat });
      }
    }
  }
  return res;
}

/** Els avisos de la secció «Requisitos (RF)»; `rfs` buit vol dir que el projecte no té PRD amb RF. */
function avisosRequisits(totes, rfs) {
  const sec = totes.find((s) => SECCIO_RF.test(s.titol));
  if (!sec) return rfs.size ? ['falta la secció «Requisitos (RF)» (el projecte té RF al PRD)'] : [];
  const avisos = [];
  let amb = false;
  const text = sec.linies.join('\n').replace(/<!--[\s\S]*?-->/g, '');
  for (const linia of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = /^-\s*([^:]+?)\s*:\s*(.*)$/.exec(linia);
    if (!m) continue;
    const verb = VERBS.find((v) => v.toLowerCase() === m[1].toLowerCase());
    if (!verb) {
      avisos.push('verb desconegut «' + m[1] + '» (els fixos són ' + VERBS.join(', ') + ')');
      continue;
    }
    const resta = m[2].trim();
    if (verb === 'Cap') {
      if (resta && !/^(—|-|<.*>)$/.test(resta)) amb = true;
      else avisos.push('«Cap» cal dir per què la PR no toca cap RF');
      continue;
    }
    for (const rf of resta.match(RF_RE) || []) {
      amb = true;
      if (!rfs.size) continue;
      if (!rfs.has(rf)) avisos.push(rf + ' no existix al PRD');
      else if (rfs.get(rf).retirat) avisos.push(rf + ' està retirat al PRD');
    }
  }
  if (!amb && !avisos.length && rfs.size) avisos.push('cal citar algun RF o dir «Cap: <motiu>»');
  return avisos;
}

async function main() {
  const i = process.argv.indexOf('--fitxer');
  let cos;
  try {
    cos = i > -1 ? fs.readFileSync(process.argv[i + 1], 'utf8') : await descripcio();
  } catch (e) {
    console.warn(`AVÍS: no s'ha pogut llegir la descripció de la PR, i no s'ha comprovat: ${e.message}.`);
    return;
  }
  if (cos === undefined) {
    console.log('comprova-descripcio-mr: no és una pipeline de PR. No es comprova res.');
    return;
  }
  const totes = seccions(cos);
  if (totes.length === 0) {
    console.warn('AVÍS: la descripció de la PR no té cap secció de la plantilla del projecte.');
    return;
  }
  const buides = totes.filter((s) => !OPCIONAL.test(s.titol) && buida(s)).map((s) => s.titol);
  if (buides.length) {
    console.warn('AVÍS: seccions de la PR sense omplir: ' + buides.join(', '));
  } else {
    console.log('comprova-descripcio-mr: totes les seccions tenen contingut.');
  }
  for (const a of avisosRequisits(totes, rfsDelProjecte())) console.warn('AVÍS: requisits (RF): ' + a);
}

if (require.main === module) main();
module.exports = { seccions, buida, avisosRequisits };
