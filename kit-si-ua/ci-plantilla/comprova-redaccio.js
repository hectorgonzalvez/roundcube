#!/usr/bin/env node
/**
 * Versió CI de les regles de redacció que es poden comptar o llistar: terminologia canònica
 * d'ua-i18n-valencia i etiquetes, mode verbal, longitud i registre d'ua-ux-redaccio, sobre els
 * fitxers de traduccions en valencià (`ca.json`, `va.json`, `ca-ES.json`, `ca-valencia.json`).
 *
 * Les regles NO viuen ací: es llegixen de les taules dels skills cada vegada que s'executa
 * (`terminologia.md` § «Taula completa», `estructura-i-microcopy.md` § «Etiquetes de botó» i
 * § «Longitud orientativa», `veu-i-to.md`). Afegir un terme a evitar a la taula ja l'activa ací.
 *
 *   R1 terme a evitar      → columna «Evitar» de terminologia.md, en una etiqueta d'acció sencera
 *   R2 etiqueta buida      → columna «Evita» d'estructura-i-microcopy.md § Etiquetes de botó
 *   R3 botó en infinitiu   → veu-i-to.md: botons sempre en imperatiu 2a singular
 *   R4 longitud per tipus  → estructura-i-microcopy.md § Longitud orientativa
 *   R5 codi HTTP visible   → estructura-i-microcopy.md: mai codis HTTP a l'usuari
 *   R6 paraula genèrica    → veu-i-to.md: «Operació»/«Execució»/«Procediment»/«Recurs»
 *   R7 impersonal en futur → veu-i-to.md: «Es procedirà a…»
 *   R8 demostratiu «este»  → terminologia.md § Formes: la llista que seguix a «mai»
 *   R9 incoatiu en -ix     → terminologia.md § Formes: indicatiu en **-eix** («Accedix» → «Accedeix»)
 *   R10 tracte de vosté    → veu-i-to.md: mai «vosté» («Confirme», «Accedisca», «Segur que vol…»)
 *
 * Determinista (regex i recomptes), però **parcial**: no veu el to ni res que demane judici, de
 * vosté només caça les formes que es reconeixen soles (R10), i el tipus de cada cadena (botó, títol, ajuda) el dedueix del nom de la clau.
 * Per això tot és «avís» i ix sempre per 0: els pressupostos de longitud són orientatius pel propi
 * skill, i un terme pot ser canònic en un concepte i a evitar en un altre («Tanca»). Eixos casos
 * ambigus calla: amb la taula actual, 4 de 4 eren falsos positius al pilot.
 *
 * El catàleg es busca, per orde: `--cataleg <ruta>`, `UA_CATALEG`, i el destí del symlink
 * `~/.claude/skills` (mateix criteri que `hooks-plantilla/injecta-estat-sessio.sh`). Sense catàleg
 * no hi ha regles: ho diu per stderr i ix per 0.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-redaccio.js --base origin/main --head HEAD [--cataleg <clon>]
 *      node kit-si-ua/ci-plantilla/comprova-redaccio.js --dir .   (sense git: tot l'arbre)
 *      node kit-si-ua/ci-plantilla/comprova-redaccio.js --fitxer src/i18n/locales/ca.json [--fitxer …]
 *
 * `--fitxer` és la porta del hook `hooks-plantilla/comprova-edicio.js`.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');
const dir = arg('dir', null);

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

const LOCALE = /(^|\/)(ca|va|ca-ES|ca-valencia)\.json$/;
const EXEMPT = [/^vendor\//, /node_modules\//, /^marc-referencial\//, /^planificacio\//];

const nomenats = process.argv
  .map((a, i, tots) => (a === '--fitxer' ? tots[i + 1] : null))
  .filter(Boolean)
  .map((f) => f.split('\\').join('/').replace(/^\.\//, ''));

const changed = (
  nomenats.length
    ? nomenats
    : fitxers.llista({ dir, cmd: `git diff --name-only ${base}...${head}`, nom: 'comprova-redaccio.js' })
).filter((f) => LOCALE.test(f) && !EXEMPT.some((r) => r.test(f)) && fs.existsSync(f));

if (!changed.length) {
  console.log('Cap fitxer de traduccions en valencià entre els canviats.');
  process.exit(0);
}

// ── Catàleg: d'on es llegixen les regles ──
function trobaCataleg() {
  const candidats = [arg('cataleg', null), process.env.UA_CATALEG];
  try {
    candidats.push(fs.realpathSync(path.join(os.homedir(), '.claude', 'skills')));
  } catch (e) {
    /* sense symlink */
  }
  return candidats.find((c) => c && fs.existsSync(path.join(c, 'ua-i18n-valencia', 'references', 'terminologia.md')));
}
const cataleg = trobaCataleg();
if (!cataleg) {
  console.error(
    'comprova-redaccio: no trobe el catàleg de skills (ni --cataleg, ni UA_CATALEG, ni ~/.claude/skills); ' +
      'sense ell no hi ha regles de redacció a aplicar.'
  );
  process.exit(0);
}
const llig = (rel) => fs.readFileSync(path.join(cataleg, rel), 'utf8').replace(/\r\n/g, '\n');

// Files d'una taula markdown: la de la capçalera que conté `header`.
function files(md, header) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => l.startsWith('|') && l.includes(header));
  const out = [];
  if (i < 0) return out;
  for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) out.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  return out;
}
const cometes = (cel) => [...cel.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const norm = (s) => s.toLowerCase().replace(/[.…!?¡¿:]+$/g, '').replace(/\s+/g, ' ').trim();
const paraula = (w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');

// R1: una cel·la «Evitar» redactada en prosa no és una llista de termes, i no se'n trau res.
const terminologia = files(llig('ua-i18n-valencia/references/terminologia.md'), 'Terme canònic (VA)').map((c) => ({
  concepte: c[0],
  canon: cometes(c[1] || ''),
  evitar: (c[3] || '').startsWith('"') ? cometes(c[3]) : [],
}));
const canonics = new Set(terminologia.flatMap((t) => t.canon).map(norm));
const micro = llig('ua-ux-redaccio/references/estructura-i-microcopy.md');
const buides = files(micro, '| Evita').map((c) => ({ evita: c[0], usa: c[1] }));
const pressupost = Object.fromEntries(files(micro, 'Longitud aproximada').map((c) => [c[0], +((c[1] || '').match(/≤\s*(\d+)/) || [])[1]]));
const genericsFont = (llig('ua-ux-redaccio/references/veu-i-to.md').match(/evitar ("[^"]+"(?:\/"[^"]+")*)/) || [, ''])[1];
const generiques = genericsFont.match(/[^"/]+/g) || [];

// R8-R10: les formes. Cada regla s'activa només si el skill la conté, igual que les taules.
const termi = llig('ua-i18n-valencia/references/terminologia.md');
const liniaDem = termi.split(/\n(?=- )/).find((l) => l.startsWith('- **Demostratiu')) || '';
const demEvitar = [...(liniaDem.split(/\bmai\b/)[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const demCanon = (liniaDem.match(/«([^»]+)»/) || [, 'aquest'])[1];
const incoatiuEix = /indicatiu en \*\*-eix\*\*/i.test(termi);
const senseVoste = /mai "vost[éè]"/i.test(llig('ua-ux-redaccio/references/veu-i-to.md'));
// Paraules en -ix que no són incoatius: eixir (ix, ixen), dir (dix) i préstecs. Les de vocal
// davant (baix, calaix, coix) ja les deixa fora el patró: l'incoatiu porta consonant o «ï».
const NO_INCOATIU = new Set(['fix', 'prefix', 'sufix', 'mix', 'remix', 'linux', 'unix', 'matrix', 'dix', 'phoenix']);
const INCOATIU_IX = /(?<![\p{L}·])([\p{L}·]*[^aeiouàèéíòóú\s\p{P}]ix(?:en|es)?)(?![\p{L}·])/giu;
const DETERMINANTS_A = new Set(['eixa', 'esta', 'aquesta', 'altra', 'nostra', 'vostra', 'mateixa', 'tota', 'cada', 'una']);
const primeraParaula = (v) => (v.trim().match(/^[\p{L}·]+/u) || [''])[0];

// Tipus de la cadena, només pel nom de la clau. És la part heurística: una clau que no encaixa
// no rep regles de longitud ni d'etiqueta, i això és un fals negatiu triat, no un error.
function tipus(clau) {
  const k = clau.toLowerCase();
  const ultim = k.split('.').pop();
  if (/aria|announce|sr$|label$/.test(ultim)) return 'aria';
  if (/toast/.test(ultim)) return 'Toast';
  if (/sub|text|desc|hint|help|ayuda|ajuda|info$/.test(ultim)) return 'Helper/hint';
  if (/title|titulo|titol|heading/.test(ultim)) return 'Títol de secció/modal';
  if (/error|invalid|requerid|required/.test(k)) return "Missatge d'error";
  if (/button|btn|boton/.test(ultim) || /^(aceptar|cancelar|cerrar|tancar|close|confirm|cancel|save|guardar|delete|eliminar|borrar|submit|volver|limpiar|quitar|back|atras|aplicar|add|anadir)(default)?$/.test(ultim)) return 'Botó';
  return null;
}
// Les formes de plural de vue-i18n (`un | dos | {n}`) són cadenes distintes: es compta la més llarga.
const paraules = (s) => Math.max(...s.split(' | ').map((v) => v.replace(/\{[^}]*\}/g, 'X').split(/\s+/).filter(Boolean).length));
const aplana = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? aplana(v, p + k + '.') : typeof v === 'string' ? [[p + k, v]] : []));

let found = 0;
const avis = (file, clau, motiu, val) => {
  found++;
  console.log(`avís ${file} — ${clau}: ${motiu}: «${val.length > 70 ? val.slice(0, 67) + '…' : val}»`);
};

for (const file of changed) {
  let entrades;
  try {
    entrades = aplana(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')));
  } catch (e) {
    console.error(`comprova-redaccio: ${file} no és JSON vàlid (${e.message}); no el revise.`);
    continue;
  }
  // Imperatius de tu del mateix fitxer i dels termes canònics: «Confirme» només avisa si «Confirma»
  // hi és. Sense diccionari, és el que separa un verb de vosté d'una paraula com «Home». Els
  // determinants fan la mateixa parella («Eixe»/«Eixa»: 5 falsos positius de 5 al pilot) i, com que
  // són una classe tancada, es lleven; limitar-se als botons perdia 3 dels 8 encerts.
  const formesTu = new Set(
    [...entrades.map(([, v]) => primeraParaula(v)), ...[...canonics].map(primeraParaula)]
      .map((w) => w.toLowerCase())
      .filter((w) => w.endsWith('a') && !DETERMINANTS_A.has(w))
  );
  for (const [clau, val] of entrades) {
    const n = norm(val);
    const t = tipus(clau);
    if (t === 'Botó' && !canonics.has(n)) {
      const r1 = terminologia.find((r) => r.evitar.some((e) => norm(e) === n));
      if (r1) avis(file, clau, `terme a evitar (${r1.concepte}) → ${r1.canon.map((c) => `«${c}»`).join(' / ')} [terminologia.md]`, val);
    }
    const r2 = buides.find((b) => norm(b.evita) === n);
    if (r2) avis(file, clau, `etiqueta buida → ${r2.usa} [estructura-i-microcopy.md § Etiquetes de botó]`, val);
    if (t === 'Botó') {
      const primera = val.trim().split(/\s+/)[0].replace(/[^\p{L}·]/gu, '');
      const jaR1 = terminologia.some((r) => r.evitar.includes(primera));
      if (/(ar|er|re|ir)$/i.test(primera) && !/^(Següent|Anterior)$/i.test(primera) && !jaR1)
        avis(file, clau, `«${primera}» sembla infinitiu; botó en imperatiu 2a singular [veu-i-to.md]`, val);
    }
    if (t && pressupost[t] && paraules(val) > pressupost[t])
      avis(file, clau, `${t}: ${paraules(val)} paraules, orientatiu ≤ ${pressupost[t]} [estructura-i-microcopy.md § Longitud]`, val);
    if (/\b(HTTP|Error)\s*[45]\d{2}\b/i.test(val)) avis(file, clau, 'codi HTTP visible a l\'usuari [estructura-i-microcopy.md]', val);
    for (const g of generiques) if (paraula(g).test(val)) avis(file, clau, `paraula administrativa genèrica «${g}» [veu-i-to.md]`, val);
    if (/(^|[^\p{L}])Es \p{L}+rà([^\p{L}]|$)/iu.test(val)) avis(file, clau, 'impersonal burocràtic en futur [veu-i-to.md]', val);
    const dem = demEvitar.map((d) => val.match(paraula(d))).find(Boolean);
    if (dem) avis(file, clau, `demostratiu «${dem[0].replace(/[^\p{L}]/gu, '')}» → «${demCanon}» [terminologia.md § Formes]`, val);
    if (incoatiuEix) {
      const ix = [...val.matchAll(INCOATIU_IX)].map((m) => m[1]).find((w) => w.length >= 4 && !NO_INCOATIU.has(w.toLowerCase()));
      if (ix) avis(file, clau, `incoatiu en -ix «${ix}» → «${ix.replace(/ix(en|es)?$/i, 'eix$1')}» [terminologia.md § Formes]`, val);
    }
    if (senseVoste) {
      const p1 = primeraParaula(val);
      const tu = /^\p{Lu}/u.test(p1) && p1.endsWith('e') ? p1.slice(0, -1) + 'a' : null;
      let motiu = null;
      if (/(^|[^\p{L}])vost[éè]s?([^\p{L}]|$)/iu.test(val)) motiu = '«vosté» explícit';
      else if (/^\p{Lu}[\p{L}·]+isc(a|quen)$/u.test(p1)) motiu = `«${p1}» és l'imperatiu de vosté`;
      else if (tu && formesTu.has(tu.toLowerCase())) motiu = `«${p1}» és l'imperatiu de vosté (tu: «${tu}»)`;
      else if (/(^|[^\p{L}])(segur|confirma|confirme) que (vol|desitja)([^\p{L}]|$)/iu.test(val) || /^(Vol|Desitja) [^?]*\?/u.test(val.trim()))
        motiu = 'pregunta adreçada a vosté («vol», «desitja»)';
      if (motiu) avis(file, clau, `tractament de vosté: ${motiu}; la interfície tuteja [veu-i-to.md § Tractament]`, val);
    }
  }
}

if (!found) console.log('Cap avís de redacció als fitxers de traduccions canviats.');
else console.log(`\n${found} avís(os) de redacció — regles de ua-i18n-valencia i ua-ux-redaccio; cap no bloqueja (pressupostos orientatius, tipus deduït del nom de la clau).`);
process.exit(0);
