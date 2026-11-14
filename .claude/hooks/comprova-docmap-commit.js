#!/usr/bin/env node
/**
 * Guardia de documentació en `git commit` — versió DETERMINISTA que AVISA i MAI bloqueja.
 *
 * Per què existix
 * ---------------
 * Este guardia era un hook de tipus `agent` (Haiku). Dos problemes acumulats:
 *
 *   1. **Fallava tancat.** Un hook d'agent en mode don't-ask no sempre pot obtindre permisos i no
 *      en demana; quan no podia llegir el diff, denegava el commit. El 2026-08-05 va denegar dos de
 *      quatre commits per no poder executar `git diff`, i el mateix commit repetit sense cap canvi
 *      va passar a la segona. Un guardia no determinista que bloqueja és pitjor que cap guardia.
 *   2. **No necessitava cap model.** Comprovar si un commit que toca `X` inclou també `Y` és
 *      coincidència de patrons contra `docmap.json`. El propi `kit-si-ua/ci-plantilla/
 *      comprova-documentacio.js` ho diu al capçal: l'script és "la garantia", l'agent només era
 *      "el feedback fi". El feedback fi era el que bloquejava i s'equivocava.
 *
 * Repartiment de responsabilitats (decidit 2026-08-06, revisat 2026-08-16)
 * ------------------------------------------------------------------------
 *   AÇÍ (local, `PostToolUse`) → avisa DESPRÉS del commit, que ja ha passat. No bloqueja mai.
 *   CI (`comprova-documentacio.js --base … --head …`) → bloqueja al PR, on interrompre no costa
 *                                el flux de ningú.
 *
 * Per què `PostToolUse` i no `PreToolUse` (2026-08-16)
 * ----------------------------------------------------
 * Este guardia va nàixer en `PreToolUse` avisant amb `exit 1`, sota el supòsit que hi ha una
 * persona mirant el terminal quan es fa el commit. Eixe supòsit ja no es complix:
 *
 *   - En `PreToolUse`, l'stderr d'un `exit 1` es mostra **només a qui programa**; al model no li
 *     arriba res (només `exit 2` li parla, i `exit 2` allí bloqueja el commit).
 *   - Amb la sessió en auto-mode -que és com es treballa hui a `ua-ds-fusio`- ningú llig eixe
 *     avís: passa de llarg i l'agent continua, perquè ni tan sols sap que existix.
 *
 * O siga que l'únic destinatari possible del missatge era el que no el rebia. En `PostToolUse` el
 * commit ja s'ha fet -no hi ha res que bloquejar, la garantia de "mai bloqueja" es complix per
 * construcció- i `exit 2` sí que entrega l'stderr al model, que pot afegir la documentació que
 * falta tot seguit. Qui programa continua veient-ho igual.
 *
 * Codis d'eixida (contracte de `PostToolUse`)
 * -------------------------------------------
 *   0  → tot correcte, o bypass. Silenci.
 *   2  → avís al model. NO desfà ni bloqueja res: el commit ja existix.
 *   1  → no s'usa: en `PostToolUse` no arriba a ningú útil.
 *
 * Cobertura: dispara en el commit, així que veu l'`HEAD` (o l'staged en `PreToolUse`) vinga
 * escrit d'on vinga -Write/Edit, Bash, un altre client de git. El commit ha de passar per una de
 * les dos eines de shell de Claude Code, Bash o PowerShell, que tenen cada una la seua entrada al
 * snippet (5.12.0): un commit fet des de l'IDE no el veu (README.md § "Cobertura dels hooks").
 *
 * Regles heretades del prompt de l'agent que substituïx (no simplificar-les):
 *   - `[no-doc]` obrint o tancant una línia del missatge de commit → bypass immediat. Enmig d'una
 *     frase no compta: així és com se'n parla sense voler invocar-lo (vore `invocaBypass()`).
 *   - Si el commit porta `-- <camins>`, només compten eixos camins, no l'índex sencer. Avaluar
 *     l'índex complet bloquejava commits que no tocaven gens el codi de la regla. En `PostToolUse`
 *     esta regla ja no cal aplicar-la a mà: es llig el commit fet, que conté exactament els camins
 *     que li tocaven. Es conserva per al camí `PreToolUse`, que encara funciona.
 *   - `documentacio` és una DISJUNCIÓ: n'hi ha prou que UN element hi aparega. Llegir-la com a
 *     conjunció va ser un bug real (commit 4da62b8).
 *   - La disjunció es comprova contra la llista COMPLETA de fitxers del commit, sense filtrar
 *     exempcions; les exempcions només filtren què dispara la regla.
 *   - Un element acabat en `/` és un directori: compta si algun fitxer hi penja.
 *   - Una regla amb `nomes_naixement_o_mort: true` només compta els fitxers que naixen o moren
 *     (`ci-plantilla/README.md` § "Regles d'esdeveniment estructural"). Va arribar al mapa el
 *     2026-08-24: fins llavors estes regles acusaven cada edició del cos d'un `SKILL.md`.
 *
 * Registre: cada avís (amb les regles del mapa incomplides), cada `[no-doc]` i el primer commit net
 * de cada sessió amb `docmap.json` van a `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a
 * decidir si es retira, es modifica o s'estén. Un `[no-doc]` compta com a bypass encara que la regla
 * no haguera acusat: és una omissió declarada, la mateixa que compta `/ua-skills:telemetria`.
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mai bloquejar per un error propi: qualsevol excepció ix per exit 0.
function rendirse(motiu) {
  if (process.env.UA_DOCMAP_DEBUG) console.error(`docmap: ${motiu}`);
  process.exit(0);
}

// Igual que rendirse(), però per al cas del bypass explícit: a diferència de la resta de motius
// (que són silenci normal, només visibles amb UA_DOCMAP_DEBUG), l'ús del bypass deixa sempre
// rastre per stderr.
function rendirseBypass(motiu) {
  console.error(`bypass: ${motiu}`);
  registre.resultat = 'bypass';
  process.exit(0);
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. En `exit` perquè el hook té moltes eixides i totes passen per ací. Mai canvia el codi.
// `armat` vol dir que hi ha `docmap.json` i el commit s'ha pogut avaluar: abans d'això, callar no
// és cap ocasió d'actuar.
const registre = { sessio: null, resultat: null, armat: false, regles: [] };
process.on('exit', (codi) => {
  let resultat = registre.resultat;
  if (codi === 1 || codi === 2) resultat = 'avis';
  else if (!resultat && registre.armat) resultat = 'silenci';
  if (!resultat) return;
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => path.join(c, 'registre-disparadors.js'))
      .find((f) => fs.existsSync(f));
    if (on) {
      require(path.resolve(on)).registraHook('comprova-docmap-commit', resultat, {
        sessio: registre.sessio,
        regla: registre.regles.join('+'),
      });
    }
  } catch (e) {
    /* el registre no pot trencar el hook */
  }
});

let entrada = '';
try {
  entrada = fs.readFileSync(0, 'utf8');
} catch {
  rendirse('sense stdin');
}

let hook;
try {
  hook = JSON.parse(entrada);
} catch {
  rendirse('stdin no és JSON');
}

const ordre = (hook.tool_input && hook.tool_input.command) || '';
if (!/\bgit\s+commit\b/.test(ordre)) rendirse('no és git commit');
registre.sessio = hook.session_id || null;

// `PostToolUse` és el camí normal des de la 5.0.0; `PreToolUse` es manté per a qui encara no haja
// refusionat el snippet. L'única diferència real és d'on ixen els fitxers i per quin codi s'avisa.
const post = hook.hook_event_name === 'PostToolUse';

// --- Bypass explícit -------------------------------------------------------
// En `PostToolUse` el que s'avalua és HEAD, així que el bypass s'ha de llegir del missatge d'HEAD,
// no de l'orde. Llegir-lo de l'orde va ser un bug real (5.0.1): un commit legítimament exceptuat
// amb `[no-doc]` tornava a ser acusat per la següent invocació de `git commit` que no repetira el
// marcador -inclosa una que fallara-, perquè eixa orde no el duia i HEAD continuava sent el commit
// exceptuat. Es comproven els dos: l'orde cobrix el camí `PreToolUse`, on encara no hi ha HEAD nou.

const MARCADOR = '[no-doc]';

/**
 * Cert només si el text **invoca** el marcador, no si l'anomena.
 *
 * Fins al 2026-08-28 açò era un `includes()` pelat, i qualsevol frase que parlara del marcador
 * apagava el guardià. Mesurat sobre l'historial complet d'este catàleg i d'`ua-ds-fusio`: de les
 * 24 aparicions, les 15 invocacions reals estan totes a la **vora** de la línia (`[no-doc] motiu`,
 * `motiu [no-doc]`, o el marcador a soles) i les 9 mencions en prosa estan totes **enmig** d'una
 * frase. La vora de línia les separa 24 de 24. Els blocs i spans de codi es lleven abans: és la
 * forma en què este repositori cita un marcador, i era la del cas que ho va destapar.
 *
 * No s'exigix justificació: `[no-doc]` a soles és una forma que l'historial ja usa.
 */
function invocaBypass(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/`[^`\n]*`/g, ' ')
    .split('\n')
    .some((linia) => {
      const l = linia.trim();
      return l.includes(MARCADOR) && (l.startsWith(MARCADOR) || l.endsWith(MARCADOR));
    });
}

/**
 * L'orde no és un missatge: el marcador hi viu dins de les cometes de `-m`, així que la vora de
 * línia s'ha de mesurar sobre el missatge extret, no sobre `git commit -m "… [no-doc]"` sencer
 * -que acaba en cometa i no coincidiria mai-. El mateix patró que ja usa la comparació de títols
 * de més avall.
 */
// Tres formes, en este orde, i el primer missatge trobat és el que es compara amb el títol d'HEAD:
// - heredoc de Bash (`-m "$(cat <<'EOF'` … `EOF` `)"`), la forma amb què Claude Code escriu els
//   commits. Amb només la forma de cometes, el «títol» era `$(cat <<'EOF'`, no coincidia mai amb
//   HEAD i la guarda de commit fallat callava tots els avisos (5.10.0);
// - here-string de PowerShell (`-m @'` … `'@`), que tanca amb cometa+arrova a principi de línia;
// - cometes simples o dobles.
const RE_HEREDOC = /-[a-zA-Z]*m\s+"\$\(cat\s+<<-?\s*['"]?(\w+)['"]?\r?\n([\s\S]*?)\r?\n\s*\1\s*\)"/g;
const RE_HERE = /-[a-zA-Z]*m\s+@(["'])\r?\n([\s\S]*?)\r?\n\1@/g;
const RE_COMETES = /-[a-zA-Z]*m\s+(["'])([\s\S]*?)\1/g;

function missatgesDeLOrdre(cmd) {
  return [...cmd.matchAll(RE_HEREDOC), ...cmd.matchAll(RE_HERE), ...cmd.matchAll(RE_COMETES)].map(
    (m) => m[2]
  );
}

if (missatgesDeLOrdre(ordre).some(invocaBypass)) rendirseBypass(`${MARCADOR} a l'orde`);

// --- Configuració ----------------------------------------------------------
// Tres ubicacions, en este orde: l'arrel del projecte consumidor, una adopció parcial de
// `ci-plantilla/`, i el cas d'este catàleg. El prompt de l'agent que este script substituïx ja
// provava les tres; la primera versió determinista només mirava la tercera, de manera que en un
// projecte consumidor -on el mapa viu a l'arrel- el hook no trobava res i eixia en silenci.
const arrel = process.cwd();
const configPath = [
  path.join(arrel, 'docmap.json'),
  path.join(arrel, 'ci-plantilla', 'docmap.json'),
  path.join(arrel, 'kit-si-ua', 'ci-plantilla', 'docmap.json'),
].find((p) => fs.existsSync(p));
if (!configPath) rendirse('docmap.json no trobat');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  rendirse('docmap.json no és JSON vàlid');
}

// --- Fitxers que este commit inclou (o inclourà) ---------------------------
// Es llig amb `--name-status` i no amb `--name-only` perquè hi ha regles que només compten quan el
// fitxer naix o mor. A(fegit), D(esborrat), R(enombrat) i C(opiat) canvien si el fitxer existix a
// un costat o a l'altre; M i T només en canvien el cos.
const ESTRUCTURAL = new Set(['A', 'D', 'R', 'C']);

function llegirEstats(ordre) {
  return execSync(ordre, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter(Boolean)
    .map((linia) => {
      const camps = linia.split('\t');
      // `R100\tvell\tnou`: compta la ruta nova, que és l'única que donava `--name-only`.
      return { estat: camps[0][0], ruta: camps[camps.length - 1] };
    });
}

let entrades;
let staged;
if (post) {
  // El commit ja s'ha fet: es llig d'HEAD, no de l'índex (que ara està buit).
  //
  // Guarda contra el commit que ha fallat: si `git commit` s'ha avortat -res staged, missatge
  // buit, un altre hook que l'ha denegat- HEAD continua sent el commit anterior, i avisar-ne
  // seria acusar l'agent d'una cosa que no acaba de fer. No hi ha codi d'eixida fiable al
  // `tool_response` d'un Bash, així que es comprova que HEAD siga de veres el commit d'esta orde.
  //
  // Dos comprovacions, i la primera és la que val (5.0.1): **el títol**. Si l'orde porta `-m`, el
  // seu text ha de coincidir amb el subject d'HEAD; si no coincidix, el commit no s'ha arribat a
  // fer i HEAD és d'abans. L'edat sola no ho detectava -un commit fallat immediatament després
  // d'un de bo veu un HEAD de segons, passa la guarda i hereta el veredicte del commit anterior:
  // reproduït el 2026-08-16 provant esta mateixa versió.
  let missatgeHead = '';
  try {
    missatgeHead = execSync('git log -1 --format=%B', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const edat = Date.now() / 1000 - Number(execSync('git log -1 --format=%ct', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    if (!(edat >= 0 && edat < 120)) rendirse("HEAD no acaba de nàixer -el commit deu haver fallat");
  } catch {
    rendirse('git log ha fallat');
  }

  // El bypass de veres viu ací: el commit que s'avalua és HEAD, no l'orde (vore § Bypass).
  if (invocaBypass(missatgeHead)) rendirseBypass(`${MARCADOR} al missatge d'HEAD`);

  // `-m "…"` / `-m '…'`, també en la forma `-am`. Si l'orde no en porta (`-F`, `--amend` sense
  // missatge, editor interactiu), no es pot comparar i queda només la guarda d'edat.
  const [primer] = missatgesDeLOrdre(ordre);
  if (primer !== undefined) {
    const titolOrdre = primer.split('\n')[0].trim();
    const titolHead = missatgeHead.split('\n')[0].trim();
    if (titolOrdre && titolOrdre !== titolHead) {
      rendirse('el títol d\'HEAD no és el d\'esta orde -el commit deu haver fallat');
    }
  }
  try {
    entrades = llegirEstats('git show --pretty=format: --name-status HEAD');
  } catch {
    rendirse('git show ha fallat');
  }
} else {
  try {
    entrades = llegirEstats('git diff --cached --name-status');
  } catch {
    rendirse('git diff --cached ha fallat');
  }
}
staged = entrades.map((e) => e.ruta);
if (!staged.length) rendirse('cap fitxer al commit');
const estatDe = new Map(entrades.map((e) => [e.ruta, e.estat]));

// `git commit … -- <camins>` restringix el commit a eixos camins. Només cal en `PreToolUse`: el
// commit ja fet conté exactament eixos camins i res més.
const sep = post ? -1 : ordre.indexOf(' -- ');
if (sep > -1) {
  const camins = ordre
    .slice(sep + 4)
    .trim()
    .split(/\s+/)
    .map((c) => c.replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  if (camins.length) {
    staged = staged.filter((f) => camins.some((c) => f === c || f.startsWith(c.replace(/\/?$/, '/'))));
    if (!staged.length) rendirse('cap fitxer staged dins dels camins del commit');
  }
}

// --- Avaluació -------------------------------------------------------------
const exempt = (config.exempcions || []).map((p) => new RegExp(p));
const disparadors = staged.filter((f) => !exempt.some((r) => r.test(f)));

const cobrix = (doc) =>
  doc.endsWith('/') ? staged.some((f) => f.startsWith(doc)) : staged.includes(doc);

const incomplides = [];
for (const regla of config.regles || []) {
  const codiRe = regla.codi.map((p) => new RegExp(p));
  const coincidents = disparadors.filter((f) => codiRe.some((r) => r.test(f)));
  if (!coincidents.length) continue;
  // Regla d'esdeveniment estructural: la dispara que una peça naixca o muira, no que se n'edite el
  // cos. Sense això acusava cada edició d'un `SKILL.md` ja existent -34 dels últims 200 commits.
  const tocats =
    regla.nomes_naixement_o_mort === true
      ? coincidents.filter((f) => ESTRUCTURAL.has(estatDe.get(f)))
      : coincidents;
  if (!tocats.length) continue;
  if (regla.documentacio.some(cobrix)) continue;
  incomplides.push({ nom: regla.nom, docs: regla.documentacio, tocats });
}

registre.armat = true;
registre.regles = incomplides.map((i) => i.nom);
if (!incomplides.length) process.exit(0);

// --- Avís (mai bloqueig) ---------------------------------------------------
// La 1a línia ha de dir-ho tot: en `PreToolUse` era l'única que arribava.
const r = incomplides[0];
const extra = incomplides.length > 1 ? ` (+${incomplides.length - 1} regla/es més)` : '';
console.error(
  post
    ? `docmap: el commit que acabes de fer toca ${r.tocats[0]} i li falta documentació: ${r.docs.join(' o ')}${extra}. El commit ja existix i no es desfà; afig el document que falta (o digues per què no toca). Amb ${MARCADOR} obrint o tancant una línia del missatge s'omet la comprovació.`
    : `docmap: "${r.nom}" — falta documentació: ${r.docs.join(' o ')}${extra}. Avís, el commit continua; ${MARCADOR} obrint o tancant una línia per a ometre-ho.`,
);
for (const i of incomplides) {
  console.error(`  · ${i.nom}: ${i.tocats.slice(0, 5).join(', ')}${i.tocats.length > 5 ? '…' : ''}`);
  console.error(`    n'hi ha prou amb un de: ${i.docs.join(', ')}`);
}
// 2 en PostToolUse (l'stderr arriba al model, i no hi ha res que bloquejar); 1 en PreToolUse.
process.exit(post ? 2 : 1);
