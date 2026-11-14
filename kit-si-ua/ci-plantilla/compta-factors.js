#!/usr/bin/env node
/**
 * Els factors que fan créixer la càrrega de cada faena de `doc-projecte/producte/`, comptats dels artefactes
 * de producte: la fitxa de partida de la secció «Estimació» del `pla.md`
 * (`ua-planificador/references/estimacio.md`). No és un check: informa i acaba sempre en 0.
 *
 * Per què un script: l'estimació per fases (disseny, programació, validació humana) partix de
 * comptar artefactes, voltes de revisió, RF, rols i criteris per tipus de prova. Comptats a mà, dos
 * analistes obtenen fitxes diferents de la mateixa faena; comptats ací, la mateixa. La mida de
 * cada entrega (Baixa, Mitjana, Alta) i els motius continuen sent de qui estima: l'script no en
 * posa cap, ni cap hora.
 *
 * Per a cada carpeta de faena amb PRD, propi o del projecte (`projecte/prd.md`; amb este, només
 * compten els RF que cita el `pla.md` de la faena). Els lectors són els de `producte.js`, els
 * mateixos de `comprova-tracabilitat.js`:
 *   - fase 1, disseny: quins artefactes hi ha, les propostes, les voltes de revisió amb resposta
 *     (`revisio/*.resposta-*.md`), els rols i les tasques, els RF (vigents, imprescindibles,
 *     posteriors, retirats), la dada personal i el tier dels RF (si el PRD porta «Dada i
 *     permís»), i les dependències, riscos i decisions pendents del PRD;
 *   - per spec vigent (fases 2 i 3b): els RF que cobrix, els criteris d'acceptació (fets i
 *     oberts) i el tipus de prova de cada un, segons el seu «_Prova_»; els que només es poden
 *     provar a mà són la base de la fase 3b;
 *   - fase 3b: els plans de proves de persona (`proves/<pantalla>.md`) i les sessions fetes
 *     (`proves/<pantalla>.sessio-<data>.md`), que són els cicles.
 *
 * El que el document no porta es diu «no consta»; mai es deduïx.
 *
 * Sense `--dir`, la carpeta la resol disseny-kit.js, com a `comprova-tracabilitat.js`:
 * `doc-projecte/producte/`, o `docs/producte/` en un projecte anterior a kit-projecte 3.0.0.
 *
 * Ús:  node kit-si-ua/ci-plantilla/compta-factors.js [--dir doc-projecte/producte] [--json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { RF_RE, barres, llegixPrd, posteriors, llegixSpecs, vigents, ambitsDe, llegixEntregues } = require('./producte.js');

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
const json = process.argv.includes('--json');

if (!fs.existsSync(dirArrel)) {
  console.log(`No hi ha ${dirArrel}: res a comptar.`);
  // Una fitxa buida perquè els artefactes s'han quedat a l'altre disseny del kit (una migració a
  // mitges) faria estimar sobre res. Es diu.
  const altra = disseny && !process.argv.includes('--dir') ? disseny.barres(disseny.rutaAltra('.', 'producte')) : null;
  if (altra && fs.existsSync(altra)) {
    console.log(`AVÍS: però hi ha ${altra}, en l'altre disseny del kit -no s'ha comptat. Mou-la a ${dirArrel}.`);
  }
  process.exit(0);
}
// Cada faena amb el PRD que fa servir: el seu o el del projecte (`projecte/prd.md`).
const faenes = ambitsDe(dirArrel).flatMap(a => a.faenes.map(faena => ({ faena, fitxerPrd: a.prd })));
if (!faenes.length) {
  console.log(`Cap faena amb PRD a ${dirArrel}: res a comptar.`);
  process.exit(0);
}

// El tipus de prova, del text de «_Prova_» de cada criteri. Un criteri en pot nomenar més d'un.
// «humana» és el que cap màquina no comprova: la base de la fase 3b.
const TIPUS = [
  ['e2e', /\bE2E\b/i],
  ['component', /\bcomponent\b/i],
  ['servei', /\b(adaptador|servei|contracte|resposta|ruta|API)\b/i],
  ['unitari', /\bunitari\b/i],
  ['captura', /\bcaptura\b/i],
  ['humana', /\b(a mà|manual|ua-review|ua-ux-review|ua-accessibilitat-wcag|lector de pantalla|sessió)\b/i],
];
const AUTOMATICS = new Set(['e2e', 'component', 'servei', 'unitari']);

function tipusDe(text) {
  const prova = text.slice(text.indexOf('_Prova_'));
  return TIPUS.filter(([, re]) => re.test(prova)).map(([t]) => t);
}

/** Els rols de «Tasques per rol», un per cel·la o diversos («Programador, analista»), sense repetir. */
function rolsDe(tasques) {
  const vistos = new Map();
  for (const t of tasques.values()) {
    for (const r of t.rol.split(/,|\s+i\s+|\//).map(s => s.trim()).filter(Boolean)) {
      const clau = r.toLowerCase();
      if (!vistos.has(clau)) vistos.set(clau, r.charAt(0).toUpperCase() + r.slice(1));
    }
  }
  return [...vistos.values()];
}

const llista = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f)).sort() : []);

// Els RF d'un PRD compartit que són d'esta faena: els que el seu `pla.md` cita (la taula «Entregues»,
// el Context Delta, els passos) fora de les línies de faenes posteriors. La taula sola no basta: un
// pla anterior a la taula (cdp, Faena 1) només hi té les entregues últimes. Sense pla, cap.
function rfsDeLaFaena(pla) {
  const mesAvant = posteriors(pla);
  const entregues = (llegixEntregues(pla) || []).flatMap(e => e.rfs);
  return new Set([...entregues, ...(pla.match(RF_RE) || []).filter(rf => !mesAvant.has(rf))]);
}

function comptaFaena({ faena, fitxerPrd }) {
  const prdComplet = llegixPrd(fitxerPrd);
  const fPla = path.join(faena, 'pla.md');
  const pla = fs.existsSync(fPla) ? fs.readFileSync(fPla, 'utf8') : '';
  const mesAvant = posteriors(pla);
  const totes = llegixSpecs(faena);
  const specs = vigents(totes);

  // Amb el PRD del projecte, la fitxa compta només els RF i les tasques d'esta faena: els de la
  // resta de faenes no són càrrega seua.
  const compartit = path.dirname(fitxerPrd) !== faena;
  const seus = compartit ? rfsDeLaFaena(pla) : null;
  const prd = !compartit
    ? prdComplet
    : {
        ...prdComplet,
        rfs: new Map([...prdComplet.rfs].filter(([rf]) => seus.has(rf))),
        tasques: new Map([...prdComplet.tasques].filter(([, t]) => t.rfs.some(rf => seus.has(rf)))),
      };

  const rfs = [...prd.rfs.values()];
  const vius = [...prd.rfs].filter(([, d]) => !d.retirat);
  const ambDada = vius.filter(([, d]) => d.dada !== null);
  const tiers = vius.map(([, d]) => d.tier).filter(Boolean).sort();

  const respostes = llista(path.join(faena, 'revisio'), /\.resposta-.*\.md$/);
  const perArtefacte = {};
  for (const f of respostes) {
    const a = f.slice(0, f.indexOf('.resposta-'));
    perArtefacte[a] = (perArtefacte[a] || 0) + 1;
  }

  const proves = llista(path.join(faena, 'proves'), /\.md$/);
  const plans = proves.filter(f => !/\.sessio-/.test(f));
  const sessions = proves.filter(f => /\.sessio-/.test(f));

  const perSpec = [...specs].map(([fitxer, s]) => {
    const nom = path.basename(fitxer, '.md');
    const tipus = {};
    let nomesHumana = 0;
    for (const c of s.criteris) {
      const ts = tipusDe(c.text);
      for (const t of ts) tipus[t] = (tipus[t] || 0) + 1;
      if (!ts.some(t => AUTOMATICS.has(t))) nomesHumana++;
    }
    return {
      spec: fitxer,
      rfs: s.cobrix.length,
      tasques: s.tasques.length,
      criteris: s.criteris.length,
      fets: s.criteris.filter(c => c.fet).length,
      tipus,
      nomesHumana,
      plaDeProves: plans.includes(`${nom}.md`),
      sessions: sessions.filter(f => f.startsWith(`${nom}.sessio-`)).length,
    };
  });

  const existix = f => fs.existsSync(path.join(faena, f));
  const delProjecte = compartit
    ? ['problema.md', 'prd.md'].filter(f => fs.existsSync(path.join(path.dirname(fitxerPrd), f))).map(f => barres(path.join(path.basename(path.dirname(fitxerPrd)), f)))
    : [];
  return {
    faena: barres(faena),
    prd: barres(fitxerPrd),
    fase1: {
      artefactes: [...delProjecte, ...['problema.md', 'prd.md', 'pla.md', 'specs/flux.md'].filter(existix)],
      specs: { vigents: specs.size, altres: totes.size - specs.size },
      propostes: llista(faena, /^proposta-.*\.md$/).length,
      voltes: { total: respostes.length, perArtefacte },
      rols: rolsDe(prd.tasques),
      tasques: prd.tasques.size,
      rf: {
        vigents: vius.length,
        imprescindibles: vius.filter(([, d]) => /Imprescindible/i.test(d.prioritat)).length,
        posteriors: vius.filter(([, d]) => /Posterior/i.test(d.prioritat)).length,
        // Imprescindibles o no, el `pla.md` els deixa per a una faena posterior a la primera.
        altraFaena: vius.filter(([rf]) => mesAvant.has(rf)).length,
        retirats: rfs.filter(d => d.retirat).length,
      },
      // Sense «Dada i permís» en cap RF, el PRD és anterior al camp: `null`, no zero.
      dadaPersonal: ambDada.length ? ambDada.filter(([, d]) => d.dada === 'personal').length : null,
      tierMaxim: tiers.length ? tiers[tiers.length - 1] : null,
      dependencies: prd.llistes.dependencies?.length ?? null,
      riscos: prd.llistes.riscos?.length ?? null,
      decisionsPendents: prd.llistes.pendents?.length ?? null,
    },
    specs: perSpec,
    fase3b: { plans: plans.length, sessions: sessions.length },
  };
}

const resultat = faenes.map(comptaFaena);

if (json) {
  console.log(JSON.stringify(resultat, null, 2));
  process.exit(0);
}

const consta = v => (v === null || v === undefined ? 'no consta' : String(v));
const ORDRE_TIPUS = ['component', 'e2e', 'servei', 'unitari', 'captura', 'humana'];

for (const r of resultat) {
  const f1 = r.fase1;
  const voltes = Object.entries(f1.voltes.perArtefacte).map(([a, n]) => `${a} ${n}`).join(', ');
  console.log(`## Factors: ${r.faena}

Comptats per \`compta-factors.js\` dels artefactes de producte. Cap mida ni cap hora: les posa qui estima.${
    path.posix.dirname(r.prd) !== r.faena ? `\nPRD del projecte (\`${r.prd}\`): els RF i les tasques són els que cita el \`pla.md\` d'esta faena; dependències, riscos i decisions pendents, els de tot el projecte.` : ''
  }

### Fase 1 — Disseny de producte

| Factor | Valor |
| ------ | ----- |
| Artefactes | ${f1.artefactes.join(', ') || 'cap'} |
| Specs de pantalla | ${f1.specs.vigents} vigents, ${f1.specs.altres} superades o sense «RF que cobrix» |
| Propostes | ${f1.propostes} |
| Voltes de revisió amb resposta | ${f1.voltes.total}${voltes ? ` (${voltes})` : ''} |
| Rols | ${f1.rols.length}${f1.rols.length ? ` (${f1.rols.join(', ')})` : ''} |
| Tasques | ${f1.tasques} |
| RF | ${f1.rf.vigents} vigents (${f1.rf.imprescindibles} imprescindibles, ${f1.rf.posteriors} de prioritat posterior) i ${f1.rf.retirats} retirats |
| RF per a una faena posterior (\`pla.md\`) | ${f1.rf.altraFaena} |
| RF amb dada personal | ${consta(f1.dadaPersonal)} |
| Tier més alt | ${consta(f1.tierMaxim)} |
| Dependències | ${consta(f1.dependencies)} |
| Riscos | ${consta(f1.riscos)} |
| Decisions pendents | ${consta(f1.decisionsPendents)} |

### Per spec vigent — fases 2 i 3b

| Spec | RF | Criteris (fets) | ${ORDRE_TIPUS.join(' | ')} | Només a mà | Pla de proves | Sessions |
| ---- | -: | --------------: | ${ORDRE_TIPUS.map(() => '-:').join(' | ')} | ---------: | ------------- | -------: |`);
  for (const s of r.specs) {
    console.log(
      `| \`${path.basename(s.spec)}\` | ${s.rfs} | ${s.criteris} (${s.fets}) | ${ORDRE_TIPUS.map(t => s.tipus[t] || 0).join(' | ')} | ${s.nomesHumana} | ${s.plaDeProves ? 'sí' : 'no'} | ${s.sessions} |`,
    );
  }
  console.log(`
### Fase 3b — Validació humana

| Factor | Valor |
| ------ | ----- |
| Plans de proves | ${r.fase3b.plans} |
| Sessions fetes (cicles) | ${r.fase3b.sessions} |
`);
}
