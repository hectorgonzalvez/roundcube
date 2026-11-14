#!/usr/bin/env node
/**
 * PreToolUse hook (Bash i PowerShell, if: gh pr create*|glab mr create*|az repos pr create*):
 * avisa que s'està a punt d'obrir una PR sense haver passat per `obri-pr` en esta sessió.
 *
 * Per què existix: `obri-pr` és on es pregunten les hores, es proposen els RF i s'omple la
 * descripció amb la plantilla del projecte. Una PR oberta a mà (`gh pr create`) se salta tot això, i
 * ningú ho nota fins que falta l'hora al registre o la secció dels RF. A `cdp` va passar vuit
 * vegades en una sola sessió (2026-11-03): el skill existia i la regla també, però ningú no es
 * recordava d'invocar-lo.
 *
 * NOMÉS AVISA. No retorna mai `permissionDecision` (ni `deny` ni `allow`): un `allow` s'enduria les
 * regles `ask` de `permissions.snippet.json` (mateix motiu que `bloqueja-main.sh`), i un `deny`
 * pararia un hotfix o una PR legítima d'una persona que de veres no vol passar pel skill. L'avís
 * va a l'agent (`additionalContext`: ho ha de dir a la persona abans de continuar) i a la persona
 * (`systemMessage`). Passar a bloquejar és una decisió posterior, amb el recompte del registre.
 *
 * Com sap que `obri-pr` s'ha invocat: busca a la transcripció de la sessió (`transcript_path`) una
 * invocació del skill -la crida a l'eina `Skill` o l'ordre `/obri-pr` escrita per la persona-, amb
 * o sense prefix de connector (`ua-skills:obri-pr`). Un text que només menciona `obri-pr` no
 * compta. Sense transcripció, calla: no pot saber-ho, i un avís fals gasta més que un de perdut.
 *
 * Cobertura: només veu les PR obertes des d'una sessió de Claude Code amb `gh`, `glab` o `az`. Una
 * PR oberta des del navegador o des d'una altra terminal no la veu mai (README.md § «Cobertura dels
 * hooks»). Que `obri-pr` s'haja invocat tampoc no prova que n'haja fet tots els passos.
 *
 * Interruptor: `UA_AVIS_OBRI_PR=0` el desactiva.
 *
 * Registre: cada avís i el primer silenci de cada sessió van a `ci-plantilla/registre-disparadors.js`
 * (≥ 1.55.0), per a decidir si es retira, es modifica o passa a bloquejar. Sense l'script no fa res.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// L'orde, al començament o després d'un separador de shell: no un text que només la cita.
const ORDRE_PR = /(?:^|[\s;&|(])(?:gh\s+pr\s+create|glab\s+mr\s+create|az\s+repos\s+pr\s+create)(?=\s|$)/;

// La crida a l'eina `Skill` (`"skill":"obri-pr"`) o l'ordre de la persona (`<command-name>/obri-pr`).
const INVOCACIO_SKILL = /"skill"\s*:\s*"(?:[^"]*:)?obri-pr"|<command-name>\s*\/?(?:[^<\s]*:)?obri-pr\s*<\/command-name>/;

function compta(resultat, e) {
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => path.join(c, 'registre-disparadors.js'))
      .find((f) => fs.existsSync(f));
    if (on) require(path.resolve(on)).registraHook('avisa-pr-sense-obri-pr', resultat, { sessio: e.session_id || null });
  } catch {
    /* el registre no pot trencar el hook */
  }
}

/** true/false si la transcripció diu que `obri-pr` s'ha invocat; null si no es pot saber. */
function obriPrInvocat(e) {
  if (!e.transcript_path) return null;
  try {
    return INVOCACIO_SKILL.test(fs.readFileSync(e.transcript_path, 'utf8'));
  } catch {
    return null;
  }
}

const MISSATGE =
  "Estàs a punt d'obrir una PR sense haver passat per `obri-pr` en esta sessió. `obri-pr` pregunta les hores " +
  "no anotades (Pas 2), proposa els RF si el projecte en té i omple la descripció amb la plantilla. " +
  "Digues-ho a la persona abans de continuar: pot invocar `/obri-pr`, o confirmar que vol obrir-la a mà " +
  "(un hotfix, per exemple). No és un bloqueig.";

function main() {
  let e;
  try {
    e = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  if (process.env.UA_AVIS_OBRI_PR === '0') return;
  const ordre = e && e.tool_input && e.tool_input.command;
  if (typeof ordre !== 'string' || !ORDRE_PR.test(ordre)) return;

  const invocat = obriPrInvocat(e);
  if (invocat !== false) {
    compta('silenci', e);
    return;
  }
  compta('avis', e);
  process.stdout.write(
    JSON.stringify({
      systemMessage: "Hook: s'obri una PR sense haver invocat `obri-pr` en esta sessió.",
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: MISSATGE },
    })
  );
}

main();
process.exit(0);
