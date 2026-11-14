#!/usr/bin/env node
/**
 * Anàlisi determinista de REGISTRE-ERRORS.md: compta entrades per tipus, per
 * qui les detecta i per qui les ha escrites (`via`), aplica el criteri del
 * pilot (`validacio-equip.md` §C1: ≥15 entrades i ≥40% amb `detecta: persona`)
 * i mesura el retard de la cua d'auditoria.
 *
 * NO és una font de veritat nova: llig fitxers que ja existixen i n'aplica les
 * mateixes ordres `grep` que documenta la capçalera "Anàlisi final" de
 * `REGISTRE-ERRORS.plantilla.md`. Este script existix perquè eixes ordres
 * depenien de bash/grep i `/telemetria` ha de funcionar igual en qualsevol
 * plataforma on córrega Claude Code -per això el filtre de la cua es reimplementa
 * ací en lloc de cridar l'`awk` de `/ua-skills:auditoria`.
 *
 * Mai llança: sense els fitxers, o amb un format que no entén, no bloqueja res.
 *
 * Sense `--fitxer`, el registre es busca a `doc-projecte/REGISTRE-ERRORS.md` i, si no hi és, a
 * l'arrel (projectes anteriors a kit-projecte 3.0.0).
 *
 * CLI: `node kit-si-ua/ci-plantilla/analitza-registre-errors.js [--json] [--fitxer <ruta>]
 *       [--claude <dir>]`
 */
'use strict';

const fs = require('fs');
const path = require('path');

// El primer que existix; si no n'hi ha cap, el primer (és on el crearia el kit d'ara).
const CANDIDATS = [path.join('doc-projecte', 'REGISTRE-ERRORS.md'), 'REGISTRE-ERRORS.md'];
const PER_DEFECTE = CANDIDATS.find(c => fs.existsSync(c)) || CANDIDATS[0];
const DIR_CLAUDE_PER_DEFECTE = '.claude';

// Capçalera d'entrada: "### AAAA-MM-DD · TIPUS · detecta: IA|persona [· via: hook|auditoria]"
const RE_CAPCALERA = /^### (\d{4}-\d{2}-\d{2}) · ([A-Z]+) · detecta: (IA|persona)(?: · via: (\S+))?/;

// Vies que identifiquen l'observador INDEPENDENT (no l'agent principal). `hook` és l'auditor
// antic -agent de tipus `agent` al `Stop`, retirat el 2026-08-06-; `auditoria` és la comanda
// `/ua-skills:auditoria` que el va substituir. Les dos mesuren el mateix: què s'havia deixat
// l'agent principal. Comptar només `hook` faria que, a partir del canvi, eixa diferència -que és
// tota la raó de ser del mecanisme- caiguera a zero sense que res ho delatara.
const VIES_AUDITOR = ['hook', 'auditoria'];

// Línia de `.claude/auditoria-sessions.log` (marca-auditoria.sh):
//   "AAAA-MM-DDTHH:MM:SS · fi-torn|revisada · sessio: <id-truncat-a-12>[ · nota]"
const RE_MARCA = /^(\S+) · (fi-torn|revisada) · sessio: (\S+)/;

// Camp de cos, no de capçalera: va deliberadament fora de `RE_CAPCALERA` perquè afegir-lo allí
// trencaria les ordres `grep` documentades a la plantilla i les còpies del camp ja escrites.
// És la clau enumerada que permet comptar «la mateixa peça en dos projectes» sense comparar
// text lliure -vore `REGISTRE-ERRORS.plantilla.md` § "Els quatre tipus".
const RE_PECA = /^Peça:\s*(\S.*?)\s*$/;

function llig(fitxer) {
  if (!fs.existsSync(fitxer)) return null;
  try {
    return fs.readFileSync(fitxer, 'utf8');
  } catch (e) {
    return null;
  }
}

/** Analitza el contingut cru del fitxer. Descarta qualsevol línia que no siga capçalera d'entrada. */
function analitza(contingut) {
  const entrades = [];
  // El camp `Peça:` només compta dins del bloc contigu de la seua entrada. Sense esta condició,
  // un `Peça:` escrit a la documentació del propi fitxer -la plantilla en porta exemples, i
  // l'apèndix va **després** de les entrades- l'absorbiria l'última entrada real i inflaria el
  // recompte amb una línia que no és cap incident.
  let dins = false;
  for (const linia of contingut.split('\n')) {
    const m = linia.match(RE_CAPCALERA);
    if (m) {
      entrades.push({ data: m[1], tipus: m[2], detecta: m[3], via: m[4] || null, peca: null });
      dins = true;
      continue;
    }
    if (!linia.trim() || linia.startsWith('#') || linia.startsWith('```')) {
      dins = false;
      continue;
    }
    if (!dins) continue;
    const p = linia.match(RE_PECA);
    if (p) entrades[entrades.length - 1].peca = p[1];
  }

  const perTipus = new Map();
  const perDetecta = new Map();
  const perVia = new Map();
  const perPeca = new Map();
  for (const e of entrades) {
    perTipus.set(e.tipus, (perTipus.get(e.tipus) || 0) + 1);
    perDetecta.set(e.detecta, (perDetecta.get(e.detecta) || 0) + 1);
    const via = e.via || 'agent-principal';
    perVia.set(via, (perVia.get(via) || 0) + 1);
    // Una `EINES` sense peça es compta com a "sense determinar" en lloc de no comptar-se: un buit
    // omés desapareix del recompte i el fa parèixer complet, que és el mode de fallada que fa
    // inservible la comparació entre projectes. Els altres tipus sense camp no hi entren -allí
    // no aplica-. No es valida el valor contra cap llista: ací es compta el que hi ha, i qui la
    // fixa és `registra-error.sh` en escriure.
    if (e.peca) perPeca.set(e.peca, (perPeca.get(e.peca) || 0) + 1);
    else if (e.tipus === 'EINES') perPeca.set('sense determinar', (perPeca.get('sense determinar') || 0) + 1);
  }

  const total = entrades.length;
  const persona = perDetecta.get('persona') || 0;
  const percentPersona = total ? Math.round((persona / total) * 100) : 0;
  const viaAuditor = VIES_AUDITOR.reduce((n, v) => n + (perVia.get(v) || 0), 0);

  return {
    total,
    perTipus: [...perTipus.entries()].sort((a, b) => b[1] - a[1]).map(([tipus, n]) => ({ tipus, n })),
    perDetecta: [...perDetecta.entries()].map(([detecta, n]) => ({ detecta, n })),
    perVia: [...perVia.entries()].sort((a, b) => b[1] - a[1]).map(([via, n]) => ({ via, n })),
    // Clau de comparació entre projectes: dos entrades de la mateixa peça en repositoris distints
    // valen més que dos del mateix (`REGISTRE-ERRORS.plantilla.md` § "Anàlisi final").
    perPeca: [...perPeca.entries()].sort((a, b) => b[1] - a[1]).map(([peca, n]) => ({ peca, n })),
    // Escrites per l'observador independent, sumant les dues generacions del mecanisme.
    viaAuditor,
    // Es manté per compatibilitat amb consumidors del `--json` anteriors a 2026-08-06; és un
    // subconjunt de `viaAuditor`, no una xifra alternativa.
    viaHook: perVia.get('hook') || 0,
    percentPersona,
    // Criteri del pilot (validacio-equip.md §C1): els dos llindars per separat, no combinats
    // -per davall de qualsevol dels dos, el problema és el mecanisme, no la idea.
    criteri: {
      volum: total >= 15,
      honestedat: percentPersona >= 40,
    },
  };
}

/**
 * Retard de la cua d'auditoria (`.claude/auditoria-pendents.log`).
 *
 * Des que l'auditor va deixar de ser un hook d'agent (2026-08-06), `revisada` no la produïx cap
 * automatisme sinó una persona que executa `/ua-skills:auditoria`. El mode de fallada ha canviat
 * de forma: abans l'auditor petava i es notava en l'acte; ara la cua creix en silenci i «cap
 * entrada nova» pot voler dir «ningú l'ha buidada». Sense esta secció, l'informe no distingix eixe
 * cas de «no hi havia res a registrar», que és exactament el forat que `marca-auditoria.sh` va
 * obrir un nivell més avall i que allí ja es va considerar inacceptable.
 *
 * El filtre és **per torn**, igual que el pas 2 de `/ua-skills:auditoria`: un torn encuat a `T` de
 * la sessió `S` està cobert només si hi ha una `revisada` d'`S` posterior a `T`. Filtrar per
 * sessió donaria sempre zero pendents en sessions llargues.
 */
function analitzaCua(dirClaude) {
  const fitxerCua = path.join(dirClaude, 'auditoria-pendents.log');
  const fitxerMarques = path.join(dirClaude, 'auditoria-sessions.log');

  const cua = llig(fitxerCua);
  const marques = llig(fitxerMarques);
  if (cua === null && marques === null) return null;

  // Última `revisada` per sessió. Les marques de temps les escriu el mateix `date` de la mateixa
  // màquina en els dos fitxers, així que comparar cadenes ja és comparar cronologia.
  const darreraRevisada = new Map();
  let fiTorn = 0;
  let revisades = 0;
  for (const linia of (marques || '').split('\n')) {
    const m = linia.match(RE_MARCA);
    if (!m) continue;
    const [, instant, tipus, sessio] = m;
    if (tipus === 'fi-torn') fiTorn += 1;
    if (tipus !== 'revisada') continue;
    revisades += 1;
    if (!darreraRevisada.has(sessio) || instant > darreraRevisada.get(sessio)) {
      darreraRevisada.set(sessio, instant);
    }
  }

  const pendents = [];
  for (const linia of (cua || '').split('\n')) {
    if (!linia.trim()) continue;
    const [instant, sessio] = linia.split('\t');
    if (!instant || !sessio) continue;
    // `marca-auditoria.sh` només guarda els 12 primers caràcters de l'id: comparació per prefix.
    const coberta = darreraRevisada.get(sessio.slice(0, 12));
    if (!coberta || instant > coberta) pendents.push({ instant, sessio });
  }

  const sessionsPendents = new Set(pendents.map((p) => p.sessio));
  return {
    adoptada: cua !== null,
    torns: pendents.length,
    sessions: sessionsPendents.size,
    mesAntic: pendents.length ? pendents.map((p) => p.instant).sort()[0] : null,
    fiTorn,
    revisades,
    // Des de la 1.36.0, per a `recorda-auditoria.js` (hooks-plantilla): quins torns són i de quina
    // sessió, i quines sessions (prefix de 12) s'han auditat alguna volta. Additiu: els consumidors
    // anteriors no els miren.
    detall: pendents,
    sessionsRevisades: [...darreraRevisada.keys()],
  };
}

function informe(fitxer, dirClaude) {
  const contingut = llig(fitxer);
  const dades = contingut ? analitza(contingut) : null;
  const cua = analitzaCua(dirClaude);

  if (process.argv.includes('--json')) {
    process.stdout.write(
      JSON.stringify({ fitxer, existeix: !!contingut, dades, cua }, null, 2) + '\n'
    );
    return;
  }

  if (!contingut) {
    console.log(`Sense ${fitxer} en este projecte -no s'ha adoptat el registre d'errors ací.`);
    return;
  }

  if (!dades.total) {
    console.log(`${fitxer} existix però no té cap entrada encara.`);
  } else {
    console.log(`Registre d'errors — ${fitxer}`);
    console.log(
      `${dades.total} entrades · ${dades.viaAuditor} de l'auditor independent · ${dades.percentPersona}% detecta: persona\n`
    );

    console.log('Per tipus:');
    for (const { tipus, n } of dades.perTipus) console.log(`  ${tipus.padEnd(10)} ${String(n).padStart(4)}`);

    console.log('\nPer qui ho detecta:');
    for (const { detecta, n } of dades.perDetecta) console.log(`  ${detecta.padEnd(10)} ${String(n).padStart(4)}`);

    // `agent-principal` vs la resta és la mesura del biaix: quant s'estava deixant qui és alhora
    // subjecte i redactor del registre.
    console.log('\nPer qui l\'escriu (via):');
    for (const { via, n } of dades.perVia) console.log(`  ${via.padEnd(16)} ${String(n).padStart(4)}`);

    if (dades.perPeca.length) {
      console.log('\nPer peça (EINES i components nostres):');
      for (const { peca, n } of dades.perPeca) console.log(`  ${peca.padEnd(20)} ${String(n).padStart(4)}`);
      console.log('  -> La mateixa peça en dos projectes distints és el senyal de promoció al catàleg.');
    }
  }

  informeCua(cua);

  if (!dades.total) return;

  console.log('\nCriteri del pilot (validacio-equip.md §C1):');
  console.log(`  ${dades.criteri.volum ? '✓' : '✗'} ≥15 entrades (${dades.total})`);
  console.log(`  ${dades.criteri.honestedat ? '✓' : '✗'} ≥40% detecta: persona (${dades.percentPersona}%)`);
  if (!dades.criteri.volum || !dades.criteri.honestedat) {
    console.log('  -> Per davall de qualsevol dels dos, el problema és el mecanisme, no la idea.');
  }
  if (cua && cua.torns > 0) {
    console.log(
      `  -> Amb ${cua.torns} torns sense auditar, cap dels dos llindars és concloent encara: executa \`/ua-skills:auditoria\` abans de llegir-los.`
    );
  }
}

function informeCua(cua) {
  if (!cua || !cua.adoptada) return;

  console.log("\nCua d'auditoria (.claude/auditoria-pendents.log):");
  if (cua.torns === 0) {
    console.log(`  cap torn pendent · ${cua.revisades} auditories fetes sobre ${cua.fiTorn} torns`);
    return;
  }
  const sessions = `${cua.sessions} ${cua.sessions === 1 ? 'sessió' : 'sessions'}`;
  console.log(`  ${cua.torns} torns pendents en ${sessions} · el més antic: ${cua.mesAntic}`);
  console.log(`  ${cua.revisades} auditories fetes sobre ${cua.fiTorn} torns registrats`);
  console.log("  -> Executa `/ua-skills:auditoria` en este projecte: fins llavors, el que falta al");
  console.log('     registre no vol dir que no passara res.');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const iFitxer = args.indexOf('--fitxer');
  const fitxer = iFitxer !== -1 && args[iFitxer + 1] ? args[iFitxer + 1] : PER_DEFECTE;
  const iClaude = args.indexOf('--claude');
  const dirClaude = iClaude !== -1 && args[iClaude + 1] ? args[iClaude + 1] : DIR_CLAUDE_PER_DEFECTE;
  informe(fitxer, dirClaude);
}

module.exports = { analitza, analitzaCua, llig };
