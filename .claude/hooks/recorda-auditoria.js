#!/usr/bin/env node
/**
 * Recordatori d'auditoria en `git push` — determinista, AVISA i MAI bloqueja ni audita.
 *
 * Per què existix
 * ---------------
 * La cadència del registre d'errors diu «`/ua-skills:auditoria` en tancar una faena, abans d'obrir
 * el PR». Res no la recordava: la cua creix en silenci, i «cap entrada nova» no distingix «no ha
 * passat res» de «ningú l'ha buidada». Este hook és el recordatori, al moment en què la faena es
 * dona per tancada des de la sessió: el `push`.
 *
 * Per què NO llança l'auditoria (decidit 2026-09-23)
 * --------------------------------------------------
 * L'auditoria va ser un hook d'agent al `Stop` fins al 2026-08-06, i es va traure del camí crític
 * perquè l'accés a eines era intermitent i els seus errors arribaven a l'usuari (vore capçal
 * d'`encua-auditoria.sh`). Llançar-la en un `push` seria el mateix mecanisme amb un altre
 * disparador. A més llig transcripcions senceres: és decisió de qui treballa al projecte, no un
 * efecte lateral. Detectar és determinista; investigar, agentic; autoritzar, de la persona.
 *
 * Què fa
 * ------
 *   - Llig la cua amb `ci-plantilla/analitza-registre-errors.js` (el mateix filtre per torn que
 *     `/ua-skills:telemetria` i `/ua-skills:auditoria`; no el reimplementa).
 *   - Si hi ha torns pendents, avisa el model amb `exit 2` perquè li ho diga a l'usuari. L'avís
 *     li prohibix llançar-la ell.
 *   - **Una volta per sessió** (`.claude/auditoria-recordatoris.log`): un PR porta diversos pushos,
 *     i un recordatori que es repetix es deixa de llegir.
 *   - Els torns de la sessió actual **no compten** si esta sessió ja s'ha auditat alguna volta: el
 *     mateix torn en què s'executa `/ua-skills:auditoria` s'encua en acabar (el `Stop` va després),
 *     i sense esta excepció l'avís saltaria just després d'haver fet el que demana.
 *
 * Codis d'eixida (contracte de `PostToolUse`, mateix repartiment que `comprova-docmap-commit.js`)
 *   0  → res pendent, ja avisat en esta sessió, registre no adoptat o interruptor. Silenci.
 *   2  → avís al model. El push ja s'ha fet: no hi ha res a bloquejar.
 *
 * Depén de `ci-plantilla/analitza-registre-errors.js` (o `kit-si-ua/ci-plantilla/…`). Sense ell,
 * calla. Amb una `ci-plantilla` anterior a la 1.36.0 funciona, però sense l'excepció de la sessió
 * actual (no sap de quina sessió és cada torn).
 *
 * Cobertura: només el `git push` fet des d'una sessió de Claude Code, per l'eina Bash o per
 * l'eina PowerShell (cada una té la seua entrada al snippet, 5.12.0). Un PR obert des de la web de
 * TFS/Azure DevOps, o un push des de l'IDE, no el veu. Com es nota que no funciona: la cua continua
 * visible a `/ua-skills:telemetria`, que no depén d'este hook.
 *
 * Interruptor: `UA_REGISTRE_ERRORS=0`, el mateix que apaga tot el registre d'errors.
 *
 * Registre: cada avís i el primer push de cada sessió amb la cua adoptada van a
 * `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a decidir si es retira, es modifica o
 * s'estén. Sense cua adoptada no anota res: no hi havia res a recordar.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SCRIPTS = [
  'ci-plantilla/analitza-registre-errors.js',
  'kit-si-ua/ci-plantilla/analitza-registre-errors.js',
];
const DIR_CLAUDE = '.claude';
const FITXER_RECORDATORIS = path.join(DIR_CLAUDE, 'auditoria-recordatoris.log');
const RE_PUSH = /\bgit\s+push\b/;

function llegixStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

// Què ha vist `main()`, per al registre de hooks. `armat`: la cua existix i s'ha pogut llegir.
const registre = { sessio: null, armat: false };

function main() {
  const interruptor = process.env.UA_REGISTRE_ERRORS;
  if (interruptor === '0' || interruptor === 'false') return 0;

  let esdeveniment = {};
  const cru = llegixStdin();
  if (cru.trim()) {
    try {
      esdeveniment = JSON.parse(cru);
    } catch (e) {
      return 0;
    }
  }

  // El snippet ja filtra amb `if: Bash(git push*)`; això cobrix `cd x && git push` i qui el
  // registre sense `if`.
  const ordre = (esdeveniment.tool_input && esdeveniment.tool_input.command) || '';
  if (ordre && !RE_PUSH.test(ordre)) return 0;

  const script = SCRIPTS.find((s) => fs.existsSync(s));
  if (!script) return 0;

  let analitzaCua;
  try {
    ({ analitzaCua } = require(path.resolve(script)));
  } catch (e) {
    return 0;
  }
  if (typeof analitzaCua !== 'function') return 0;

  const cua = analitzaCua(DIR_CLAUDE);
  if (!cua || !cua.adoptada) return 0;
  const sessio = typeof esdeveniment.session_id === 'string' ? esdeveniment.session_id : '';
  registre.sessio = sessio || null;
  registre.armat = true;
  if (cua.torns === 0) return 0;

  const prefix = sessio.slice(0, 12);

  if (prefix && fs.existsSync(FITXER_RECORDATORIS)) {
    const ja = fs
      .readFileSync(FITXER_RECORDATORIS, 'utf8')
      .split('\n')
      .some((l) => l.split('\t')[1] === prefix);
    if (ja) return 0;
  }

  let pendents = cua.torns;
  let mesAntic = cua.mesAntic;
  if (Array.isArray(cua.detall) && prefix) {
    const auditada = (cua.sessionsRevisades || []).includes(prefix);
    const compten = cua.detall.filter((p) => !(auditada && p.sessio.slice(0, 12) === prefix));
    pendents = compten.length;
    mesAntic = compten.length ? compten.map((p) => p.instant).sort()[0] : null;
  }
  if (pendents === 0) return 0;

  if (prefix) {
    try {
      fs.appendFileSync(
        FITXER_RECORDATORIS,
        `${new Date().toISOString().slice(0, 19)}\t${prefix}\t${pendents}\n`
      );
    } catch (e) {
      // Sense poder apuntar-ho, avisa igualment: el pitjor cas és repetir l'avís.
    }
  }

  const torns = pendents === 1 ? '1 torn' : `${pendents} torns`;
  process.stderr.write(
    `Registre d'errors: hi ha ${torns} sense auditar (el més antic: ${mesAntic}).\n` +
      `Si esta faena va cap a un PR, digues a l'usuari que llance /ua-skills:auditoria abans ` +
      `d'obrir-lo. NO la llances tu: llig transcripcions senceres i és decisió seua.\n` +
      `(Una volta per sessió. S'apaga amb UA_REGISTRE_ERRORS=0.)\n`
  );
  return 2;
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. Sense l'script, o amb una còpia anterior a la 1.55.0, no fa res. Mai canvia el codi.
function compta(resultat) {
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => path.join(c, 'registre-disparadors.js'))
      .find((f) => fs.existsSync(f));
    if (on) require(path.resolve(on)).registraHook('recorda-auditoria', resultat, { sessio: registre.sessio });
  } catch (e) {
    /* el registre no pot trencar el hook */
  }
}

const codi = main();
if (codi === 2 || registre.armat) compta(codi === 2 ? 'avis' : 'silenci');
process.exit(codi);
