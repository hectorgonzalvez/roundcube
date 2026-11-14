#!/usr/bin/env node
/**
 * Marques de temps d'una faena (branca o PR): el que git ja sap, amb el nom que li toca.
 *
 * Per què existix
 * ---------------
 * El servei porta les hores de cada tiquet a mà i la pregunta natural és si es poden traure del
 * repositori. **De git no ixen hores**: un commit diu quan es va **guardar**, no quant es va
 * **tardar**. El que sí que ix -i ningú mira- són les marques: quan comença i quan acaba una
 * faena, quants dies té activitat, quants salts llargs conté. Això ajuda una persona a recordar
 * l'abast quan òmpliga el tiquet; no és el comptador.
 *
 * La confusió no és hipotètica, i té el mode de fallada escrit en la pròpia dada: al catàleg,
 * `e834b20` i `723a250` porten el **mateix** `CommitDate` (2026-09-11 20:27:13) perquè una fusió
 * els va reescriure tots dos. Qui calcule "temps entre commits consecutius" amb la data de commit
 * conclou que eixa faena va costar **0 segons**. Per això ací totes les dates són **dates
 * d'autoria** i, quan detecta que l'historial s'ha reescrit, l'script ho diu en lloc d'emetre una
 * xifra que sembla bona.
 *
 * Quina dada ja existent el mesura (regla de govern, `ESTANDARDS.md` §10.2): el propi `git log` de
 * la branca i, si el projecte el té, `.claude/registre-disparadors.jsonl`. **No recull res nou**,
 * no obri cap fitxer de codi, no crida cap API i no escriu res.
 *
 * Com es nota que acusa quan no toca: els controls de `proves/casos/marques-de-temps.js`. El cas
 * que importa és el negatiu -dos commits amb la mateixa marca han de donar "no mesurable", mai un
 * interval de 0 s presentat com un fet.
 *
 * El que **no** fa, i no és una limitació pendent de tapar:
 *   - No agrega per persona. Mesura una faena, no qui la fa; el dia que la xifra qualifique algú,
 *     s'ajusta la manera de partir els commits i deixa de mesurar res.
 *   - No inventa el temps que falta. Amb un sol commit, o amb marques iguals, la resposta és
 *     "no mesurable" -que és un resultat vàlid per `ESTANDARDS.md` §10.1, no un forat.
 *   - No parla amb el forge. Les dates de PR obert/fusionat i les durades de CI existixen, però
 *     viuen a GitHub/Azure i exigirien credencials; ací no entra res que no siga git pelat.
 *
 * Ús:  node kit-si-ua/ci-plantilla/marques-de-temps.js [--base <ref>] [--head <ref>]
 *                                                      [--salt <hores>] [--claude <dir>] [--json]
 *
 * Mai bloqueja (eixida 0 sempre que puga córrer). Eixida 2 = no pot córrer (sense git, o sense
 * poder resoldre contra què comparar): no és una troballa, és no haver mirat res.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function arg(nom, def) {
  const i = process.argv.indexOf('--' + nom);
  return i > -1 ? process.argv[i + 1] : def;
}

const head = arg('head', 'HEAD');
const baseArg = arg('base', null);
const llindarSalt = Math.max(1, parseInt(arg('salt', '8'), 10)) * 3600;
const dirClaude = arg('claude', '.claude');
const json = process.argv.includes('--json');

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}
fitxers.exigixGit('marques-de-temps.js', "llig les marques de temps dels commits d'una branca");

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}
function gitOpcional(args) {
  try {
    return git(args);
  } catch (e) {
    return '';
  }
}

// Contra què es compara. Si no es pot resoldre, es para: agafar tot l'historial com a "esta faena"
// donaria una xifra creïble i falsa, que és pitjor que no donar-ne cap.
const CANDIDATES = ['origin/main', 'origin/master', 'main', 'master'];
let base = baseArg;
if (!base) {
  for (const ref of CANDIDATES) {
    if (!gitOpcional(['rev-parse', '--verify', '--quiet', ref])) continue;
    const mb = gitOpcional(['merge-base', ref, head]);
    if (mb) {
      base = mb;
      break;
    }
  }
}
if (!base) {
  console.error('marques-de-temps.js: no sé contra quina branca comparar esta faena.');
  console.error(`Cap de ${CANDIDATES.join(', ')} existix ací. Digues-ho: --base <ref>.`);
  console.error("No hi ha valor per defecte raonable: mesurar contra l'arrel de l'historial donaria");
  console.error("l'interval del repositori sencer presentat com si fóra el d'esta faena.");
  process.exit(2);
}

// Base i head al mateix commit: o estàs damunt de la branca base, o la faena ja s'ha fusionat.
// Els dos casos donarien "cap commit en este rang", que es llig com "no hi ha res" quan el que
// passa és que ningú ha dit quin rang és la faena.
if (!baseArg && gitOpcional(['rev-parse', base]) === gitOpcional(['rev-parse', head])) {
  console.error(`marques-de-temps.js: ${head} i la branca base són el mateix commit.`);
  console.error('O treballes damunt de la branca base, o esta faena ja està fusionada.');
  console.error('Digues quin rang és la faena: --base <ref> (el commit anterior a la faena, una etiqueta,');
  console.error('el primer commit del tiquet...). Sense eixe extrem no hi ha faena que delimitar.');
  process.exit(2);
}

// --- Els commits del rang -----------------------------------------------------------------
// %at/%ct en segons (cap parsing de zones horàries), %aI per a mostrar, %ad per a comptar dies.
const SEP = '\t';
const cru = gitOpcional([
  'log',
  '--reverse',
  '--date=short',
  `--format=%H${SEP}%at${SEP}%ct${SEP}%aI${SEP}%ad${SEP}%an`,
  `${base}..${head}`,
]);

const commits = cru
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [hash, at, ct, aI, ad, an] = l.split(SEP);
    return { hash, at: Number(at), ct: Number(ct), aI, ad, an: an || '' };
  })
  .filter((c) => c.hash && Number.isFinite(c.at));

if (!commits.length) {
  const buit = {
    base,
    head,
    commits: 0,
    mesurable: false,
    avisos: ['Cap commit en este rang: no hi ha res a mesurar.'],
  };
  if (json) process.stdout.write(JSON.stringify(buit, null, 2) + '\n');
  else console.log(`Cap commit entre ${base.slice(0, 7)} i ${head}: no hi ha res a mesurar.`);
  process.exit(0);
}

// --- El que es pot dir -------------------------------------------------------------------
const primer = commits[0];
const ultim = commits[commits.length - 1];
const interval = ultim.at - primer.at;
const dies = new Set(commits.map((c) => c.ad)).size;
const autors = new Set(commits.map((c) => c.an)).size;

const salts = [];
for (let i = 1; i < commits.length; i++) {
  const d = commits[i].at - commits[i - 1].at;
  if (d > llindarSalt) salts.push({ de: commits[i - 1].aI, a: commits[i].aI, segons: d });
}

// Historial reescrit: data d'autoria i data de commit separades (rebase, amend, fusió), o dos
// commits amb la mateixa data de commit al segon. Les dos coses invaliden qualsevol interval
// calculat amb `%ct`, i és el càlcul que faria qualsevol per defecte.
const DESVIACIO_MINIMA = 60;
const desviats = commits.filter((c) => Math.abs(c.ct - c.at) > DESVIACIO_MINIMA).length;
const ctRepetides = commits.length - new Set(commits.map((c) => c.ct)).size;

// Volum del canvi, per `--numstat` i no per `--shortstat`: el segon és una frase en anglés que es
// parseja amb regex i el primer són números.
let fitxersTocats = 0;
let insercions = 0;
let supressions = 0;
for (const l of gitOpcional(['diff', '--numstat', `${base}...${head}`]).split('\n').filter(Boolean)) {
  const [a, d] = l.split('\t');
  fitxersTocats++;
  insercions += Number(a) || 0; // "-" en binaris
  supressions += Number(d) || 0;
}

// --- Sessions d'agent (parcial per construcció) ------------------------------------------
// El registre només porta esdeveniments quan es suggerix o s'invoca un skill: una sessió que no
// en toque cap no hi apareix, i el tram anterior al primer esdeveniment no s'hi veu. O siga que
// això és una **cota inferior** de la sessió, i la relació amb esta branca és només que cau dins
// de la finestra -el registre no sap de branques. Es diu, no s'amaga darrere d'una xifra.
function sessionsAgent() {
  const ruta = process.env.UA_REGISTRE_DISPARADORS && process.env.UA_REGISTRE_DISPARADORS !== '0'
    ? process.env.UA_REGISTRE_DISPARADORS
    : path.join(dirClaude, 'registre-disparadors.jsonl');
  if (process.env.UA_REGISTRE_DISPARADORS === '0' || !fs.existsSync(ruta)) return null;

  const perSessio = new Map();
  let linies;
  try {
    linies = fs.readFileSync(ruta, 'utf8').split('\n').filter(Boolean);
  } catch (e) {
    return null;
  }
  for (const l of linies) {
    let e;
    try {
      e = JSON.parse(l);
    } catch (err) {
      continue;
    }
    if (!e || !e.sessio || !e.ts) continue;
    const t = Math.floor(new Date(e.ts).getTime() / 1000);
    if (!Number.isFinite(t) || t < primer.at || t > ultim.at) continue;
    const prev = perSessio.get(e.sessio);
    if (!prev) perSessio.set(e.sessio, { sessio: e.sessio, primer: t, ultim: t, esdeveniments: 1 });
    else {
      prev.esdeveniments++;
      if (t < prev.primer) prev.primer = t;
      if (t > prev.ultim) prev.ultim = t;
    }
  }
  return [...perSessio.values()]
    .sort((a, b) => a.primer - b.primer)
    .map((s) => ({
      sessio: s.sessio,
      esdeveniments: s.esdeveniments,
      primer_esdeveniment: new Date(s.primer * 1000).toISOString(),
      ultim_esdeveniment: new Date(s.ultim * 1000).toISOString(),
      tram_vist_s: s.ultim - s.primer,
    }));
}
const sessions = sessionsAgent();

// --- Avisos: el que impedix llegir les marques com un comptador --------------------------
const avisos = [];
const mesurable = commits.length > 1 && interval > 0;

if (commits.length === 1) {
  avisos.push('Interval: no mesurable amb un sol commit -només hi ha una marca, no dos.');
} else if (interval === 0) {
  avisos.push(
    'Interval: no mesurable -el primer i l\'últim commit porten la mateixa marca d\'autoria. ' +
      'Passa amb commits fets en bloc o amb dates reescrites; "0 s" no és el temps de la faena.'
  );
}
if (desviats || ctRepetides) {
  avisos.push(
    `Historial reescrit: ${desviats} commit(s) amb data de commit separada de la d'autoria` +
      (ctRepetides ? ` i ${ctRepetides} amb la data de commit repetida` : '') +
      '. Ací totes les dates són d\'AUTORIA; qualsevol interval calculat amb la data de commit ' +
      "(que és el que fa `git log` per defecte a moltes eines) seria fals."
  );
}
if (salts.length) {
  avisos.push(
    `L'interval conté ${salts.length} salt(s) de més de ${llindarSalt / 3600} h entre commits ` +
      'consecutius: temps de calendari que segur que no és temps de faena.'
  );
}
if (dies > 1) {
  avisos.push(
    `La faena toca ${dies} dies de calendari: l'interval inclou les nits i el que s'haja fet ` +
      'enmig per a altres tiquets.'
  );
}

const LIMIT = [
  'Açò són marques de temps, no hores treballades.',
  'Un commit diu quan es va guardar, no quant es va tardar. Les hores del tiquet les posa una',
  "persona; això és l'ajuda per a recordar l'abast, no el comptador. La mesura de veres és la",
  "campanya d'ESTANDARDS.md §10.1, i continua pendent d'accés als repositoris i als tiquets.",
].join('\n');

function durada(s) {
  if (s <= 0) return '0 s';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d} d`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (!parts.length) parts.push(`${s} s`);
  return parts.join(' ');
}

// --- Eixida ------------------------------------------------------------------------------
// Els noms dels camps són part del contracte: `interval_calendari`, mai `hores`. Qui integre això
// amb el tiquet copia el nom que llig, i el nom és l'única cosa que viatja fins al camp del Jira.
if (json) {
  process.stdout.write(
    JSON.stringify(
      {
        base,
        head,
        commits: commits.length,
        autors,
        primer_commit: primer.aI,
        ultim_commit: ultim.aI,
        interval_calendari_s: interval,
        interval_calendari: mesurable ? durada(interval) : null,
        dies_amb_activitat: dies,
        salts_majors: { llindar_h: llindarSalt / 3600, quants: salts.length, detall: salts },
        fitxers: fitxersTocats,
        insercions,
        supressions,
        dates_de_commit_reescrites: desviats,
        dates_de_commit_repetides: ctRepetides,
        sessions_agent: sessions,
        mesurable,
        avisos,
        aixo_no_son_hores: LIMIT.replace(/\n/g, ' '),
      },
      null,
      2
    ) + '\n'
  );
  process.exit(0);
}

console.log(`Marques de temps · ${base.slice(0, 7)}..${head}`);
console.log(`  commits                ${commits.length}${autors > 1 ? ` (${autors} autors)` : ''}`);
console.log(`  primer commit          ${primer.aI}`);
console.log(`  últim commit           ${ultim.aI}`);
console.log(`  interval de calendari  ${mesurable ? durada(interval) : 'no mesurable'}`);
console.log(`  dies amb activitat     ${dies}`);
console.log(`  canvi                  ${fitxersTocats} fitxers, +${insercions}/-${supressions}`);

if (sessions && sessions.length) {
  console.log('\nSessions d\'agent dins de la finestra (cota inferior, i només les que van tocar un skill):');
  for (const s of sessions) {
    console.log(
      `  ${s.sessio.slice(0, 12).padEnd(14)} ${durada(s.tram_vist_s).padEnd(14)} ` +
        `${s.esdeveniments} esdeveniments (${s.primer_esdeveniment} → ${s.ultim_esdeveniment})`
    );
  }
  console.log('  El registre no sap de branques: cauen ací per marca de temps, no per pertinença.');
} else if (sessions) {
  console.log('\nCap sessió d\'agent registrada dins de la finestra.');
}

if (avisos.length) {
  console.log('');
  for (const a of avisos) console.log(`avís: ${a}`);
}

console.log('\n' + LIMIT);
process.exit(0);
