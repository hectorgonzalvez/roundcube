#!/usr/bin/env node
/**
 * Oculta els secrets probables de l'eixida de les eines ABANS que arribe al model.
 *
 * Què fa
 * ------
 * Quan una eina acaba (`Bash`, `PowerShell`, `Read`, `Grep`), recorre la seua resposta i substituïx
 * cada valor amb forma de secret per `[secret ocultat: <motiu>]`: la contrasenya d'una cadena de
 * connexió en un `git log -p`, un token en un log, una clau en l'eixida de `env`. El nom de la clau
 * es queda; el valor no entra a la conversa i, per tant, tampoc a cap transcripció ni informe.
 * Torna la resposta amb la mateixa forma (`updatedToolOutput`): Claude Code descarta una
 * reescriptura que no encaixa amb la forma de l'eina i hi posa l'original.
 *
 * Per què no porta patrons propis
 * -------------------------------
 * Els patrons i les excepcions són els de `ci-plantilla/patrons-secrets.js`, els mateixos que
 * aplica `comprova-secrets.js` al commit i a la CI. Un fals positiu es corregix allí, i canvia
 * alhora en els tres llocs.
 *
 * Per què no naix en avís
 * -----------------------
 * Un avís arribaria tard: quan el model el llig, el secret ja és a la conversa. No bloqueja res -
 * l'orde s'ha executat i la resta de l'eixida arriba sencera-, i el cost d'un fals positiu és que el
 * model no veu un valor que no era secret: la persona el pot mirar ella mateixa.
 *
 * Cobertura: per quins camins NO passa
 * -------------------------------------
 * Passa per l'eixida de Bash, PowerShell, Read i Grep. No passa per les eines MCP, per la telemetria
 * OpenTelemetry de Claude Code (registra l'eixida original), ni per Codex (no té este hook); un
 * fitxer de secrets llegit sencer el para abans `permissions.snippet.json` (`deny` per ruta).
 *
 * Transcripcions de sessió: també dades personals
 * -----------------------------------------------
 * Si l'eina toca una transcripció (`.claude/projects/` en qualsevol camp de l'entrada), també
 * s'apliquen els patrons de `ci-plantilla/patrons-dades-personals.js` (DNI i NIE). Un prompt que
 * `revisa-prompt.js` ha parat no arriba al model, però queda escrit a la transcripció local, i
 * l'auditoria del registre d'errors la llig sencera: sense açò, la dada parada arribaria al model
 * per la porta del darrere. Només en transcripcions, i no en tot el que es llig, perquè el codi
 * porta DNI de prova legítims (fixtures) i ocultar-los trencaria la faena.
 *
 * Codis d'eixida
 * --------------
 *   0 → sempre. Sense troballes no escriu res: una reescriptura idèntica competiria amb la d'un
 *       altre hook (s'executen en paral·lel i guanya l'últim) i en podria esborrar una de real.
 *
 * Sense bypass: si el model necessita un valor ocultat, el demana a la persona.
 *
 * Registre: cada ocultació (amb els motius) i la primera eixida neta de cada sessió van a
 * `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a decidir si es retira, es modifica o
 * s'estén. Mai el valor: només el nom del patró. Sense l'script, no anota res.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// Mateixes dues rutes que `comprova-edicio.js`: la còpia de `ci-plantilla/` a l'arrel del
// projecte, o dins de `kit-si-ua/` si s'ha adoptat el kit sencer.
const CARPETES = ['ci-plantilla', 'kit-si-ua/ci-plantilla'];

// Una transcripció de Claude Code viu a `~/.claude/projects/<projecte>/<sessió>.jsonl`. Es mira el
// JSON sencer de l'entrada (ruta d'un Read, `path` d'un Grep, l'orde d'un Bash) i amb les dos barres.
const TRANSCRIPCIO_RE = /\.claude[\\/]+projects[\\/]/i;
function esTranscripcio(entradaEina) {
  try {
    return TRANSCRIPCIO_RE.test(JSON.stringify(entradaEina || {}));
  } catch {
    return false;
  }
}

function carrega(nom) {
  for (const c of CARPETES) {
    const p = path.resolve(c, nom);
    if (fs.existsSync(p)) {
      try {
        return require(p);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function carregaPatrons() {
  for (const c of CARPETES) {
    const p = path.resolve(c, 'patrons-secrets.js');
    if (fs.existsSync(p)) return require(p);
  }
  return null;
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. Sense l'script, o amb una còpia anterior a la 1.55.0, no fa res.
function compta(resultat, dades) {
  try {
    const on = CARPETES.map((c) => path.resolve(c, 'registre-disparadors.js')).find((f) => fs.existsSync(f));
    if (on) require(on).registraHook('oculta-secrets-eixida', resultat, dades);
  } catch (e) {
    /* el registre no pot trencar el hook */
  }
}

// Recorre la resposta i torna una còpia amb la mateixa forma. `base64` és el contingut d'una
// imatge o d'un PDF: no és text que el model llija, i passar-hi les regex només costa temps.
function recorre(valor, oculta, trobades) {
  if (typeof valor === 'string') {
    const r = oculta(valor);
    trobades.push(...r.trobades);
    return r.text;
  }
  if (Array.isArray(valor)) return valor.map((v) => recorre(v, oculta, trobades));
  if (valor && typeof valor === 'object') {
    const copia = {};
    for (const [k, v] of Object.entries(valor)) copia[k] = k === 'base64' ? v : recorre(v, oculta, trobades);
    return copia;
  }
  return valor;
}

// Sense `process.exit()` després d'escriure: en Windows l'escriptura a una canonada és asíncrona i
// l'eixida es podria tallar. Cada camí acaba tornant de `principal`, i el codi és sempre 0.
function principal(entrada) {
  let esdeveniment;
  try {
    esdeveniment = JSON.parse(entrada);
  } catch {
    return;
  }
  if (!esdeveniment || esdeveniment.tool_response === undefined) return;

  const patrons = carregaPatrons();
  if (!patrons || typeof patrons.oculta !== 'function') return;
  const personals = esTranscripcio(esdeveniment.tool_input) ? carrega('patrons-dades-personals.js') : null;
  const oculta =
    personals && typeof personals.oculta === 'function'
      ? (text) => {
          const a = patrons.oculta(text);
          const b = personals.oculta(a.text);
          return { text: b.text, trobades: [...a.trobades, ...b.trobades] };
        }
      : patrons.oculta;

  const trobades = [];
  const resposta = recorre(esdeveniment.tool_response, oculta, trobades);
  const sessio = esdeveniment.session_id || null;
  if (!trobades.length) return compta('silenci', { sessio });

  const motius = [...new Set(trobades)].join(', ');
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        updatedToolOutput: resposta,
        additionalContext:
          `oculta-secrets-eixida: ${trobades.length} valor(s) amb forma de secret o de dada personal s'han ` +
          `substituït per [secret ocultat] o [dada personal ocultada] en l'eixida de ${esdeveniment.tool_name || "l'eina"} (${motius}). ` +
          'No intentes llegir-los per un altre camí; si el valor fa falta, demana a la persona que el mire ella.',
      },
    })
  );
  compta('oculta', {
    sessio,
    fitxer: (esdeveniment.tool_input && esdeveniment.tool_input.file_path) || null,
    regla: [...new Set(trobades)].sort().join('+'),
  });
}

let entrada = '';
process.stdin.on('data', (c) => (entrada += c));
process.stdin.on('end', () => principal(entrada));
