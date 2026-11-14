'use strict';
/**
 * Quins scripts de `.claude/hooks/` nomena la configuració del projecte (`.claude/settings.json` i
 * `.claude/settings.local.json`), i quin nom gasta cada script per a anotar-se al registre de
 * disparadors. No és un check: el carreguen `comprova-desfasament.js` (script sense connectar,
 * entrada sense script) i `registre-disparadors.js` (hook connectat que no deixa cap línia).
 *
 * Per què fa falta: en `PreToolUse`, un script que no existix o que peta deixa passar l'acció, i un
 * script copiat que ningú ha fusionat al `settings.json` no corre mai. Cap de les dos coses deixa
 * rastre, i fins ara cap peça del kit les veia.
 *
 * Un `settings*.json` que no és JSON vàlid es descarta en silenci: eixe cas ja el diu
 * `comprova-higiene.js`, i ací no se'n pot traure res.
 */
const fs = require('fs');
const path = require('path');

const FITXERS_SETTINGS = ['settings.json', 'settings.local.json'];
const RUTA_HOOK = /\.claude[\\/]+hooks[\\/]+([A-Za-z0-9_.-]+)/g;

function commandsDe(config) {
  const eixida = [];
  const hooks = config && typeof config === 'object' ? config.hooks : null;
  if (!hooks || typeof hooks !== 'object') return eixida;
  for (const grups of Object.values(hooks)) {
    if (!Array.isArray(grups)) continue;
    for (const grup of grups) {
      for (const h of (grup && Array.isArray(grup.hooks) ? grup.hooks : [])) {
        if (h && typeof h.command === 'string') eixida.push(h.command);
      }
    }
  }
  return eixida;
}

/**
 * @param {string} arrel directori del projecte
 * @returns {{ llegits: string[], scripts: Map<string, string[]> }}
 *   `llegits`: els `settings*.json` que s'han pogut llegir; buit vol dir «no se sap res».
 *   `scripts`: nom de fitxer de `.claude/hooks/` -> settings que el nomenen.
 *   `relatius`: els mateixos, però només els que es criden amb ruta relativa i sense
 *   `$CLAUDE_PROJECT_DIR`. El cwd de Bash persistix entre ordes: després d'un `cd demo`, la ruta
 *   `.claude/hooks/x.sh` es busca dins de `demo/`, el hook falla i, com que no bloqueja mai, en
 *   silenci (`ua-ds-fusio`, 2026-08-11: la guarda de secrets i la de docmap no corrien).
 */
function hooksConnectats(arrel) {
  const llegits = [];
  const scripts = new Map();
  const relatius = new Map();
  for (const nom of FITXERS_SETTINGS) {
    const ruta = path.join(arrel, '.claude', nom);
    let config;
    try {
      if (!fs.existsSync(ruta)) continue;
      config = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch (e) {
      continue;
    }
    llegits.push(nom);
    for (const command of commandsDe(config)) {
      for (const m of command.matchAll(RUTA_HOOK)) {
        if (!scripts.has(m[1])) scripts.set(m[1], []);
        if (!scripts.get(m[1]).includes(nom)) scripts.get(m[1]).push(nom);
        // Precedida de `/` o `\` és part d'una ruta absoluta (`~/.claude/hooks`): no depén del cwd.
        const abans = m.index ? command[m.index - 1] : '';
        if (!/CLAUDE_PROJECT_DIR/.test(command) && !/[\\/]/.test(abans)) {
          if (!relatius.has(m[1])) relatius.set(m[1], []);
          if (!relatius.get(m[1]).includes(nom)) relatius.get(m[1]).push(nom);
        }
      }
    }
  }
  return { llegits, scripts, relatius };
}

/**
 * El nom amb què un script s'anota al registre de disparadors (`registraHook('x'` en JS,
 * `"$r" hook x` en shell), o null si no s'hi anota: una còpia anterior a `hooks-plantilla` 5.28.0
 * o un hook que no avisa ni bloqueja.
 */
function nomAlRegistre(rutaScript) {
  try {
    const text = fs.readFileSync(rutaScript, 'utf8');
    const m = text.match(/registraHook\(\s*['"]([\w-]+)['"]/) || text.match(/"\$r"\s+hook\s+([\w-]+)/);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

module.exports = { hooksConnectats, nomAlRegistre };
