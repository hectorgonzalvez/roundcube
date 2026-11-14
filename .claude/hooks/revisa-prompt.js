#!/usr/bin/env node
/**
 * Para el prompt que porta un secret o una dada personal ABANS que arribe al model.
 *
 * Què fa
 * ------
 * En `UserPromptSubmit`, passa el text que la persona ha escrit o apegat pels patrons de
 * `ci-plantilla/patrons-secrets.js` (credencials) i `ci-plantilla/patrons-dades-personals.js` (DNI i
 * NIE amb la lletra de control correcta). Si en troba, torna `{"decision":"block"}`: el prompt no
 * s'envia, i la persona veu el motiu i el patró -mai el valor-. Cap altre hook cobrix este camí:
 * `oculta-secrets-eixida.js` mira l'eixida de les eines, i el commit i la CI, el que es desa.
 *
 * Per què bloqueja des del primer dia
 * -----------------------------------
 * Tot mecanisme del kit naix en avís, i este no pot: un avís arribaria al model junt amb el prompt,
 * quan la dada ja és a la conversa (mateix motiu que `oculta-secrets-eixida.js`), i el hook no pot
 * reescriure el prompt, només deixar-lo passar o parar-lo. A canvi, els patrons són estrets i hi
 * ha bypass. Vore la fila de `revisa-prompt.js` a `hooks-plantilla/README.md` § Hooks disponibles.
 *
 * Bypass
 * ------
 * `[dades-ok] motiu` a l'inici del prompt, per a un fals positiu (un DNI de prova que no és a les
 * excepcions, una cadena d'exemple). Sense motiu no val. Queda anotat com a `bypass` al registre
 * de hooks, amb el patró: si el mateix patró es salta sovint, és el patró el que s'ha de corregir.
 *
 * Cobertura: per quins camins NO passa
 * -------------------------------------
 * Les imatges apegades; un `@fitxer` (el llig `Read`, i allí només s'oculten secrets); el que
 * l'agent llig d'una eina MCP; Codex (no té este hook). I un prompt bloquejat **queda a la
 * transcripció local** (`~/.claude/projects/`, comprovat amb Claude Code 2.1.319): no arriba al
 * model en esta sessió, i `oculta-secrets-eixida.js` emmascara les dades personals quan una
 * transcripció es llig després (l'auditoria del registre d'errors).
 *
 * Interruptor: `UA_REVISA_PROMPT=0`. Sense cap dels dos fitxers de patrons, calla.
 *
 * Codis d'eixida: 0 sempre. La decisió viatja en el JSON de stdout.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CARPETES = ['ci-plantilla', 'kit-si-ua/ci-plantilla'];
const BYPASS_RE = /^\s*\[dades-ok\]([^\n]*)/i;

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

function compta(resultat, dades) {
  try {
    const on = CARPETES.map((c) => path.resolve(c, 'registre-disparadors.js')).find((f) => fs.existsSync(f));
    if (on) require(on).registraHook('revisa-prompt', resultat, dades);
  } catch {
    /* el registre no pot trencar el hook */
  }
}

function principal(entrada) {
  if (process.env.UA_REVISA_PROMPT === '0' || process.env.UA_REVISA_PROMPT === 'false') return;
  let esdeveniment;
  try {
    esdeveniment = JSON.parse(entrada);
  } catch {
    return;
  }
  const prompt = esdeveniment && typeof esdeveniment.prompt === 'string' ? esdeveniment.prompt : '';
  if (!prompt) return;
  const sessio = esdeveniment.session_id || null;

  const secrets = carrega('patrons-secrets.js');
  const personals = carrega('patrons-dades-personals.js');
  if (!secrets && !personals) return;

  const motius = [];
  if (secrets && typeof secrets.oculta === 'function') motius.push(...secrets.oculta(prompt).trobades);
  if (personals && typeof personals.troba === 'function') motius.push(...personals.troba(prompt).map((t) => t.motiu));
  const regla = [...new Set(motius)].sort().join('+');
  if (!motius.length) return compta('silenci', { sessio });

  const bypass = prompt.match(BYPASS_RE);
  if (bypass && bypass[1].trim()) return compta('bypass', { sessio, regla });

  const llista = [...new Set(motius)].join(', ');
  const sensMotiu = bypass ? '\nEl bypass [dades-ok] necessita un motiu després de la marca.' : '';
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `revisa-prompt: el prompt porta ${motius.length} valor(s) amb forma de ${llista}. ` +
        "No s'ha enviat al model. Lleva el valor (o canvia'l per un de fals) i torna a enviar-lo. " +
        `Si és un fals positiu, comença el prompt amb «[dades-ok] motiu».${sensMotiu}`,
    })
  );
  compta('bloqueig', { sessio, regla });
}

let entrada = '';
process.stdin.on('data', (c) => (entrada += c));
process.stdin.on('end', () => principal(entrada));
