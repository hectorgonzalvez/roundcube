#!/usr/bin/env node
/**
 * PreToolUse hook (Bash i PowerShell): para dos ordes que l'eina `Bash` executa sense error però amb un
 * resultat distint del que s'ha escrit.
 *
 * 1. `node -e "…"` (o `-p`, `--eval`, `--print`) amb una cometa inversa dins de les cometes
 *    dobles. Bash la llig com a substitució d'orde: el text entre cometes inverses s'executa i
 *    desapareix del script. Un comentari CSS perd paraules, un `return` queda buit, i els tests
 *    passen igual.
 * 2. Un here-string de PowerShell (`@'` … `'@` o `@"` … `"@`) dins de l'eina `Bash`. Bash no el
 *    coneix: el pren per text literal, i un missatge de commit queda amb l'assumpte «@».
 *
 * Per què bloqueja, contra la regla de nàixer en avís: el dany és silenciós (cap error, cap test
 * en roig), i en `ua-ds-fusio` es va repetir quatre vegades amb l'entrada anterior del registre
 * d'errors que ja ho descrivia. La quarta ho diu: «el registre no es llig per a decidir». Un avís
 * es llig igual de poc. El motiu del bloqueig diu què fer en lloc d'això, i l'agent ho reescriu.
 *
 * Retorna `permissionDecision: deny` i mai `allow`: un `allow` s'enduria les regles `ask` de
 * `permissions.snippet.json` (mateix motiu que `bloqueja-main.sh`).
 *
 * A més, AVISA (mai bloqueja) quan una orde de git descarta faena de l'arbre -`reset --hard`,
 * `checkout -- <ruta>`, `checkout .`, `restore` sobre l'arbre, `stash -u`, `clean -f`- i l'arbre té
 * canvis sense commitejar. Origen: un `stash -u` + `pop` que va perdre un fitxer sense seguiment de
 * 690 línies sense que `git status` en diguera res (`ua-ds-fusio`), i un `checkout <branca> -- .` sobre
 * canvis sense commitejar (`cdp`). Avisa i no bloqueja perquè sovint és el que es vol: l'avís demana
 * mirar què es perdria i dir-ho, que és el pas que es va saltar les dos vegades.
 *
 * Cobertura: les dos regles que bloquegen, només en l'eina `Bash` (en `PowerShell` la cometa
 * inversa és el caràcter d'escapada i el here-string és vàlid); l'avís de git, en les dos. Un
 * `node -e` dins de `bash -c '…'` o d'un script `.sh` no el veu.
 *
 * Interruptor: `UA_GUARDA_SHELL=0` el desactiva.
 *
 * Registre: cada bloqueig i el primer silenci de cada sessió van a
 * `ci-plantilla/registre-disparadors.js`. Sense l'script no fa res.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function compta(resultat, e, regla) {
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => path.join(c, 'registre-disparadors.js'))
      .find((f) => fs.existsSync(f));
    if (on) require(path.resolve(on)).registraHook('guarda-shell', resultat, { sessio: e.session_id || null, ...(regla ? { regla } : {}) });
  } catch {
    /* el registre no pot trencar el hook */
  }
}

/**
 * El contingut de la cadena entre cometes dobles que comença a `inici` (just després de la
 * cometa d'obertura), o tot fins al final si no es tanca. Respecta `\"`, `\\` i `\``.
 */
function cadenaDoble(ordre, inici) {
  let i = inici;
  let text = '';
  while (i < ordre.length && ordre[i] !== '"') {
    if (ordre[i] === '\\' && i + 1 < ordre.length) {
      text += ordre[i] + ordre[i + 1];
      i += 2;
      continue;
    }
    text += ordre[i];
    i += 1;
  }
  return text;
}

// `node`, opcions abans de l'avaluació incloses (`node --input-type=module -e`), i l'argument
// entre cometes dobles. `node.exe` també: en Windows és el mateix programa.
const NODE_EVAL = /(?:^|[\s;&|(])node(?:\.exe)?(?:\s+--?[\w-]+(?:=\S+)?)*?\s+(?:-e|-p|--eval|--print)\s+"/g;

/** true si algun `node -e "…"` de l'orde porta una cometa inversa sense escapar. */
function nodeEvalAmbCometaInversa(ordre) {
  for (const m of ordre.matchAll(NODE_EVAL)) {
    const text = cadenaDoble(ordre, m.index + m[0].length);
    if (/(?:^|[^\\])(?:\\\\)*`/.test(text)) return true;
  }
  return false;
}

// Obertura al final d'una línia i tancament al principi d'una línia posterior: la forma exacta del
// here-string de PowerShell. Una crida a `powershell`/`pwsh` des de Bash el pot portar de veres.
const HERE_STRING = /@(['"])[ \t]*\r?\n[\s\S]*?\r?\n\1@/;
const CRIDA_POWERSHELL = /(?:^|[\s;&|(])(?:powershell|pwsh)(?:\.exe)?\b/i;

function hereStringPowerShell(ordre) {
  return HERE_STRING.test(ordre) && !CRIDA_POWERSHELL.test(ordre);
}

// Ordes de git que descarten faena de l'arbre de treball. Només avisen, i només si n'hi ha.
// `git -C <ruta>` i altres opcions globals abans del subcomandament també compten.
const GIT = String.raw`(?:^|[\s;&|(])git(?:\.exe)?(?:\s+(?:-C\s+\S+|-c\s+\S+|--?[\w-]+(?:=\S+)?))*\s+`;
const DESCARTEN = [
  ['git reset --hard', new RegExp(GIT + String.raw`reset\b[^;&|\n]*\s--hard\b`)],
  ['git checkout --', new RegExp(GIT + String.raw`checkout\b[^;&|\n]*\s--(?:\s|$)`)],
  ['git checkout .', new RegExp(GIT + String.raw`checkout\s+\.(?:\s|$)`)],
  // `restore --staged` només trau de l'índex; amb `--worktree` (o sense cap dels dos) toca l'arbre.
  ['git restore', { test: (o) => [...o.matchAll(new RegExp(GIT + String.raw`restore\b([^;&|\n]*)`, 'g'))].some((m) => !/\s(?:--staged|-S)\b/.test(m[1]) || /\s(?:--worktree|-W)\b/.test(m[1])) }],
  ['git stash -u', new RegExp(GIT + String.raw`stash\b[^;&|\n]*\s(?:-u|--include-untracked|-a|--all)\b`)],
  ['git clean -f', new RegExp(GIT + String.raw`clean\b[^;&|\n]*\s-[a-zA-Z]*f`)],
];

/** El nom de la primera orde de l'ordre que descarta faena, o null. */
function ordreQueDescarta(ordre) {
  const t = DESCARTEN.find(([, re]) => re.test(ordre));
  return t ? t[0] : null;
}

/** Quants canvis té l'arbre sense commitejar, i quants són fitxers sense seguiment; null fora de git. */
function canvisPendents() {
  try {
    const eixida = require('child_process').execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    const linies = eixida.split('\n').filter(Boolean);
    return { total: linies.length, sensSeguiment: linies.filter((l) => l.startsWith('??')).length };
  } catch {
    return null;
  }
}

function avisDescarta(descarta, p) {
  const sense = p.sensSeguiment ? `, ${p.sensSeguiment} d'ells sense seguiment` : '';
  let text =
    `guarda-shell: \`${descarta}\` descarta faena de l'arbre, i l'arbre té ${p.total} canvi(s) sense commitejar${sense}. ` +
    'Abans de continuar, mira `git status` i `git diff`, i digues-li a la persona què es perdria. ' +
    "Si només volies comprovar alguna cosa en net, copia els fitxers concrets en lloc de buidar l'arbre. No és un bloqueig.";
  if (descarta === 'git stash -u')
    text +=
      ' Si uses `stash -u`, després del `pop` comprova que els fitxers sense seguiment hi tornen a ser: `git status` no avisa si en falta un.';
  return text;
}

const MOTIUS = {
  'node-e-cometa-inversa':
    'guarda-shell: `node -e "…"` porta una cometa inversa dins de les cometes dobles, i Bash la ' +
    "llig com a substitució d'orde: el text entre cometes inverses s'executa i desapareix del script, " +
    'sense cap error. Escriu el script en un fitxer amb Write i executa `node fitxer.js`, o passa\'l ' +
    "per un heredoc amb el delimitador entre cometes simples (`node <<'EOF'` … `EOF`).",
  'here-string-powershell':
    "guarda-shell: això és un here-string de PowerShell (`@'` … `'@`), i esta eina és Bash, que el " +
    'pren per text literal: el resultat porta les arroves dins. En Bash, el text de diverses línies va ' +
    "en un heredoc amb el delimitador entre cometes simples (`git commit -F - <<'EOF'` … `EOF`).",
};

function main() {
  let e;
  try {
    e = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  if (process.env.UA_GUARDA_SHELL === '0') return;
  if (!e || (e.tool_name !== 'Bash' && e.tool_name !== 'PowerShell')) return;
  const ordre = e.tool_input && e.tool_input.command;
  if (typeof ordre !== 'string') return;

  // Les dos regles que bloquegen són de Bash: en PowerShell, la cometa inversa i el here-string
  // són vàlids.
  const regla =
    e.tool_name !== 'Bash'
      ? null
      : nodeEvalAmbCometaInversa(ordre)
        ? 'node-e-cometa-inversa'
        : hereStringPowerShell(ordre)
          ? 'here-string-powershell'
          : null;
  if (!regla) {
    const descarta = ordreQueDescarta(ordre);
    const pendents = descarta ? canvisPendents() : null;
    if (pendents && pendents.total > 0) {
      compta('avis', e, descarta);
      process.stdout.write(
        JSON.stringify({
          systemMessage: `Hook: \`${descarta}\` amb ${pendents.total} canvi(s) sense commitejar a l'arbre.`,
          hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: avisDescarta(descarta, pendents) },
        })
      );
      return;
    }
    compta('silenci', e);
    return;
  }
  compta('bloqueig', e, regla);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: MOTIUS[regla],
      },
    })
  );
}

main();
process.exit(0);
