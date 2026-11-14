#!/usr/bin/env node
/**
 * El que la Cartera de Projectes rep d'un repositori: els RF del `prd.md` i la taula «Entregues»
 * del `pla.md` de cada faena de `doc-projecte/producte/`, en un JSON amb versió (decisió de cdp,
 * «Una sol·licitud per entrega, amb tipus», 2026-11-07: la Cartera no llig markdown; el llig la CI
 * amb el mateix lector que la resta del kit, `producte.js`).
 *
 * No és un check: escriu el JSON i acaba en 0. Que la taula estiga ben formada ho comprova
 * `comprova-tracabilitat.js`, que va abans al mateix job. Enviar-lo a l'API de la Cartera és un pas
 * del job de CI del projecte, quan l'API existisca: este script no fa cap crida de xarxa ni llig
 * cap credencial.
 *
 * Contracte (`versio: 2`):
 *   { versio, commit, data,
 *     prds: [ { prd, rfs: [ { id, descripcio, prioritat, retirat } ] } ],
 *     faenes: [ { faena, prd, entregues: [ { entrega, tipus, rfs, motiu, mida, spec } ] } ] }
 * Cada PRD va una vegada a `prds`, i cada faena diu quin fa servir (`prd`): el seu o el del
 * projecte (`projecte/prd.md`), que el compartixen totes les faenes que no en porten. La carpeta
 * `projecte/` no és una faena. Una faena sense taula «Entregues» porta `entregues: null`; sense
 * cap PRD, `prd: null`. Mai cap nom de persona ni cap hora: no n'hi ha a cap de les dos fonts.
 * La versió 1 portava els RF dins de cada faena; amb un PRD compartit, es repetirien a totes.
 *
 * Ús:  node kit-si-ua/ci-plantilla/exporta-entregues.js [--dir doc-projecte/producte] [--eixida fitxer.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
let disseny = null;
try {
  disseny = require('./disseny-kit.js');
} catch (e) {
  disseny = null;
}
function producteDelKit() {
  if (disseny) return disseny.barres(disseny.ruta('.', 'producte'));
  return fs.existsSync('doc-projecte') ? 'doc-projecte/producte' : 'docs/producte';
}
const dirArrel = arg('dir', null) || producteDelKit();
const eixida = arg('eixida', null);

const { barres, llegixPrd, llegixEntregues, prdDe, DIR_PROJECTE } = require('./producte.js');

const gitOpcional = args => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

// La descripció és el text del requisit entre l'identificador i «— Prioritat», que pot ocupar
// diverses línies: les que seguixen, sagnades, fins al primer subpunt.
function descripcions(fitxer) {
  const res = new Map();
  const linies = fs.readFileSync(fitxer, 'utf8').split('\n');
  for (let i = 0; i < linies.length; i++) {
    const m = /^- \*\*(RF-\d+)\*\* — (.*)$/.exec(linies[i]);
    if (!m || res.has(m[1])) continue;
    let text = m[2];
    for (let j = i + 1; j < linies.length && /^ {2}\S/.test(linies[j]) && !/^ {2}- /.test(linies[j]); j++) text += ' ' + linies[j].trim();
    res.set(m[1], text.split(/ — Prioritat:/)[0].replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());
  }
  return res;
}

const prds = [];
const faenes = [];
if (fs.existsSync(dirArrel)) {
  const vists = new Set();
  for (const d of fs.readdirSync(dirArrel, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
    const dir = path.join(dirArrel, d);
    const fPrd = d === DIR_PROJECTE ? path.join(dir, 'prd.md') : prdDe(dir);
    const fPla = path.join(dir, 'pla.md');
    if (fPrd && fs.existsSync(fPrd) && !vists.has(fPrd)) {
      vists.add(fPrd);
      const desc = descripcions(fPrd);
      const rfs = [...llegixPrd(fPrd).rfs].map(([id, r]) => ({ id, descripcio: desc.get(id) || '', prioritat: r.prioritat, retirat: r.retirat }));
      prds.push({ prd: barres(fPrd), rfs });
    }
    // La carpeta del projecte no és una faena; la d'una faena sense pla ni PRD propi, tampoc.
    if (d === DIR_PROJECTE || (!fs.existsSync(fPla) && !fs.existsSync(path.join(dir, 'prd.md')))) continue;
    const ent = fs.existsSync(fPla) ? llegixEntregues(fs.readFileSync(fPla, 'utf8')) : null;
    const entregues = ent && ent.map(({ linia, ...e }) => e);
    faenes.push({ faena: barres(dir), prd: fPrd ? barres(fPrd) : null, entregues });
  }
}

const json = JSON.stringify(
  { versio: 2, commit: gitOpcional(['rev-parse', 'HEAD']), data: gitOpcional(['log', '-1', '--format=%cI']), prds, faenes },
  null,
  2,
);
if (eixida) {
  fs.writeFileSync(eixida, json + '\n');
  console.log(`${faenes.length} faenes a ${eixida}.`);
} else {
  console.log(json);
}
