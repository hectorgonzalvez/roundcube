'use strict';
/**
 * Com es lligen els artefactes de producte d'una faena de `doc-projecte/producte/` (`docs/producte/`
 * en un kit anterior a 3.0.0). El PRD pot ser de la faena o del projecte (`projecte/prd.md`,
 * compartit per totes les faenes que no en porten: `ambitsDe`). El PRD
 * (`ua-requisits-producte`), les specs de pantalla (`ua-especificacio-pantalla`) i el `pla.md`.
 *
 * Els fan servir `comprova-tracabilitat.js` (si el PRD i les specs es corresponen),
 * `compta-factors.js` (què hi ha per a estimar la càrrega) i `calibratge.js` (les hores del
 * Calibratge i del Registre d'hores de cada `pla.md`). Un sol lector perquè els dos primers
 * entenguen el mateix per «RF vigent» o «spec vigent»: si cadascun en tinguera el seu, el recompte
 * i el check podrien no coincidir sobre la mateixa faena.
 *
 * Només llig el que fixen les plantilles dels skills; el que una faena no porta (un PRD anterior
 * al camp «Dada i permís», per exemple) torna buit, mai deduït.
 */
const fs = require('fs');
const path = require('path');

const RF_RE = /RF-\d+/g;
const T_RE = /\bT-[A-Z]+\d*\b/g;
const uniq = a => [...new Set(a)];
const normal = s => s.replace(/\s+/g, ' ');
const barres = p => p.split(path.sep).join('/');

// Rang de línies [inici, fi) de la secció `## <prefix>…`; sense la secció, tot el fitxer. El PRD
// cita RF fora dels requisits (notes de les tasques, «Canvis»), i eixos no són definicions.
function rang(linies, prefix) {
  const i = linies.findIndex(l => l.startsWith(`## ${prefix}`));
  if (i < 0) return [0, linies.length];
  const fi = linies.findIndex((l, j) => j > i && /^## /.test(l));
  return [i + 1, fi < 0 ? linies.length : fi];
}

/** Els punts de primer nivell (`- …`) d'una subsecció `### <titol>`; `null` si no hi és. */
function punts(linies, titol) {
  const i = linies.findIndex(l => l.trim() === `### ${titol}`);
  if (i < 0) return null;
  const fi = linies.findIndex((l, j) => j > i && /^#{1,3} /.test(l));
  return linies.slice(i + 1, fi < 0 ? undefined : fi).filter(l => /^- \S/.test(l));
}

function llegixPrd(fitxer) {
  const linies = fs.readFileSync(fitxer, 'utf8').split('\n');
  const rfs = new Map();
  const duplicats = [];
  const [ri, rf] = rang(linies, 'Requisits funcionals');
  for (let i = ri; i < rf; i++) {
    const m = /^- \*\*(RF-\d+)\*\*/.exec(linies[i]);
    if (!m) continue;
    let j = i + 1;
    while (j < rf && !/^- \*\*RF-\d+\*\*/.test(linies[j]) && !/^#{1,6} /.test(linies[j])) j++;
    const bloc = normal(linies.slice(i, j).join('\n'));
    const prioritat = (/Prioritat:\s*\*\*([^*]+)\*\*/.exec(bloc) || [])[1] || '';
    // La plantilla la posa en línia («— Prova: …»); també val en subpunt o amb un incís
    // («Prova (proposta provisional, 2026-10-12): …»). Ha de reconéixer també la forma de la
    // plantilla del PRD, «_Prova_:» (el `\b` no val: `_` és caràcter de paraula).
    const prova = /(?<![\p{L}\d])_?Prova_?(\s*\([^)]*\))?_?:/u.test(bloc);
    const retirat = /^- \*\*RF-\d+\*\* — \*\*Retirat/.test(bloc);
    // «Dada i permís: [cap / de gestió / personal] · [toca rols…] → Tier: [T0-T3]».
    const dada = (/Dada i permís:\s*(personal|de gestió|cap)\b/i.exec(bloc) || [])[1]?.toLowerCase() || null;
    const tier = (/Tier:\s*(T[0-3])\b/.exec(bloc) || [])[1] || null;
    if (rfs.has(m[1])) duplicats.push({ rf: m[1], linia: i + 1 });
    else rfs.set(m[1], { linia: i + 1, prioritat, prova, retirat, dada, tier });
  }
  // Les línies que comencen definint un RF («- **RF-01 · Catàleg:**», «### RF-01») i que el
  // lector de dalt no reconeix: sense elles, un PRD en un altre format eixia amb «0 RF» i en verd.
  const noReconeguts = [];
  for (let i = ri; i < rf; i++) {
    if (/^- \*\*RF-\d+\*\*/.test(linies[i])) continue;
    const m = /^(?:[-*]\s+|#{2,6}\s+)\**\s*(RF-\d+)/.exec(linies[i]);
    if (m) noReconeguts.push({ rf: m[1], linia: i + 1 });
  }
  const tasques = new Map();
  const [ti, tf] = rang(linies, 'Tasques per rol');
  for (let i = ti; i < tf; i++) {
    const l = linies[i];
    const t = l.startsWith('|') && /\*\*(T-[A-Z]+\d*)\*\*/.exec(l);
    if (!t) continue;
    const cel·les = l.split('|').map(c => c.trim()).filter(Boolean);
    tasques.set(t[1], { linia: i + 1, rol: cel·les[0], rfs: uniq(cel·les[cel·les.length - 1].match(RF_RE) || []) });
  }
  const llistes = {
    dependencies: punts(linies, 'Dependències'),
    riscos: punts(linies, 'Riscos'),
    pendents: punts(linies, 'Decisions pendents'),
  };
  return { rfs, duplicats, noReconeguts, tasques, llistes };
}

function posteriors(text) {
  const res = new Set();
  for (const l of text.split('\n')) {
    const m = /^\s*- \*\*(?:Faena (\d+)|Posterior\*\*)/.exec(l);
    if (m && m[1] !== '1') for (const rf of l.match(RF_RE) || []) res.add(rf);
  }
  return res;
}

function seccio(linies, titol) {
  const i = linies.findIndex(l => l.trim() === `## ${titol}`);
  if (i < 0) return { inici: -1, linies: [] };
  const fi = linies.findIndex((l, j) => j > i && /^## /.test(l));
  return { inici: i + 1, linies: linies.slice(i + 1, fi < 0 ? undefined : fi) };
}

function llegixSpec(text) {
  const linies = text.split('\n');
  const capcalera = linies.slice(0, 20).join('\n');
  const anterior = /Spec anterior\**:?\**\s*`?([^`\s]+\.md)/.exec(capcalera);
  const i = linies.findIndex(l => l.includes('**RF que cobrix**'));
  let cobrix = '';
  let exclou = '';
  if (i > -1) {
    let j = i;
    while (j < linies.length && linies[j].trim() !== '') j++;
    // El que ve darrere de «No cobrix» són els RF que l'spec deixa fora a consciència.
    [cobrix, exclou = ''] = linies.slice(i, j).join(' ').split(/\*\*No\*\*\s+cobrix|\bNo cobrix\b/);
  }
  const criteris = [];
  const sc = seccio(linies, "Criteris d'acceptació");
  let actual = null;
  sc.linies.forEach((l, k) => {
    if (/^[-*] /.test(l)) {
      actual = { linia: sc.inici + k + 1, text: l, fet: /^[-*] \[[xX]\]/.test(l) };
      criteris.push(actual);
    } else if (actual && /^\s+\S/.test(l)) actual.text += ' ' + l.trim();
    else actual = null;
  });
  return {
    superada: /\*\*Superada/.test(capcalera),
    anterior: anterior ? path.basename(anterior[1]) : null,
    dePantallA: i > -1,
    // Diu que cobrix RF però no amb «**RF que cobrix**»: no compta com a spec de pantalla, i ho ha de dir.
    cobrixNoReconegut: i < 0 && /RF que cobrix/i.test(text),
    cobrix: uniq(cobrix.match(RF_RE) || []),
    exclou: uniq(exclou.match(RF_RE) || []),
    tasques: uniq(seccio(linies, 'Tasques i informació').linies.join('\n').match(T_RE) || []),
    criteris,
    liniaRf: i + 1,
  };
}

// `ua-especificacio-pantalla` no edita l'spec anterior: és la nova la que la nomena.
function vigents(totes) {
  const substituides = new Set([...totes.values()].map(s => s.anterior).filter(Boolean));
  return new Map([...totes].filter(([f, s]) => s.dePantallA && !s.superada && !substituides.has(path.basename(f))));
}

/** Totes les specs de `specs/` d'una faena, per ruta; les vigents, amb `vigents()`. */
function llegixSpecs(faena) {
  const dirSpecs = path.join(faena, 'specs');
  const totes = new Map();
  if (fs.existsSync(dirSpecs)) {
    for (const f of fs.readdirSync(dirSpecs).filter(f => f.endsWith('.md')).sort()) {
      totes.set(barres(path.join(dirSpecs, f)), llegixSpec(fs.readFileSync(path.join(dirSpecs, f), 'utf8')));
    }
  }
  return totes;
}

// La carpeta del nivell de projecte (`doc-projecte/producte/projecte/`): el `problema.md` i el
// `prd.md` que abasten totes les faenes, i les propostes que no són de cap faena. No és una faena.
const DIR_PROJECTE = 'projecte';

/**
 * Els àmbits de PRD de `dirArrel`: cada `prd.md` amb les carpetes de faena que el fan servir.
 *   - Una carpeta de faena amb `prd.md` propi és el seu àmbit (el disseny d'abans de 3.9.0, o
 *     una àrea prou separada per a portar PRD propi).
 *   - `projecte/prd.md` és l'àmbit de les carpetes de faena sense PRD propi que tenen `pla.md` o
 *     `specs/`. Sense cap faena encara (només la definició del projecte), l'àmbit va buit, i el
 *     PRD es comprova igualment.
 * Torna `[{ prd, faenes }]`, amb `prd` la ruta del fitxer i `faenes` les rutes de les carpetes.
 */
function ambitsDe(dirArrel) {
  const dirs = fs
    .readdirSync(dirArrel, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== DIR_PROJECTE)
    .map(d => path.join(dirArrel, d.name))
    .sort();
  const te = (dir, f) => fs.existsSync(path.join(dir, f));
  const ambits = dirs.filter(d => te(d, 'prd.md')).map(d => ({ prd: path.join(d, 'prd.md'), faenes: [d] }));
  const prdProjecte = path.join(dirArrel, DIR_PROJECTE, 'prd.md');
  if (fs.existsSync(prdProjecte)) {
    ambits.unshift({ prd: prdProjecte, faenes: dirs.filter(d => !te(d, 'prd.md') && (te(d, 'pla.md') || te(d, 'specs'))) });
  }
  return ambits;
}

/** El `prd.md` que fa servir una carpeta de faena: el propi o, si no en té, el del projecte. */
function prdDe(faena) {
  const propi = path.join(faena, 'prd.md');
  if (fs.existsSync(propi)) return propi;
  const delProjecte = path.join(path.dirname(faena), DIR_PROJECTE, 'prd.md');
  return fs.existsSync(delProjecte) ? delProjecte : null;
}

/** Les carpetes de faena de `dirArrel` que tenen `pla.md`, amb PRD o sense (la ruta M entra pel pla). */
function faenesAmbPla(dirArrel) {
  return fs
    .readdirSync(dirArrel, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(dirArrel, d.name, 'pla.md')))
    .map(d => path.join(dirArrel, d.name));
}

// Les files d'una taula Markdown davall de `### <titol>`, com a objectes per nom de columna (en
// minúscules). Per nom i no per posició: un pla anterior a una columna nova continua llegint-se.
// La secció pot portar més d'una taula (a `cdp`, una de commits damunt de la d'hores): val la
// primera que té totes les columnes `requerides`. Les files de la plantilla («[entrega]») no són dades.
function taulaDe(linies, titol, requerides) {
  const i = linies.findIndex(l => l.trim() === `### ${titol}`);
  if (i < 0) return null;
  const cel·les = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  for (let j = i + 1; j < linies.length && !/^#{1,4} /.test(linies[j]); j++) {
    if (!linies[j].trim().startsWith('|')) continue;
    const capcalera = cel·les(linies[j]).map(t => t.toLowerCase());
    const files = [];
    for (j++; j < linies.length && linies[j].trim().startsWith('|'); j++) {
      const c = cel·les(linies[j]);
      if (!c.every(t => /^:?-+:?$/.test(t)) && !/^\[/.test(c[0] || '')) {
        files.push({ linia: j + 1, ...Object.fromEntries(capcalera.map((k, n) => [k, c[n] || ''])) });
      }
    }
    if (requerides.every(r => capcalera.includes(r))) return files;
  }
  return [];
}

// «3,5», «3.5», «3 h» -> 3.5; «no anotades» -> 'no anotades'; buit o «—» -> null.
function hores(text) {
  const t = (text || '').trim().toLowerCase();
  if (/^no anotad/.test(t)) return 'no anotades';
  const m = /^(\d+(?:[.,]\d+)?)\s*h?$/.exec(t);
  return m ? Number(m[1].replace(',', '.')) : null;
}

/**
 * El «Calibratge» i el «Registre d'hores» de la secció «Estimació» d'un `pla.md`
 * (`ua-planificador/references/estimacio.md`). `null` el que el pla no porta. Mai cap nom: si una
 * fila en portara un en una columna desconeguda, no es llig.
 */
function llegixHores(text) {
  const linies = text.split('\n');
  const cal = taulaDe(linies, 'Calibratge', ['fase', 'hores reals']);
  const reg = taulaDe(linies, "Registre d'hores", ['data', 'hores']);
  return {
    calibratge:
      cal &&
      cal.map(f => ({
        linia: f.linia,
        entrega: f.entrega,
        fase: f.fase,
        mida: f['mida estimada'] || '',
        rol: f.rol || '',
        hores: hores(f['hores reals']),
        desviacio: f['desviació i per què'] || '',
      })),
    registre:
      reg &&
      reg.map(f => ({
        linia: f.linia,
        data: f.data,
        entrega: f.entrega,
        fase: f.fase,
        rol: f.rol || '',
        hores: hores(f.hores),
        moment: f.moment || '',
      })),
  };
}

// Els tipus de sol·licitud que pot portar una entrega del `pla.md`
// (`ua-planificador/references/estimacio.md` § «Entregues»). Les bosses («Ajustos», «Transversal»)
// i «Manteniment» no són entregues: no van a la taula.
const TIPUS_ENTREGA = ['Disseny', 'Construcció', 'Validació'];

/**
 * La taula «Entregues» d'un `pla.md`: una fila per entrega, amb `E-NN`, tipus, `RF-XX` o motiu
 * tècnic, mida i spec. `null` si el pla no la porta (un pla anterior a la taula, o d'una sola
 * entrega). El que no casa amb la plantilla torna tal com és, perquè el check ho puga dir.
 */
/** Les files de la secció «### Entregues» que porten un `E-NN`, es llegisca o no la capçalera. */
function filesAmbEntrega(text) {
  const linies = text.split('\n');
  const i = linies.findIndex(l => l.trim() === '### Entregues');
  if (i < 0) return 0;
  let n = 0;
  for (let j = i + 1; j < linies.length && !/^#{1,4} /.test(linies[j]); j++) {
    if (/^\s*\|\s*\**E-\d+/.test(linies[j])) n++;
  }
  return n;
}

function llegixEntregues(text) {
  const files = taulaDe(text.split('\n'), 'Entregues', ['entrega', 'tipus', 'rf-xx o motiu']);
  if (!files) return null;
  return files.map(f => {
    const que = f['rf-xx o motiu'] || '';
    const motiu = (/^motiu:\s*(.+)$/i.exec(que) || [])[1] || null;
    return {
      linia: f.linia,
      entrega: f.entrega,
      tipus: f.tipus,
      rfs: motiu ? [] : uniq(que.match(RF_RE) || []),
      motiu,
      mida: f.mida || '',
      spec: f.spec || '',
    };
  });
}

module.exports = {
  filesAmbEntrega,
  RF_RE,
  T_RE,
  uniq,
  barres,
  llegixPrd,
  posteriors,
  llegixSpec,
  llegixSpecs,
  vigents,
  DIR_PROJECTE,
  ambitsDe,
  prdDe,
  faenesAmbPla,
  llegixHores,
  TIPUS_ENTREGA,
  llegixEntregues,
};
