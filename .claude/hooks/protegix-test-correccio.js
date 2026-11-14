#!/usr/bin/env node
/**
 * Guardia del test que vigila una correcció — AVISA i MAI bloqueja (§51.C: naix en mode avís).
 *
 * Què fa
 * ------
 * Mentres hi ha una correcció declarada en curs, avisa si s'edita un fitxer de test. Un agent que
 * arregla codi no ha de poder afluixar la prova que el vigila -i el mode de fallada no és la mala
 * fe, és el camí de menor resistència: quan el test no passa, tocar el test és sempre més ràpid
 * que entendre per què no passa.
 *
 * Per què la correcció s'ha de DECLARAR, i el hook no l'endevina
 * --------------------------------------------------------------
 * «Estem enmig d'una correcció?» és context, i un hook que necessita context per a decidir no és
 * un hook -és un skill (regla del catàleg: detectar és determinista, investigar és agentic,
 * autoritzar és de la persona; vore `README.md` § "El test que vigila una correcció"). Ací el
 * repartiment es respecta sencer: **qui treballa declara** l'estat creant el marcador,
 * **el hook detecta** de manera determinista (existix el marcador? el fitxer sembla un test?), i
 * **autoritzar continua sent de la persona**. Sense marcador, este hook no diu res mai.
 *
 *   Declarar:  echo "ORA-01031 en PKG_EXPEDIENTES" > .claude/correccio-en-curs
 *   Tancar:    rm .claude/correccio-en-curs
 *
 * El marcador va a `.claude/` i es gitignora com la resta d'estat local: si es perd, l'únic que
 * passa és que el guardia calla, que és el costat segur de fallar.
 *
 * Per què `PostToolUse` i no `PreToolUse`
 * ---------------------------------------
 * Mateix raonament ja pagat per `comprova-docmap-commit.js` (README § "Que es note quan..."): en
 * `PreToolUse`, `exit 1` només el veu qui programa -i amb la sessió en auto-mode no el llig ningú-
 * mentres que `exit 2` sí que parla al model **però allí bloqueja**. Com que este mecanisme naix
 * en avís, l'única combinació que informa sense bloquejar és `PostToolUse` + `exit 2`: l'edició ja
 * s'ha fet, no hi ha res que bloquejar, i el model rep l'avís a temps de desfer-la.
 *
 * Cobertura: per quins camins NO passa
 * -------------------------------------
 * Dispara només en `Write`/`Edit`. Una edició per `Bash` (heredoc, `sed -i`, redirecció) no el
 * dispara mai. La CI ho compensa a mitges: des de `ci-plantilla` 1.47.0, `comprova-antipatrons.js`
 * avisa d'un test que el diff desactiva (`it.skip`, `[Fact(Skip =`...); una asserció afluixada no la
 * veu ningú. És el forat que `README.md` § "Cobertura dels hooks" registra -encara no tancat, i part
 * del motiu pel qual este mecanisme no ha guanyat el dret a bloquejar (vore § "Promoció" avall).
 *
 * Com es nota que no funciona
 * ---------------------------
 * Trivialment: amb el marcador posat, editar un test i no rebre res vol dir que està mut. El
 * parell de casos de `ci-plantilla/proves/casos/protegix-test-correccio.js` ho fixa per les dos
 * bandes -que avise quan toca i que calle quan no.
 *
 * Promoció a bloquejar (§51.C): exigix el parell de casos (ja el té), haver corregut en avís sobre
 * correccions reals sense cap fals positiu (**encara no**), i que la promoció quede escrita a
 * `VERSION.md`. Fins llavors, avisa.
 *
 * Codis d'eixida
 * --------------
 *   0 → res a dir (sense marcador, no és un test, o bypass). Silenci.
 *   2 → avís al model. No desfà res.
 *
 * Bypass: UA_PERMET_EDITAR_TEST=<ruta> (llista separada per comes si calen diverses; p. ex. la
 * correcció consistix, precisament, en què el test estava mal escrit). Nomena el fitxer exacte
 * -no "1"- perque el bypass aixeca eixa ruta i continua avisant per a la resta. Interruptor
 * general: esborrar el marcador.
 *
 * Ús fora del hook (per a les proves): --fitxer <ruta>, en lloc del JSON per stdin.
 *
 * Registre: cada avís, cada bypass i la primera vegada que calla **amb el marcador posat** en cada
 * sessió van a `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a decidir si es retira, es
 * modifica o s'estén. Sense marcador no anota res: un guardia desarmat no ha tingut ocasió d'actuar,
 * i comptar-lo el faria candidat a retirar-se per no haver parlat mai.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MARCADOR = path.join('.claude', 'correccio-en-curs');

// Patrons de test de les piles que toca este catàleg (.NET/xUnit, Vue/Vitest, Python). Per ruta i
// per nom: no s'obri mai el fitxer -qui vigila una edició no ha de dependre del contingut.
const PATRONS = [
  /(^|[\\/])tests?[\\/]/i,
  /(^|[\\/])__tests__[\\/]/,
  /\.(test|spec)\.[jt]sx?$/i,
  /\.(test|spec)\.vue$/i,
  /Tests?\.cs$/,
  /(^|[\\/])test_[^\\/]+\.py$/,
  /_test\.py$/,
];

function llegeixRuta(callback) {
  const i = process.argv.indexOf('--fitxer');
  if (i > -1) return callback(process.argv[i + 1] || '', null);

  let dades = '';
  process.stdin.on('data', (c) => (dades += c));
  process.stdin.on('end', () => {
    try {
      const j = JSON.parse(dades);
      callback((j.tool_input && j.tool_input.file_path) || '', j.session_id || null);
    } catch (e) {
      callback('', null);
    }
  });
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. Sense l'script, o amb una còpia anterior a la 1.55.0, no fa res.
function compta(resultat, dades) {
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => `${c}/registre-disparadors.js`)
      .find((f) => fs.existsSync(f));
    if (on) require(path.resolve(on)).registraHook('protegix-test-correccio', resultat, dades);
  } catch (e) {
    /* el registre no pot trencar el hook */
  }
}

llegeixRuta((ruta, sessio) => {
  const armat = fs.existsSync(MARCADOR);
  const permeses = (process.env.UA_PERMET_EDITAR_TEST || '').split(',');
  if (ruta && permeses.includes(ruta)) {
    console.error(`bypass: UA_PERMET_EDITAR_TEST aixecat sobre '${ruta}'`);
    // Només és un bypass si, sense ell, hauria avisat.
    if (armat && PATRONS.some((p) => p.test(ruta))) compta('bypass', { sessio, fitxer: ruta });
    process.exit(0);
  }
  if (!ruta) process.exit(0);
  if (!armat) process.exit(0);
  if (!PATRONS.some((p) => p.test(ruta))) {
    compta('silenci', { sessio });
    process.exit(0);
  }

  let motiu = '';
  try {
    motiu = fs.readFileSync(MARCADOR, 'utf8').trim().split('\n')[0];
  } catch (e) {
    /* el marcador pot estar buit: el que importa és que hi és */
  }

  console.error(
    `correccio-en-curs: acabes d'editar ${ruta}, que és un fitxer de test, mentres hi ha una ` +
      `correcció declarada${motiu ? ` ("${motiu}")` : ''}. La prova que demostrava el defecte no ` +
      `l'ha de tocar qui el corregix: si el test no passa, el que ha de canviar és el codi. ` +
      `Desfés l'edició, o digues per què el test estava mal escrit (i llavors ` +
      `UA_PERMET_EDITAR_TEST=${ruta}). En acabar la correcció: rm ${MARCADOR}`
  );
  compta('avis', { sessio, fitxer: ruta });
  process.exit(2);
});
