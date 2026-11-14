#!/usr/bin/env node
/**
 * El Calibratge de tot el projecte: ajunta el «Calibratge» i el «Registre d'hores» del `pla.md` de
 * cada faena de `doc-projecte/producte/` (`ua-planificador/references/estimacio.md`). No és un
 * check: informa i acaba sempre en 0.
 *
 * Per què un script: cada `pla.md` calibra les seues entregues, però l'interval d'una mida
 * («Mitjana, fase 2: entre 6 i 11 h») només ix de juntar entregues de diverses faenes, i a mà
 * ningú ho fa. Sense eixa vista, la pròxima estimació torna a partir de la intuïció.
 *
 * Tres taules:
 *   - hores reals per fase i mida (del Calibratge): entregues, interval i mediana. Amb menys de
 *     tres entregues d'una mida, l'interval es marca «no calibrat» (la mateixa regla d'estimacio.md);
 *   - el registre per fase i rol: anotacions, hores i línies «no anotades» (els forats a la vista);
 *   - el que no quadra: una fila del Calibratge les «Hores reals» de la qual no són la suma del seu
 *     registre, o un registre sense fila. Les files «anterior al registre» no es comproven.
 *
 * **Mai per persona.** El registre no porta noms ni hores del dia, i este script no llig cap
 * columna que no conega: agrupa per fase, mida i rol, que són del treball, no de qui el fa
 * (`ESTANDARDS.md` §10.2). Les hores les ha posat una persona; ací només se sumen. Els minuts de
 * l'agent del Calibratge no s'hi barregen.
 *
 * Sense `--dir`, la carpeta la resol disseny-kit.js, com a `compta-factors.js`.
 *
 * Ús:  node kit-si-ua/ci-plantilla/calibratge.js [--dir doc-projecte/producte] [--json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { barres, faenesAmbPla, llegixHores } = require('./producte.js');

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
const json = process.argv.includes('--json');

if (!fs.existsSync(dirArrel)) {
  console.log(`No hi ha ${dirArrel}: res a calibrar.`);
  process.exit(0);
}

// «Fase 2», «2. Programació» i «2» són la mateixa fase; el que no casa es queda com està.
function fase(t) {
  const m = /^(?:fase\s*)?(1|2|3a|3b|4)\b/i.exec((t || '').trim());
  return m ? m[1].toLowerCase() : (t || '').trim() || '—';
}
// Només les tres mides de l'escala; la resta («— (1 proposta, 1 volta)», «Feta») va a «—».
const mida = t => {
  const m = /^(baixa|mitjana|alta)\b/i.exec((t || '').trim());
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : '—';
};
const clau = (...p) => p.map(x => String(x).trim().toLowerCase()).join('\u0000');
const arrod = n => Math.round(n * 100) / 100;
function mediana(v) {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const faenes = faenesAmbPla(dirArrel).map(f => ({
  faena: barres(f),
  ...llegixHores(fs.readFileSync(path.join(f, 'pla.md'), 'utf8')),
}));
const ambCalibratge = faenes.filter(f => f.calibratge);
if (!ambCalibratge.length && !faenes.some(f => f.registre)) {
  console.log(`Cap pla.md de ${dirArrel} porta Calibratge ni Registre d'hores: res a calibrar.`);
  process.exit(0);
}

// 1. Hores reals per fase i mida.
const perMida = new Map();
for (const f of ambCalibratge) {
  for (const c of f.calibratge) {
    const k = clau(fase(c.fase), mida(c.mida));
    if (!perMida.has(k)) perMida.set(k, { fase: fase(c.fase), mida: mida(c.mida), hores: [], senseHores: 0 });
    const g = perMida.get(k);
    if (typeof c.hores === 'number') g.hores.push(c.hores);
    else g.senseHores++;
  }
}
const mides = [...perMida.values()]
  .sort((a, b) => a.fase.localeCompare(b.fase) || a.mida.localeCompare(b.mida))
  .map(g => ({
    fase: g.fase,
    mida: g.mida,
    entregues: g.hores.length,
    minim: g.hores.length ? Math.min(...g.hores) : null,
    maxim: g.hores.length ? Math.max(...g.hores) : null,
    mediana: g.hores.length ? arrod(mediana(g.hores)) : null,
    calibrada: g.hores.length >= 3,
    senseHores: g.senseHores,
  }));

// 2. El registre per fase i rol.
const perRol = new Map();
for (const f of faenes) {
  for (const r of f.registre || []) {
    const k = clau(fase(r.fase), r.rol);
    if (!perRol.has(k)) perRol.set(k, { fase: fase(r.fase), rol: r.rol || '—', anotacions: 0, hores: 0, noAnotades: 0 });
    const g = perRol.get(k);
    g.anotacions++;
    if (typeof r.hores === 'number') g.hores = arrod(g.hores + r.hores);
    else if (r.hores === 'no anotades') g.noAnotades++;
  }
}
const rols = [...perRol.values()].sort((a, b) => a.fase.localeCompare(b.fase) || a.rol.localeCompare(b.rol));

// 3. El Calibratge i el registre que no quadren, faena a faena.
const desquadres = [];
for (const f of faenes) {
  if (!f.registre || !f.registre.length) continue;
  const suma = new Map();
  for (const r of f.registre) {
    if (typeof r.hores !== 'number') continue;
    const k = clau(r.entrega, fase(r.fase), r.rol);
    const g = suma.get(k) || { entrega: r.entrega, fase: fase(r.fase), rol: r.rol, hores: 0 };
    g.hores = arrod(g.hores + r.hores);
    suma.set(k, g);
  }
  const vistes = new Set();
  for (const c of f.calibratge || []) {
    const k = clau(c.entrega, fase(c.fase), c.rol);
    vistes.add(k);
    if (/anterior al registre/i.test(c.desviacio)) continue;
    const s = suma.get(k);
    const reg = s ? s.hores : 0;
    if (typeof c.hores === 'number' && Math.abs(c.hores - reg) > 0.01) {
      desquadres.push({ faena: f.faena, entrega: c.entrega, fase: fase(c.fase), rol: c.rol, calibratge: c.hores, registre: reg });
    }
  }
  for (const [k, s] of suma) {
    if (!vistes.has(k)) desquadres.push({ faena: f.faena, entrega: s.entrega, fase: s.fase, rol: s.rol, calibratge: null, registre: s.hores });
  }
}

const resultat = {
  dir: barres(dirArrel),
  faenes: faenes.length,
  ambCalibratge: ambCalibratge.length,
  ambRegistre: faenes.filter(f => f.registre && f.registre.length).length,
  mides,
  rols,
  desquadres,
};

if (json) {
  console.log(JSON.stringify(resultat, null, 2));
  process.exit(0);
}

const h = n => (n === null ? '—' : String(n).replace('.', ','));
console.log(`## Calibratge del projecte: ${resultat.dir}

${resultat.faenes} faenes amb \`pla.md\`: ${resultat.ambCalibratge} amb Calibratge i ${resultat.ambRegistre} amb Registre d'hores. Les hores les ha posat una persona; ací només se sumen, mai per persona.

### Hores reals per fase i mida

| Fase | Mida | Entregues amb hores | Interval (h) | Mediana (h) | Sense hores |
| ---- | ---- | ------------------: | ------------- | ----------: | ----------: |`);
for (const m of mides) {
  const interval = m.entregues ? `${h(m.minim)}–${h(m.maxim)}${m.calibrada ? '' : ' (no calibrat)'}` : '—';
  console.log(`| ${m.fase} | ${m.mida} | ${m.entregues} | ${interval} | ${h(m.mediana)} | ${m.senseHores} |`);
}
console.log(`
Un interval amb menys de tres entregues és «no calibrat»: es diu, però no servix encara de referència.

### Registre d'hores per fase i rol

| Fase | Rol | Anotacions | Hores | «No anotades» |
| ---- | --- | ---------: | ----: | ------------: |`);
for (const r of rols) console.log(`| ${r.fase} | ${r.rol} | ${r.anotacions} | ${h(r.hores)} | ${r.noAnotades} |`);
if (!rols.length) console.log('| — | — | 0 | — | 0 |');
console.log('\n### El que no quadra entre el Calibratge i el registre\n');
if (!desquadres.length) {
  console.log("Res: cada fila del Calibratge és la suma del seu registre (o porta «anterior al registre»).");
} else {
  console.log('| Faena | Entrega | Fase | Rol | Hores reals | Suma del registre |');
  console.log('| ----- | ------- | ---- | --- | ----------: | ----------------: |');
  for (const d of desquadres) {
    console.log(`| \`${path.basename(d.faena)}\` | ${d.entrega} | ${d.fase} | ${d.rol} | ${d.calibratge === null ? 'sense fila' : h(d.calibratge)} | ${h(d.registre)} |`);
  }
}
