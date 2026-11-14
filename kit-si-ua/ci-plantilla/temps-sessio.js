#!/usr/bin/env node
/**
 * Temps d'agent i temps entre torns d'una branca, llegits de les transcripcions de Claude Code.
 *
 * Per què existix
 * ---------------
 * El Calibratge del `pla.md` (`ua-planificador/references/estimacio.md`) guarda les hores reals
 * que dona la persona. Les transcripcions de Claude Code ja porten, per cada torn, quant ha estat
 * treballant l'agent (`"subtype":"turn_duration"`), i entre un torn i el següent prompt queda el
 * temps en què la persona llegia, revisava o no hi era. Això ajuda a calibrar la mida d'una
 * entrega i dona a qui l'ha feta una referència del que ha pogut dedicar a revisar. **No són les
 * seues hores**: les hores les dona la persona, i este script s'executa després de preguntar-les.
 *
 * Què emet, per branca (la `gitBranch` de la línia que tanca cada torn):
 *   - minuts d'agent actiu: la suma dels torns, menys el temps que l'agent ha esperat una resposta
 *     a una pregunta seua (`AskUserQuestion`), que és temps de la persona;
 *   - minuts en preguntes de l'agent: eixe temps restat, a banda;
 *   - minuts entre torns, en dos trams: fins a 30 min (lectura, revisió, provar) i de més de 30
 *     (pot ser revisió llarga o absència: no es pot saber, i per això no es mescla amb l'altre);
 *   - torns fora d'auto-mode: en eixos, l'agent actiu inclou les esperes de permís.
 *
 * Regla de govern: `ESTANDARDS.md` §10.2. Mateix contracte que `marques-de-temps.js`: cap camp es
 * diu "hores", el JSON porta `aixo_no_son_hores`, i quan no hi ha transcripció la resposta és
 * "no mesurat", mai un zero.
 *
 * El que **no** fa:
 *   - No veu la faena feta en una altra màquina, amb una altra eina (Codex) o amb la sessió
 *     tancada (revisar la PR al navegador). Llig només les transcripcions d'esta màquina.
 *   - No agrega per persona ni llig cap nom: les transcripcions són locals de qui l'executa.
 *   - No compta els subagents a banda: un subagent en primer pla ja cau dins del torn del pare.
 *   - No compta el temps abans del primer prompt ni després de l'últim torn d'una sessió.
 *
 * Ús:  node kit-si-ua/ci-plantilla/temps-sessio.js [--branca <nom>]... [--transcripcions <dir>]
 *                                                  [--json]
 * Sense `--transcripcions`, llig `~/.claude/projects/<directori actual amb '-'>`.
 * Mai bloqueja: eixida 0 sempre que puga córrer.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const LLINDAR_BUIT_MS = 30 * 60000;
const MODES_SENSE_ESPERA = new Set(['auto', 'bypassPermissions']);

const branques = [];
let dirArg = null;
const json = process.argv.includes('--json');
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--branca') branques.push(process.argv[++i]);
  else if (process.argv[i] === '--transcripcions') dirArg = process.argv[++i];
}

// Claude Code nomena la carpeta del projecte canviant cada caràcter no alfanumèric per '-'
// (`D:\programacio\cdp` -> `D--programacio-cdp`).
const dir = dirArg || path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^A-Za-z0-9]/g, '-'));

function nou() {
  return { actiuMs: 0, preguntesMs: 0, curtMs: 0, llargMs: 0, torns: 0, tornsAmbPermis: 0, sessions: new Set(), dies: new Set() };
}

function esPrompt(e) {
  if (e.type !== 'user' || e.isMeta || e.isSidechain || !e.message) return false;
  const c = e.message.content;
  if (typeof c === 'string') return true;
  return Array.isArray(c) && c.some((b) => b.type === 'text') && !c.some((b) => b.type === 'tool_result');
}

const perBranca = new Map();
const acumula = (b) => {
  if (!perBranca.has(b)) perBranca.set(b, nou());
  return perBranca.get(b);
};

let fitxers = [];
try {
  fitxers = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
} catch {
  fitxers = [];
}

for (const f of fitxers) {
  let mode = null;
  let fiTorn = null;
  let brancaTorn = null;
  let preguntesTorn = 0;
  const obertes = new Map();
  for (const linia of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!linia) continue;
    let e;
    try {
      e = JSON.parse(linia);
    } catch {
      continue;
    }
    const t = Date.parse(e.timestamp);
    if (e.type === 'permission-mode' && e.permissionMode) mode = e.permissionMode;

    const contingut = e.message && Array.isArray(e.message.content) ? e.message.content : [];
    for (const b of contingut) {
      if (b.type === 'tool_use' && b.name === 'AskUserQuestion' && !isNaN(t)) obertes.set(b.id, t);
      if (b.type === 'tool_result' && obertes.has(b.tool_use_id)) {
        const d = t - obertes.get(b.tool_use_id);
        obertes.delete(b.tool_use_id);
        if (d > 0) preguntesTorn += d;
      }
    }

    if (e.subtype === 'turn_duration' && typeof e.durationMs === 'number') {
      const r = acumula(e.gitBranch || '(sense branca)');
      const espera = Math.min(preguntesTorn, e.durationMs);
      r.actiuMs += e.durationMs - espera;
      r.preguntesMs += espera;
      r.torns++;
      if (mode && !MODES_SENSE_ESPERA.has(mode)) r.tornsAmbPermis++;
      r.sessions.add(f);
      if (e.timestamp) r.dies.add(e.timestamp.slice(0, 10));
      preguntesTorn = 0;
      fiTorn = isNaN(t) ? null : t;
      brancaTorn = e.gitBranch || '(sense branca)';
      continue;
    }

    if (esPrompt(e) && fiTorn !== null && !isNaN(t)) {
      const buit = t - fiTorn;
      if (buit > 0) {
        const r = acumula(brancaTorn);
        if (buit <= LLINDAR_BUIT_MS) r.curtMs += buit;
        else r.llargMs += buit;
      }
      fiTorn = null;
    }
  }
}

const min = (ms) => Math.round(ms / 60000);
const seleccio = branques.length ? branques : [...perBranca.keys()].sort();
const files = seleccio.map((b) => {
  const r = perBranca.get(b);
  if (!r) return { branca: b, mesurat: false };
  return {
    branca: b,
    mesurat: true,
    min_agent_actiu: min(r.actiuMs),
    min_preguntes_agent: min(r.preguntesMs),
    min_entre_torns_fins_30: min(r.curtMs),
    min_entre_torns_mes_30: min(r.llargMs),
    torns: r.torns,
    torns_fora_auto_mode: r.tornsAmbPermis,
    sessions: r.sessions.size,
    dies: [...r.dies].sort(),
  };
});

const LIMIT =
  'Minuts de les transcripcions d\'esta màquina, no hores treballades: les hores les dona la persona.';

if (json) {
  console.log(JSON.stringify({ transcripcions: dir, sessions_llegides: fitxers.length, aixo_no_son_hores: LIMIT, branques: files }, null, 2));
  process.exit(0);
}

console.log(`transcripcions: ${dir} (${fitxers.length} sessions)`);
if (!fitxers.length) console.log('cap transcripció: no mesurat');
for (const r of files) {
  console.log(`\n${r.branca}`);
  if (!r.mesurat) {
    console.log('  no mesurat: cap torn d\'esta branca a les transcripcions d\'esta màquina');
    continue;
  }
  console.log(`  agent actiu             ${r.min_agent_actiu} min (${r.torns} torns, ${r.sessions} sessions)`);
  console.log(`  preguntes de l'agent    ${r.min_preguntes_agent} min`);
  console.log(`  entre torns, fins a 30  ${r.min_entre_torns_fins_30} min`);
  console.log(`  entre torns, més de 30  ${r.min_entre_torns_mes_30} min (revisió llarga o absència)`);
  if (r.torns_fora_auto_mode) {
    console.log(`  avís: ${r.torns_fora_auto_mode} torns fora d'auto-mode; l'agent actiu hi inclou les esperes de permís`);
  }
}
console.log(`\n${LIMIT}`);
