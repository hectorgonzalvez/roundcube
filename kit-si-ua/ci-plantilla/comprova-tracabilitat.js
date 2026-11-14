#!/usr/bin/env node
/**
 * Traçabilitat entre el PRD i les specs de pantalla de cada faena de `doc-projecte/producte/`
 * (`ua-requisits-producte`, `ua-especificacio-pantalla`). Naix en avís: reporta i acaba en 0;
 * `--strict` fa que els errors acaben en 1 (els avisos, mai).
 *
 * Per a cada PRD (el d'una faena, o `projecte/prd.md` compartit per les faenes que no en porten:
 * `ambitsDe` de `producte.js`), amb les specs i els `pla.md` de totes les seues faenes, llig:
 *   - del PRD, els RF de «## Requisits funcionals» (`- **RF-NN** — …`, amb la prioritat, la
 *     «Prova» i si estan retirats) i les files de «## Tasques per rol» (`**T-XX**`, i els RF de
 *     l'última columna);
 *   - de cada spec vigent de `specs/`, el paràgraf «**RF que cobrix**» (amb «**No** cobrix» per
 *     als que deixa fora), les tasques de «## Tasques i informació» i els criteris de
 *     «## Criteris d'acceptació». No és vigent la que una altra spec cita com a `Spec anterior`
 *     ni la que porta «**Superada**» a la capçalera; la que no té el paràgraf no és de pantalla.
 *
 * Errors:
 *   - un RF citat per una spec o per la taula de tasques que el PRD no definix, o que està retirat;
 *   - un RF definit dos vegades;
 *   - una fila de tasca que cita un RF que una spec d'eixa tasca diu que no cobrix, sense cap altra
 *     spec de la tasca que el cobrisca: el PRD i l'spec s'han separat;
 *   - un criteri d'acceptació sense camí de prova («_Prova_»);
 *   - a la taula «Entregues» del `pla.md` (`ua-planificador/references/estimacio.md`): un tipus que
 *     no és Disseny, Construcció ni Validació, una entrega de construcció sense `RF-XX` ni
 *     «Motiu: …», un `E-NN` repetit, o un `RF-XX` que el PRD no definix o que està retirat. La
 *     Cartera rep esta taula per la CI (`exporta-entregues.js`): el que arriba a `main` s'ha de
 *     poder llegir.
 * Avisos:
 *   - la mateixa fila, quan una altra spec de la tasca sí que el cobrix (la decisió va al PRD);
 *   - un RF «Imprescindible» sense cap spec vigent, excepte si el `pla.md` el posa en una faena
 *     posterior («- **Faena 2 — …**: RF-12, RF-13»);
 *   - un RF sense «Prova».
 *
 * Amb `--base <ref>` (i `--head`, per defecte HEAD) també mira l'ordre: avís per cada RF que el
 * codi del canvi cita sense que cap spec vigent de la base el cobrisca (l'spec va abans que el
 * codi). Només en eixe mode toca git.
 *
 * Sense `--dir`, la carpeta la resol disseny-kit.js: `doc-projecte/producte/`, o `docs/producte/` en
 * un projecte anterior a kit-projecte 3.0.0.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-tracabilitat.js [--dir doc-projecte/producte] [--strict] [--base origin/main [--head HEAD]]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
// Sense disseny-kit.js (còpia anterior a 1.50.0) es mira als dos llocs on ha estat la carpeta.
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
const strict = process.argv.includes('--strict');
const base = arg('base', null);
const head = arg('head', 'HEAD');

// Un projecte sense artefactes de producte no té res a traçar: no és cap fallada, i el check va al
// job de tots els consumidors.
if (!fs.existsSync(dirArrel)) {
  console.log(`No hi ha ${dirArrel}: res a comprovar.`);
  // "Res a comprovar" és verd: si el que falta és perquè els artefactes són a l'altre disseny del
  // kit (una migració a mitges), el verd mentiria. Es diu, sense bloquejar.
  const altra = disseny && !process.argv.includes('--dir') ? disseny.barres(disseny.rutaAltra('.', 'producte')) : null;
  if (altra && fs.existsSync(altra)) {
    console.log(`AVÍS: però hi ha ${altra}, en l'altre disseny del kit -no s'ha comprovat. Mou-la a ${dirArrel}.`);
  }
  process.exit(0);
}

const { filesAmbEntrega, RF_RE, uniq, barres, llegixPrd, posteriors, llegixSpec, llegixSpecs, vigents, ambitsDe, TIPUS_ENTREGA, llegixEntregues } = require('./producte.js');

const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const gitOpcional = args => { try { return git(args); } catch { return ''; } };

// Els RF que el codi del canvi cita en les línies que afig -comentaris, noms de test-, amb els
// fitxers on els cita. Els documents (`.md`, `docs/`) i els fitxers de bloqueig no són codi.
function rfDelCodi() {
  const res = new Map();
  const fitxers = git(['diff', '--name-only', `${base}...${head}`]).split('\n')
    .filter(f => f && !/\.md$|(^|\/)docs\/|package-lock\.json$|yarn\.lock$/.test(f));
  for (const f of fitxers) {
    const afegides = git(['diff', '-U0', `${base}...${head}`, '--', f]).split('\n')
      .filter(l => l.startsWith('+') && !l.startsWith('+++')).join('\n');
    for (const rf of uniq(afegides.match(RF_RE) || [])) res.set(rf, [...(res.get(rf) || []), f]);
  }
  return res;
}

// Les specs vigents i el pla d'una faena tal com eren a la base: l'spec ha de ser-hi abans que el codi.
function specsALaBase(faena) {
  const dir = barres(path.join(faena, 'specs'));
  const totes = new Map();
  for (const f of gitOpcional(['ls-tree', '-r', '--name-only', base, '--', dir]).split('\n')) {
    if (f.endsWith('.md') && path.posix.dirname(f) === dir) totes.set(f, llegixSpec(git(['show', `${base}:${f}`])));
  }
  return { specs: vigents(totes), pla: gitOpcional(['show', `${base}:${barres(path.join(faena, 'pla.md'))}`]) };
}

const ambits = ambitsDe(dirArrel);

if (!ambits.length) {
  console.log(`Cap prd.md a ${dirArrel}: res a comprovar.`);
  process.exit(0);
}

let errors = 0;
let avisos = 0;
let rfsLlegits = 0;
const error = m => { errors++; console.log(`error ${m}`); };
const avis = m => { avisos++; console.log(`avís  ${m}`); };

// Les specs vigents de totes les faenes d'un àmbit, per ruta: un PRD compartit es cobrix entre totes.
const specsDe = faenes => new Map(faenes.flatMap(f => [...vigents(llegixSpecs(f))]));
const textDe = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const propi = (fitxerPrd, faenes) => faenes.length === 1 && path.dirname(fitxerPrd) === faenes[0];

for (const { prd: fitxerPrd, faenes } of ambits) {
  const fPrd = barres(fitxerPrd);
  const prd = llegixPrd(fPrd);
  const specs = specsDe(faenes);
  const nom = propi(fitxerPrd, faenes) ? barres(faenes[0]) : `${fPrd} (${faenes.length} faenes)`;
  console.log(`\n${nom}: ${prd.rfs.size} RF, ${prd.tasques.size} tasques, ${specs.size} specs vigents`);
  rfsLlegits += prd.rfs.size;

  // El que no es llig no es comprova, i el verd ho amagava: es diu què s'ha quedat fora.
  if (prd.noReconeguts.length) {
    const ids = uniq(prd.noReconeguts.map(n => n.rf));
    avis(`${fPrd}:${prd.noReconeguts[0].linia}: ${ids.length} RF definits en un format que no es reconeix (${ids.join(', ')}); s'esperava «- **RF-NN** — …». No es comproven fins que no es corregisca.`);
  }
  for (const f of faenes) {
    for (const [fitxer, s] of llegixSpecs(f)) {
      if (s.cobrixNoReconegut) avis(`${barres(fitxer)}: diu quins RF cobrix, però no amb «**RF que cobrix**»; no es llig com a spec de pantalla.`);
    }
  }

  for (const d of prd.duplicats) error(`${fPrd}:${d.linia}: ${d.rf} ja està definit més amunt.`);

  // Un RF que no existix o que s'ha retirat no pot seguir citat: qui el cita treballa amb un
  // requisit que ja no hi és.
  const motiu = rf => (!prd.rfs.has(rf) ? 'que el PRD no definix' : prd.rfs.get(rf).retirat ? 'que està retirat' : null);
  for (const [t, fila] of prd.tasques) {
    for (const rf of fila.rfs) if (motiu(rf)) error(`${fPrd}:${fila.linia}: la tasca ${t} cita ${rf}, ${motiu(rf)}.`);
  }
  for (const [fitxer, s] of specs) {
    for (const rf of s.cobrix) if (motiu(rf)) error(`${fitxer}:${s.liniaRf}: diu que cobrix ${rf}, ${motiu(rf)}.`);
    for (const rf of s.exclou) if (!prd.rfs.has(rf)) error(`${fitxer}:${s.liniaRf}: cita ${rf}, que el PRD no definix.`);
    for (const c of s.criteris) {
      if (!/_Prova_/.test(c.text)) error(`${fitxer}:${c.linia}: criteri d'acceptació sense «_Prova_».`);
    }
  }

  // La deriva per a la qual va nàixer: la fila d'una tasca cita un RF i l'spec de la tasca diu que
  // no el cobrix. Ningú no ho veu fins que algú llig els dos documents alhora.
  for (const [t, fila] of prd.tasques) {
    const deLaTasca = [...specs].filter(([, s]) => s.tasques.includes(t));
    for (const rf of fila.rfs) {
      const exclouen = deLaTasca.filter(([, s]) => s.exclou.includes(rf)).map(([f]) => f);
      if (!exclouen.length) continue;
      if (!deLaTasca.some(([, s]) => s.cobrix.includes(rf))) {
        error(`${fPrd}:${fila.linia}: la tasca ${t} cita ${rf}, però ${exclouen.join(', ')} diu que no el cobrix, i cap altra spec de ${t} el cobrix.`);
      } else {
        avis(`${fPrd}:${fila.linia}: la tasca ${t} cita ${rf}, i ${exclouen.join(', ')} diu que no el cobrix. Porta la decisió al PRD (fila ${t} i ${rf}).`);
      }
    }
  }

  const coberts = new Set([...specs.values()].flatMap(s => s.cobrix));
  const plans = faenes.map(f => path.join(f, 'pla.md')).filter(f => fs.existsSync(f));
  const mesAvant = new Set(plans.flatMap(f => [...posteriors(textDe(f))]));

  // La taula «Entregues» és el que la Cartera rep per la CI: si no es pot llegir, la Cartera
  // proposaria sol·licituds equivocades o cap. Un `E-NN` és únic dins del seu `pla.md`.
  for (const fPla of plans) {
    const entregues = llegixEntregues(textDe(fPla)) || [];
    const vistes = new Set();
    const fPlaB = barres(fPla);
    const ambEntrega = filesAmbEntrega(textDe(fPla));
    if (ambEntrega && !entregues.length) {
      avis(`${fPlaB}: la taula «Entregues» té ${ambEntrega} files amb E-NN i no se n'ha llegit cap; la capçalera ha de portar «Entrega», «Tipus» i «RF-XX o motiu».`);
    }
    for (const e of entregues) {
      if (!/^E-\d+$/.test(e.entrega)) error(`${fPlaB}:${e.linia}: «${e.entrega}» no és un identificador d'entrega (E-NN).`);
      else if (vistes.has(e.entrega)) error(`${fPlaB}:${e.linia}: ${e.entrega} ja és més amunt a «Entregues».`);
      vistes.add(e.entrega);
      if (!TIPUS_ENTREGA.includes(e.tipus)) error(`${fPlaB}:${e.linia}: ${e.entrega} té el tipus «${e.tipus}»; ha de ser ${TIPUS_ENTREGA.join(', ')}.`);
      if (e.tipus === 'Construcció' && !e.rfs.length && !e.motiu) error(`${fPlaB}:${e.linia}: ${e.entrega} és de construcció i no cita cap RF-XX ni porta «Motiu: …».`);
      for (const rf of e.rfs) if (motiu(rf)) error(`${fPlaB}:${e.linia}: ${e.entrega} cita ${rf}, ${motiu(rf)}.`);
    }
  }
  for (const [rf, d] of prd.rfs) {
    if (d.retirat) continue;
    if (/Imprescindible/i.test(d.prioritat) && !coberts.has(rf) && !mesAvant.has(rf)) {
      avis(`${fPrd}:${d.linia}: ${rf} és imprescindible i no el cobrix cap spec vigent.`);
    }
    if (!d.prova) avis(`${fPrd}:${d.linia}: ${rf} no té «Prova».`);
  }
}

// L'spec que arriba després del codi: amb `--base`, cada RF que el codi del canvi cita ha de tindre
// ja una spec vigent a la base que el cobrisca. Les specs van en MR pròpies abans de les de
// pantalla, per això no es compara dins de la MR. Un RF que el `pla.md` deixa per a una faena
// posterior es cita als comentaris com a «això queda fora» i no avisa.
if (base) {
  const citats = rfDelCodi();
  for (const { prd: fitxerPrd, faenes } of ambits) {
    const prd = llegixPrd(fitxerPrd);
    const aLaBase = faenes.map(specsALaBase);
    const coberts = new Set(aLaBase.flatMap(b => [...b.specs.values()].flatMap(s => s.cobrix)));
    const mesAvant = new Set(aLaBase.flatMap(b => [...posteriors(b.pla)]));
    const on = propi(fitxerPrd, faenes) ? barres(faenes[0]) : `les faenes de ${barres(fitxerPrd)}`;
    for (const [rf, fitxers] of citats) {
      if (!prd.rfs.has(rf) || prd.rfs.get(rf).retirat || coberts.has(rf) || mesAvant.has(rf)) continue;
      avis(`${fitxers[0]}${fitxers.length > 1 ? ` (+${fitxers.length - 1})` : ''}: cita ${rf}, i a ${base} cap spec vigent de ${on} el cobrix. L'spec va abans que el codi.`);
    }
  }
}

console.log(`\n${errors} errors, ${avisos} avisos.`);
if (!errors && !avisos) {
  // Amb cap RF llegit no s'ha comparat res: el verd diria que sí.
  console.log(rfsLlegits ? '✔ El PRD i les specs es corresponen.' : 'Cap RF llegit al PRD: no hi ha res a correspondre.');
}
process.exit(strict && errors ? 1 : 0);
