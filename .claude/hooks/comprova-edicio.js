#!/usr/bin/env node
/**
 * Checks de CI a la costura de l'edició — AVISA i MAI bloqueja (naix en mode avís).
 *
 * Què fa
 * ------
 * Quan l'agent acaba d'escriure un fitxer, li'l passa amb `--fitxer` als checks de `ci-plantilla/`
 * que en cobrixen l'extensió i, si hi ha troballes, les torna al model:
 *
 *   `.cs` `.pks` `.pkb` `.sql` `.ts`  → comprova-antipatrons.js       (pila de fora de la UA)
 *   `.css` `.html`                   → comprova-tokens-hardcoded.js  (tokens i moviment)
 *   `.vue`                           → els dos
 *   `ca.json` `va.json` (traduccions) → comprova-redaccio.js          (terminologia i microcopy)
 *
 * El model escriu per defecte el que és majoritari al codi públic (`IExceptionHandler`, `#003366`,
 * un `fetch` solt...); sense este hook, se n'assabentava al PR, quan corregir ja costa un cicle de
 * CI. Ara se n'assabenta a la volta següent, quan encara té el fitxer obert.
 *
 * Per què no porta patrons propis
 * -------------------------------
 * Els patrons, les exempcions i la font que cita cada troballa viuen als scripts de CI. Duplicar-los
 * ací faria que hook i CI divergiren a la primera regla nova. Este fitxer només sap quin fitxer
 * s'ha tocat, quin check el cobrix i on és -i, si el check no hi és, ho diu i calla.
 *
 * Per què `PostToolUse` + `exit 2`
 * --------------------------------
 * Mateix repartiment que `protegix-test-correccio.js`: en `PreToolUse` l'`exit 2` bloqueja, i un
 * mecanisme nou no ha guanyat eixe dret (`ci-plantilla/README.md` § «Naixen en avís»). En
 * `PostToolUse` l'edició ja s'ha fet i el 2 és l'únic codi que entrega l'avís al model.
 *
 * Cobertura: per quins camins NO passa
 * -------------------------------------
 * Dispara només en `Write`/`Edit`. Un fitxer escrit per `Bash` (heredoc, `sed -i`, redirecció) no
 * el dispara mai. Ho compensa la CI: els mateixos scripts sobre el diff del PR, que sí que
 * bloquegen. Este hook és el feedback ràpid; la CI, la garantia.
 *
 * Codis d'eixida
 * --------------
 *   0 → res a dir (extensió sense check, exempt, fora del projecte, sense troballes, o sense script).
 *   2 → avís al model amb les troballes. No desfà res.
 *
 * Sense bypass: no bloqueja mai, i per tant no hi ha cap porta a aixecar.
 *
 * Registre: cada avís (amb els checks que l'han donat) i la primera vegada que calla en cada sessió
 * després d'haver passat algun check van a `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a
 * decidir si es retira, es modifica o s'estén. Un `.md` editat no compta: no hi havia res a revisar,
 * i comptar-lo el faria candidat a retirar-se per no haver parlat mai. Sense l'script, no anota res.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Les mateixes extensions que filtra cada script. Filtrar ací evita arrancar un Node per cada
// `.md` editat; el filtre fi (tests, `.d.ts`, exempcions) el fa l'script.
const CHECKS = [
  { script: 'comprova-antipatrons.js', extensions: /\.(cs|pks|pkb|sql|vue|ts)$/ },
  { script: 'comprova-tokens-hardcoded.js', extensions: /\.(css|vue|html)$/ },
  { script: 'comprova-redaccio.js', extensions: /(^|[\\/])(ca|va|ca-ES|ca-valencia)\.json$/ },
];

// Mateixes dues rutes que `recorda-auditoria.js`: la còpia de `ci-plantilla/` a l'arrel del
// projecte, o dins de `kit-si-ua/` si s'ha adoptat el kit sencer.
const CARPETES = ['ci-plantilla', 'kit-si-ua/ci-plantilla'];

let entrada = '';
try {
  entrada = fs.readFileSync(0, 'utf8');
} catch (e) {
  process.exit(0);
}

let ruta = '';
let sessio = null;
try {
  const j = JSON.parse(entrada);
  ruta = (j.tool_input && j.tool_input.file_path) || '';
  sessio = j.session_id || null;
} catch (e) {
  process.exit(0);
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. En `exit` perquè el hook té sis eixides i totes passen per ací. Mai canvia el codi.
const scripts = [];
let revisat = false;
process.on('exit', (codi) => {
  if (codi !== 2 && !revisat) return;
  try {
    const on = CARPETES.map((c) => `${c}/registre-disparadors.js`).find((f) => fs.existsSync(f));
    if (on) {
      require(path.resolve(on)).registraHook('comprova-edicio', codi === 2 ? 'avis' : 'silenci', {
        sessio,
        fitxer: ruta,
        regla: scripts.join('+'),
      });
    }
  } catch (e) {
    /* el registre no pot trencar el hook */
  }
});
const aplicables = CHECKS.filter((c) => c.extensions.test(ruta));
if (!ruta || !aplicables.length) process.exit(0);

// Claude Code passa rutes absolutes; les exempcions dels checks (`^docs/`, `/references/`...) estan
// escrites relatives a l'arrel. Un fitxer de fora del projecte no és cosa d'este projecte.
const relativa = path.relative(process.cwd(), path.resolve(ruta)).split(path.sep).join('/');
if (!relativa || relativa.startsWith('../') || path.isAbsolute(relativa)) process.exit(0);

const troballes = [];
for (const { script } of aplicables) {
  const on = CARPETES.map((c) => `${c}/${script}`).find((s) => fs.existsSync(s));
  if (!on) {
    // stderr amb 0: no arriba al model, però queda al registre del hook. Un guardia que calla
    // sense dir per què és indistingible d'un que no ha trobat res.
    console.error(`comprova-edicio: no trobe ${CARPETES.map((c) => `${c}/${script}`).join(' ni ')}; adopta ci-plantilla/ per a activar-lo.`);
    continue;
  }
  if (!fs.readFileSync(on, 'utf8').includes("'--fitxer'")) {
    // Una còpia sense `--fitxer` l'ignoraria i revisaria el diff sencer contra origin/main.
    console.error(`comprova-edicio: ${on} no té --fitxer (ci-plantilla ≥ 1.37.0); refresca la còpia.`);
    continue;
  }

  const r = spawnSync(process.execPath, [on, '--fitxer', relativa], { encoding: 'utf8' });
  revisat = true;
  if (r.status === 2 || r.error) {
    // L'script no ha pogut ni començar (p. ex. li falta `fitxers.js`): el seu missatge ja diu què fer.
    console.error((r.stderr || String(r.error)).trim());
    continue;
  }

  // Només les troballes i les seues línies de detall; el resum i el consell de `--warn` són per a
  // qui llig la CI, no per al model.
  let dins = false;
  const abans = troballes.length;
  for (const l of (r.stdout || '').split('\n')) {
    if (/^(✖|avís) /.test(l)) {
      dins = true;
      troballes.push(l);
    } else if (dins && /^ {6}\S/.test(l)) {
      troballes.push(l);
    } else {
      dins = false;
    }
  }
  if (troballes.length > abans) scripts.push(script);
}
if (!troballes.length) process.exit(0);

console.error(
  `comprova-edicio: acabes d'escriure ${relativa} i ${scripts.join(' i ')} hi troba el que segueix. ` +
    'Corregix-ho ara, llegint la font que cita cada troballa: els ✖ els bloquejarà la CI al PR ' +
    '(llevat que el projecte l\'execute amb --warn); els «avís» no bloquegen, però són regles o ' +
    'convencions de la UA.\n' +
    troballes.join('\n')
);
process.exit(2);
