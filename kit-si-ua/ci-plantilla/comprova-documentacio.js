#!/usr/bin/env node
/**
 * Versió CI del hook de documentació de commit (patró validat a sistema-disseny-ua):
 * si el rang de canvis toca codi "documentation-worthy" segons el mapa de responsabilitat
 * del projecte i cap dels fitxers de documentació associats ha canviat, falla amb el
 * fitxer exacte que falta. Bypass: [no-doc] a la vora d'una línia (inici o final) de qualsevol
 * missatge de commit del rang -vore `invocaBypass()` per a per què la posició importa.
 *
 * Diferència amb el hook local: ací no hi ha agent que raone el diff -és una comprovació
 * determinista per patrons. El hook local (agent Haiku) és el feedback fi; açò és la garantia.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-documentacio.js --base origin/main --head HEAD [--config docmap.json]
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');
const configPath = arg('config', path.join(__dirname, 'docmap.json'));

if (!fs.existsSync(configPath)) {
  console.error(`Config no trobada: ${configPath} (copia docmap.exemple.json i adapta el mapa al projecte)`);
  process.exit(2);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Naixement o mort del fitxer: A(fegit), D(esborrat), R(enombrat) i C(opiat) canvien si el fitxer
// existix a un costat del rang o a l'altre; M i T només en canvien el cos. Un skill que es mou de
// carpeta és una mort i un naixement, però git només ho diu amb una línia `R` -per això hi entra.
const ESTRUCTURAL = new Set(['A', 'D', 'R', 'C']);

// Este check no té mode sense git i no n'ha de tindre: la pregunta que fa és si el codi i la seua
// documentació canvien JUNTS. Sense diff no hi ha "junts". Val més dir-ho que petar amb un rastre
// de pila que ningú relaciona amb la falta d'un repositori.
let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}
fitxers.exigixGit('comprova-documentacio.js', "comprova que el codi i la seua documentació canvien junts en un mateix diff");

const range = `${base}...${head}`;
// `--name-status` i no `--name-only`: hi ha regles que només han de comptar quan el fitxer naix o
// mor (`nomes_naixement_o_mort`), i eixa distinció no viatja dins del nom del fitxer.
const entrades = execSync(`git diff --name-status ${range}`, { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((linia) => {
    const camps = linia.split('\t');
    // `R100\tvell\tnou` i `C75\tvell\tnou` porten dos rutes: compta la nova, que és també l'única
    // que donava `--name-only` -el contingut de `changed` no canvia respecte de la versió anterior.
    return { estat: camps[0][0], ruta: camps[camps.length - 1] };
  });
const changed = entrades.map((e) => e.ruta);
const estatDe = new Map(entrades.map((e) => [e.ruta, e.estat]));
const messages = execSync(`git log --format=%s%n%b ${range}`, { encoding: 'utf8' });

const MARCADOR = '[no-doc]';

/**
 * Cert només si el missatge **invoca** el marcador, no si l'anomena.
 *
 * Fins al 2026-08-28 açò era `messages.includes('[no-doc]')` sobre tots els missatges del rang
 * concatenats, i qualsevol commit que parlara del marcador apagava el guardià sencer -que llavors
 * informava en verd d'una passada que no havia mirat res-. No és hipotètic: mesurat sobre
 * l'historial complet d'este catàleg i d'`ua-ds-fusio`, **nou commits** contenien una menció en
 * prosa i cadascun va desactivar la comprovació del seu rang. Els més cars van ser els que
 * documentaven l'arreglada d'un bug anterior d'este mateix bypass: explicar-lo el desactivava.
 *
 * La regla ix de la mateixa mesura, no d'una preferència. De les 24 aparicions de l'historial:
 * les 15 invocacions reals estan **totes** a la vora de la línia -`[no-doc] motiu`, `motiu
 * [no-doc]`, o el marcador a soles-, i les 9 mencions en prosa estan **totes** enmig d'una frase
 * (`ni posar [no-doc], i es va absorbir`). La vora de línia les separa 24 de 24.
 *
 * No s'exigix justificació: `[no-doc]` a soles en una línia és una forma que l'historial ja usa
 * (commit 3525), i rebutjar-la seria trencar un ús legítim per a guanyar rigor que la mesura no
 * demana. Els spans `` `…` `` i els blocs de codi es lleven abans: és com este repositori cita un
 * marcador en lloc d'invocar-lo, i era la forma exacta del cas que ho va destapar.
 */
function invocaBypass(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`\n]*`/g, ' ')
    .split('\n')
    .some((linia) => {
      const l = linia.trim();
      return l.includes(MARCADOR) && (l.startsWith(MARCADOR) || l.endsWith(MARCADOR));
    });
}

if (invocaBypass(messages)) {
  console.log(`Bypass ${MARCADOR} present al rang de commits -comprovació omesa.`);
  process.exit(0);
}

const exempt = (config.exempcions || []).map(p => new RegExp(p));
const relevant = changed.filter(f => !exempt.some(r => r.test(f)));

let failed = false;
for (const regla of config.regles || []) {
  const codiRe = regla.codi.map(p => new RegExp(p));
  const coincidents = relevant.filter(f => codiRe.some(r => r.test(f)));
  if (!coincidents.length) continue;

  // Regles d'esdeveniment estructural: el que la dispara és que una peça naixca o muira, no que
  // se n'edite el cos. Sense això, una regla com "el catàleg canvia sense el marc referencial"
  // acusa cada edició d'un `SKILL.md` existent -34 dels últims 200 commits d'este repositori- i el
  // guardia es torna soroll que algú acaba apagant.
  const tocats = regla.nomes_naixement_o_mort === true
    ? coincidents.filter(f => ESTRUCTURAL.has(estatDe.get(f)))
    : coincidents;

  if (!tocats.length) {
    // Es diu en veu alta: una regla que calla per disseny i no ho diu és indistingible d'una regla
    // morta, que és com un guardia es passa un mes en verd sense mirar res.
    console.log(
      `· Regla "${regla.nom}": només conta naixements i morts, i els ${coincidents.length} fitxer(s) ` +
        `que hi coincidixen només canvien de cos -no la dispara.`
    );
    continue;
  }

  const docCanviada = regla.documentacio.some(doc =>
    doc.endsWith('/') ? changed.some(f => f.startsWith(doc)) : changed.includes(doc)
  );
  if (!docCanviada) {
    failed = true;
    console.log(`✖ Regla "${regla.nom}": canvien ${tocats.length} fitxer(s) de codi però cap d'estos documents:`);
    regla.documentacio.forEach(d => console.log(`    - ${d}`));
    console.log(`  Fitxers que ho disparen: ${tocats.slice(0, 5).join(', ')}${tocats.length > 5 ? '…' : ''}`);
  } else {
    console.log(`✔ Regla "${regla.nom}": codi i documentació canvien junts.`);
  }
}

if (failed) {
  console.log(
    `\nSi el canvi de veres no necessita documentació, afig ${MARCADOR} al missatge de commit i ` +
      `justifica-ho. Ha d'obrir o tancar la seua línia (\`${MARCADOR} motiu\` o \`motiu ${MARCADOR}\`): ` +
      'enmig d\'una frase no compta, perquè així és com es parla del marcador sense voler invocar-lo.'
  );
  process.exit(1);
}
console.log('Documentació coherent amb el diff.');
