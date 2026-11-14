#!/usr/bin/env node
/**
 * Comprova si les còpies locals de ci-plantilla/ i hooks-plantilla/ d'un projecte
 * consumidor estan desfasades respecte al catàleg font (skills-si-ua).
 * Mateix patró que el check de desfasament del kit d'/exporta-modul (UI-1).
 *
 * Compara la línia "versio:" del VERSION.md local amb la del clon del catàleg.
 * Per defecte només avisa (exit 0): actualitzar és decisió del projecte, no un
 * error. Amb --strict, el desfasament fa exit 1 (per a projectes que vulguen
 * forçar-ho a la seua CI).
 *
 * També compta els hooks del catàleg que el projecte encara NO ha adoptat -per defecte només el
 * recompte; amb --hooks-disponibles, els noms. Mai compta per a --strict: no adoptar un hook no
 * és deriva, és una decisió.
 *
 * Ús:
 *   node kit-si-ua/ci-plantilla/comprova-desfasament.js --cataleg <ruta-al-clon> [--strict] [--hooks-disponibles]
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Els titulars de l'historial són informació extra: si `novetats.js` no ha arribat a esta còpia
// (adopcions anteriors a la 1.26.0), el check ha de continuar dient que vas endarrerit -només que
// sense el detall de què t'has perdut. Un guardià que peta per un mòdul de comoditat és pitjor
// que un que no dona detall.
let novetats = null;
try {
  ({ novetats } = require('./novetats.js'));
} catch (e) {
  novetats = null;
}

// Sense hooks-connectats.js (còpia anterior a 1.62.0) no es compara la configuració amb els scripts:
// el check continua comparant contingut, com abans.
let connexio = null;
try {
  connexio = require('./hooks-connectats.js');
} catch (e) {
  connexio = null;
}

// Sense disseny-kit.js (còpia anterior a 1.50.0) el segell es busca als dos llocs on ha estat.
let disseny = null;
try {
  disseny = require('./disseny-kit.js');
} catch (e) {
  disseny = null;
}
function segellDelKit() {
  if (disseny) return disseny.ruta(process.cwd(), '.kit-version');
  const nou = path.join('doc-projecte', '.kit-version');
  return fs.existsSync(path.join(process.cwd(), nou)) ? nou : path.join('docs', '.kit-version');
}

const args = process.argv.slice(2);
const idx = args.indexOf('--cataleg');
if (idx === -1 || !args[idx + 1]) {
  console.error('Ús: node kit-si-ua/ci-plantilla/comprova-desfasament.js --cataleg <ruta-al-clon-de-skills-si-ua> [--strict] [--hooks-disponibles]');
  process.exit(1);
}
const cataleg = path.resolve(args[idx + 1]);
const strict = args.includes('--strict');
const detallaDisponibles = args.includes('--hooks-disponibles');

function versioDe(fitxer) {
  if (!fs.existsSync(fitxer)) return null;
  const m = fs.readFileSync(fitxer, 'utf8').match(/^versio:\s*(\S+)/m);
  return m ? m[1] : null;
}

let desfasades = 0;
let comprovades = 0;

// Les dos primeres arriben al projecte com a còpia de la carpeta sencera (VERSION.md inclòs), i
// per això porten `copiada`: són les úniques que es poden trobar en dos llocs (vore versioLocal).
// kit-projecte NO es copia -el que hi arriba és la seua eixida, i el segell de versió que
// genera-kit.js estampa a doc-projecte/.kit-version (docs/.kit-version abans de kit-projecte 3.0.0)
// fa el mateix paper que el VERSION.md de les altres. On el busca ho diu disseny-kit.js.
const carpetes = [
  { nom: 'ci-plantilla', local: ['ci-plantilla', 'VERSION.md'], font: ['ci-plantilla', 'VERSION.md'], copiada: true },
  { nom: 'hooks-plantilla', local: ['hooks-plantilla', 'VERSION.md'], font: ['hooks-plantilla', 'VERSION.md'], copiada: true },
  { nom: 'kit-projecte (kit de documentació)', local: ['.kit-version'], font: ['kit-projecte', 'VERSION.md'], delKit: true },
];

// Al catàleg, les tres carpetes viuen sota kit-si-ua/ des de la consolidació del 2026-07-22; als
// clons anteriors estaven a l'arrel. Es proven els dos prefixos perquè el check funcione contra
// qualsevol clon (abans d'esta correcció només provava l'arrel i sempre deia "no trobat").
function fitxerAlCataleg(rel) {
  for (const p of [path.join(cataleg, 'kit-si-ua', ...rel), path.join(cataleg, ...rel)]) {
    if (versioDe(p) !== null) return p;
  }
  return null;
}

function versioAlCataleg(rel) {
  const f = fitxerAlCataleg(rel);
  return f ? versioDe(f) : null;
}

// Dir que vas endarrerit sense dir de què obliga a obrir un fitxer per a saber si importa -i qui
// encara no l'ha obert és precisament qui no sap si li importa. Els titulars ixen de l'historial
// del VERSION.md del catàleg, el mateix que la regla de bump ja obliga a mantindre.
const MAX_NOVETATS = 5;
function mostraNovetats(c, local, font) {
  if (!novetats) return;
  const fitxer = fitxerAlCataleg(c.font);
  if (!fitxer) return;
  const totes = novetats(fitxer, local, font);
  if (!totes.length) return;
  console.error(`       De què vas endarrerit (${totes.length}):`);
  for (const n of totes.slice(0, MAX_NOVETATS)) {
    console.error(`         ${n.versio} (${n.data})  ${n.titular}`);
  }
  if (totes.length > MAX_NOVETATS) {
    console.error(`         ...i ${totes.length - MAX_NOVETATS} més -${c.nom}/VERSION.md § Historial`);
  }
}

// I al projecte consumidor, pel mateix motiu i amb el mateix ordre: instal·la-ci.js escriu la
// còpia sota kit-si-ua/ (layout canònic) i les adopcions anteriors la deixaven a l'arrel. Mentres
// este costat només mirava l'arrel, una còpia niada no es distingia d'una carpeta no adoptada:
// queia al `continue` de baix i el check acabava en verd damunt d'una deriva real. Detectat a
// ua-ds-fusio el 2026-09-10 -còpia v1.25.0 contra catàleg v1.25.1, i l'única línia que va traure
// el check va ser l'OK del kit de documentació.
function versioLocal(c) {
  if (c.delKit) return { versio: versioDe(path.join(process.cwd(), segellDelKit())), aLArrel: false };
  if (!c.copiada) return { versio: versioDe(path.join(process.cwd(), ...c.local)), aLArrel: false };
  const niat = versioDe(path.join(process.cwd(), 'kit-si-ua', ...c.local));
  if (niat !== null) return { versio: niat, aLArrel: false };
  return { versio: versioDe(path.join(process.cwd(), ...c.local)), aLArrel: true };
}

for (const c of carpetes) {
  const { versio: local, aLArrel } = versioLocal(c);
  if (local === null) continue; // el projecte no ha adoptat esta carpeta (o còpia antiga sense VERSION.md)
  comprovades++;
  // El layout no és deriva de versió: es diu, però no compta per a --strict. Una còpia a l'arrel
  // pot estar perfectament al dia, i parar la CI d'un projecte per la seua ubicació seria fer
  // bloquejar este check per un motiu que no és el que vigila.
  if (aLArrel) {
    console.log(`NOTA: la teua còpia de ${c.nom} està a l'arrel del projecte; el layout canònic és kit-si-ua/${c.nom}/ -mou-la ahí i actualitza les rutes del workflow.`);
  }
  const font = versioAlCataleg(c.font);
  if (font === null) {
    console.error(`AVÍS: ${c.font.join('/')} no trobat al catàleg (${cataleg}) -¿ruta correcta?`);
    desfasades++;
  } else if (local !== font) {
    console.error(`AVÍS: la teua còpia de ${c.nom} és la v${local}; el catàleg va per la v${font}. Repetix l'adopció (README de la carpeta) per a refrescar-la.`);
    mostraNovetats(c, local, font);
    desfasades++;
  } else {
    console.log(`OK: ${c.nom} al dia (v${local})`);
  }
}

// --- Hooks adoptats fitxer a fitxer -----------------------------------------
// Els hooks no arriben com a carpeta sinó copiats un a un cap a `.claude/hooks/`, o siga que al
// projecte no hi ha cap VERSION.md i la fila de dalt es queda muda: dels tres projectes mesurats
// el 2026-09-10, dos els adopten així i cap dels dos es podia comprovar. Ací no es compara una
// versió sinó el contingut, que a més no pot mentir -un número diu el que algú va escriure quan
// va copiar; el contingut diu el que hi ha corrent ara.
const DIR_HOOKS = path.join(process.cwd(), '.claude', 'hooks');

function sensRetorns(fitxer) {
  return fs.readFileSync(fitxer, 'utf8').replace(/\r\n/g, '\n');
}

// `.cjs`/`.mjs` i `.js` són el mateix hook amb una extensió distinta: un projecte amb
// "type": "module" al package.json ha d'adoptar `comprova-docmap-commit.js` com a `.cjs` per a
// que Node el carregue. Comparar per nom exacte el donaria per no trobat i ningú el vigilaria.
function fontDelHook(nom, dirFont) {
  const noms = /\.(c|m)?js$/.test(nom)
    ? [nom, nom.replace(/\.(c|m)?js$/, '.js'), nom.replace(/\.(c|m)?js$/, '.cjs')]
    : [nom];
  for (const n of noms) {
    const p = path.join(dirFont, n);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

// --- Hooks del catàleg que el projecte encara no té -------------------------
// Fins ara este check només mirava cap a dins (què tens i com ha quedat), o siga que un hook nou
// del catàleg era invisible per a qualsevol projecte que no el tinguera ja: ningú li deia mai
// "te'n falten cinc". Ací es mira cap a fora.
//
// Es compta i prou. Amb 13 hooks al catàleg i projectes que n'adopten 4-5, llistar-los sencers a
// cada execució són vuit línies repetides que s'aprenen a botar -i amb elles, l'AVÍS de deriva
// que sí que importa. Els noms només ixen si algú els demana.
const EXTENSIONS_HOOK = /\.(sh|c?js|mjs)$/;

// Mirall de `fontDelHook`, en l'altra direcció: `.js`/`.cjs`/`.mjs` són el mateix hook amb
// l'extensió que el `package.json` del consumidor obliga a gastar. Sense este mirall, un projecte
// que va adoptar `comprova-docmap-commit.cjs` rebria el `.js` del catàleg com a "no adoptat" el
// primer dia -i un fals positiu el primer dia és el que fa que la funció s'acabe llevant.
function jaAdoptat(nomFont, locals) {
  if (!/\.(c|m)?js$/.test(nomFont)) return locals.has(nomFont);
  const base = nomFont.replace(/\.(c|m)?js$/, '');
  return ['.js', '.cjs', '.mjs'].some((e) => locals.has(base + e));
}

// Un projecte pot haver decidit que no vol un hook. Sense memòria d'eixa decisió, l'oferta es
// repetix a cada actualització fins que cansa. Viu a l'arrel (o a ci-plantilla/, o sota
// kit-si-ua/ci-plantilla/) amb la mateixa regla de tres llocs que docmap.json i skillmap.json, i
// es commiteja: declinar un hook és decisió del projecte, no de la màquina de qui l'executa.
const UBICACIONS_DECLINATS = [
  ['hooks-declinats.json'],
  ['ci-plantilla', 'hooks-declinats.json'],
  ['kit-si-ua', 'ci-plantilla', 'hooks-declinats.json'],
];

function hooksDeclinats() {
  for (const rel of UBICACIONS_DECLINATS) {
    const p = path.join(process.cwd(), ...rel);
    if (!fs.existsSync(p)) continue;
    // Un fitxer trencat no pot fer callar l'oferta en silenci: el projecte es quedaria sense
    // saber que li'n falten i sense saber per què. Falla obert i dient-ho.
    try {
      const dades = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!Array.isArray(dades)) {
        console.log(`NOTA: ${rel.join('/')} hauria de ser una llista [{"hook": "...", "motiu": "..."}] -s'ignora.`);
        return new Set();
      }
      return new Set(dades.map((e) => (typeof e === 'string' ? e : e && e.hook)).filter(Boolean));
    } catch (e) {
      console.log(`NOTA: ${rel.join('/')} no es pot llegir (${e.message}) -es compta com si no hi haguera cap hook declinat.`);
      return new Set();
    }
  }
  return new Set();
}

function comptaDisponibles(dirFont, locals) {
  const declinats = hooksDeclinats();
  const disponibles = fs
    .readdirSync(dirFont)
    .filter((nom) => EXTENSIONS_HOOK.test(nom)) // deixa fora els *.snippet.json i els *.md
    .filter((nom) => fs.statSync(path.join(dirFont, nom)).isFile())
    .filter((nom) => !jaAdoptat(nom, locals))
    .filter((nom) => !declinats.has(nom));

  if (!disponibles.length) return;
  if (detallaDisponibles) {
    console.log(`NOTA: ${disponibles.length} hook(s) del catàleg que este projecte no ha adoptat:`);
    for (const nom of disponibles) console.log(`        - ${nom}`);
    console.log('       Què fa cadascun i de què depén: hooks-plantilla/README.md § Hooks disponibles.');
  } else {
    console.log(
      `NOTA: ${disponibles.length} hook(s) del catàleg disponibles que este projecte no ha adoptat (--hooks-disponibles per a vore quins).`
    );
  }
}

// --- De què va el canvi, quan no hi ha VERSION.md local ---------------------
// La branca de carpetes (`mostraNovetats`) pot donar els titulars perquè sap de quina versió
// véns. La dels hooks no ho sap mai: qui els adopta fitxer a fitxer no té cap VERSION.md al
// projecte, i així és com ho fan dos dels tres projectes mesurats el 2026-09-10. Eixe majoritari
// rebia «N hook(s) difereixen, re-copia'ls» i cap motiu -el mateix forat que la 1.26.0 va tapar
// per a l'altra branca, amb el mateix argument: qui encara no ha obert el fitxer és precisament
// qui no sap si li importa. I un bump que LLEVA comportament (hooks-plantilla 5.9.0) és el cas on
// la línia muda convida a la reacció equivocada -qui no re-copia es queda la versió defectuosa.
//
// El que NO es fa és inventar-se el rang. Sense versió local no es pot calcular què et falta, i
// una llista que ho semblara mentiria en el cas més fàcil de creure: un projecte al dia que ha
// tocat un hook a mà. Es diuen els últims canvis del catàleg, i es diu que són exactament això.
const MAX_ULTIMS = 3;
function mostraUltimsHooks() {
  if (!novetats) return;
  // Amb VERSION.md de hooks-plantilla al projecte, la branca de carpetes ja ha donat el rang
  // exacte: repetir-ho ací seria dir dues vegades la mateixa cosa, i la segona pitjor.
  if (versioLocal({ local: ['hooks-plantilla', 'VERSION.md'], copiada: true }).versio !== null) return;
  const fitxer = fitxerAlCataleg(['hooks-plantilla', 'VERSION.md']);
  if (!fitxer) return;
  const font = versioDe(fitxer);
  const totes = novetats(fitxer, '0', font);
  if (!totes.length) return;
  console.error(`       El catàleg va per la hooks-plantilla v${font}. Sense VERSION.md local no se sap de`);
  console.error('       quina véns: estos són els últims canvis del catàleg, no un càlcul del que et falta.');
  for (const n of totes.slice(0, MAX_ULTIMS)) {
    console.error(`         ${n.versio} (${n.data})  ${n.titular}`);
  }
  console.error('       Historial complet: hooks-plantilla/VERSION.md.');
}

// --- La configuració i els scripts, en les dos direccions ------------------------
// Un script del catàleg copiat a `.claude/hooks/` que cap `settings*.json` nomena no corre mai, i
// fins a la 1.62.0 este check el donava per «al dia». Una entrada que nomena un script que no hi és
// fa petar el hook a cada crida, i en `PreToolUse` això deixa passar l'acció. Cap de les dos coses
// deixa rastre. Els scripts propis del projecte no connectats no avisen: poden ser utilitats que
// crida un altre script. En avís: no compta per a --strict.
function comprovaConnexio(dirFont) {
  if (!connexio) return new Set();
  const { llegits, scripts, relatius } = connexio.hooksConnectats(process.cwd());
  if (!llegits.length) return new Set(); // sense configuració llegible no es pot dir res
  // `relatius` no existix en una còpia de hooks-connectats.js anterior a la 1.69.0.
  if (relatius && relatius.size) {
    const llista = [...relatius].map(([n, s]) => `${n} (${s.join(', ')})`).join(', ');
    console.error(`AVÍS: ${relatius.size} hook(s) es criden amb ruta relativa, sense $CLAUDE_PROJECT_DIR: ${llista}`);
    console.error("       Després d'un `cd` a una subcarpeta fallen en silenci. Posa `cd \"$CLAUDE_PROJECT_DIR\" && ` davant de l'orde, com als snippets del kit.");
  }
  const sensScript = [...scripts.keys()].filter((nom) => !fs.existsSync(path.join(DIR_HOOKS, nom)));
  if (sensScript.length) {
    console.error(`AVÍS: ${sensScript.length} hook(s) de la configuració apunten a un script que no existix: ${sensScript.map((n) => `${n} (${scripts.get(n).join(', ')})`).join(', ')}`);
    console.error("       El hook falla a cada crida i deixa passar l'acció. Torna a copiar l'script o lleva l'entrada.");
  }
  const noConnectats = new Set();
  if (fs.existsSync(DIR_HOOKS) && dirFont) {
    for (const nom of fs.readdirSync(DIR_HOOKS)) {
      if (nom.startsWith('.') || !EXTENSIONS_HOOK.test(nom)) continue;
      if (!fs.statSync(path.join(DIR_HOOKS, nom)).isFile() || !fontDelHook(nom, dirFont)) continue;
      if (!scripts.has(nom)) noConnectats.add(nom);
    }
  }
  if (noConnectats.size) {
    console.error(`AVÍS: ${noConnectats.size} hook(s) del catàleg copiats a .claude/hooks/ que cap ${llegits.join(' ni ')} nomena: ${[...noConnectats].join(', ')}`);
    console.error("       No corren mai. Fusiona'n el snippet (hooks-plantilla/*.snippet.json) o esborra la còpia.");
  }
  return noConnectats;
}

function comprovaHooks() {
  const dirFont = ['kit-si-ua/hooks-plantilla', 'hooks-plantilla']
    .map((r) => path.join(cataleg, r))
    .find((p) => fs.existsSync(p));
  const noConnectats = comprovaConnexio(dirFont);
  if (!fs.existsSync(DIR_HOOKS)) return;
  if (!dirFont) return;

  const difereixen = [];
  const locals = new Set();
  let iguals = 0;
  let propis = 0;
  for (const nom of fs.readdirSync(DIR_HOOKS)) {
    const local = path.join(DIR_HOOKS, nom);
    if (nom.startsWith('.') || !fs.statSync(local).isFile()) continue;
    locals.add(nom);
    const font = fontDelHook(nom, dirFont);
    if (!font) {
      propis++; // hook propi del projecte: no és deriva, és seu
      continue;
    }
    if (noConnectats.has(nom)) continue; // ja ha avisat: no compta com a adoptat
    if (sensRetorns(font) === sensRetorns(local)) iguals++;
    else difereixen.push(nom);
  }

  if (iguals + difereixen.length === 0) return; // cap hook del catàleg adoptat ací
  comprovades++;
  if (difereixen.length) {
    console.error(
      `AVÍS: ${difereixen.length} hook(s) de .claude/hooks/ difereixen del catàleg: ${difereixen.join(', ')}`
    );
    console.error("       Re-copia'ls des de kit-si-ua/hooks-plantilla/ (vore el seu README).");
    mostraUltimsHooks();
    desfasades++;
  } else {
    console.log(`OK: ${iguals} hook(s) adoptats al dia (comparats fitxer a fitxer)`);
  }
  if (propis) {
    console.log(`     (${propis} fitxer(s) de .claude/hooks/ no són del catàleg: propis del projecte)`);
  }
  comptaDisponibles(dirFont, locals);
}

comprovaHooks();

// --- Mapa de skills del projecte ---------------------------------------------
// El `skillmap.json` és faena del projecte i no es refresca mai, o siga que quan el catàleg retira
// un skill el mapa continua suggerint-lo, i el suggeriment no es pot seguir. Igual amb un skill
// que l'agent no pot carregar (`disable-model-invocation`, p. ex. `ua-review`): cap dels dos es
// veu des de la sessió. `ua-ds-fusio` va suggerir `ua-dotnet-datatable` tres setmanes després de
// retirar-lo. Només avisa (no compta per a --strict): el mapa és del projecte. Els skills que no
// són `ua-*`/`gen-*` poden vindre d'un altre origen, i no es miren.
const MAPES_SKILLS = ['skillmap.json', 'ci-plantilla/skillmap.json', 'kit-si-ua/ci-plantilla/skillmap.json'];
function comprovaSkillmap() {
  const rel = MAPES_SKILLS.find((r) => fs.existsSync(path.join(process.cwd(), r)));
  if (!rel) return;
  let mapa;
  try {
    mapa = JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));
  } catch (e) {
    return; // un JSON trencat ja el diu comprova-higiene.js
  }
  const retirats = [];
  const nomesPersona = [];
  let mirats = 0;
  for (const r of (mapa && mapa.regles) || []) {
    for (const s of r.skills || []) {
      if (!/^(ua|gen)-/.test(s)) continue;
      mirats++;
      const f = path.join(cataleg, s, 'SKILL.md');
      if (!fs.existsSync(f)) retirats.push(`${r.nom}: ${s}`);
      else if (/^disable-model-invocation:\s*true/m.test(fs.readFileSync(f, 'utf8'))) nomesPersona.push(`${r.nom}: ${s}`);
    }
  }
  if (retirats.length) {
    console.error(`AVÍS: ${rel} suggerix ${retirats.length} skill(s) que el catàleg ja no té: ${retirats.join(', ')}`);
    console.error("       Canvia'ls pel que el substituïx (CHANGELOG del catàleg) o lleva'ls de la regla.");
  }
  if (nomesPersona.length) {
    console.error(`AVÍS: ${rel} suggerix ${nomesPersona.length} skill(s) que l'agent no pot carregar: ${nomesPersona.join(', ')}`);
    console.error('       Posa a la regla les peces que sí que pot carregar, i nomena el skill al missatge perquè el propose a la persona.');
  }
  if (!retirats.length && !nomesPersona.length && mirats) console.log(`OK: ${rel} suggerix ${mirats} skill(s) del catàleg, tots vius`);
}
// Sense skills al clon (una ruta de `--cataleg` que no és el catàleg) no es pot dir res.
if (fs.existsSync(path.join(cataleg, 'ua-mapa', 'SKILL.md'))) comprovaSkillmap();

if (comprovades === 0) {
  console.log('Cap VERSION.md local trobat: o el projecte no ha adoptat cap plantilla, o les còpies són anteriors al versionat (2026-07-21) -repetix l\'adopció per a estampar-lo.');
}

process.exit(strict && desfasades > 0 ? 1 : 0);
