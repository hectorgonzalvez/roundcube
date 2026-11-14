#!/usr/bin/env node
/**
 * Detecta patrons que un model d'IA escriu per defecte -perquè són els majoritaris al codi
 * públic amb què s'ha entrenat- però que la pila de la UA prohibix o substituïx per una peça
 * pròpia. És el complement invers de la resta de checks: els altres verifiquen que es complix
 * una regla de la UA; este detecta que s'ha aplicat una convenció de fora.
 *
 * Cada patró cita la font que el prohibix. Si un patró no té una prohibició escrita en cap
 * skill, va marcat com a `avis` i mai bloqueja -no s'inventen regles ací; la font de veritat
 * és el skill o `ESTANDARDS.md`, este script només l'aplica. (`ESTANDARDS.md` hi entra des de
 * la 1.17.0: §12 i §8 no pengen de cap skill concret, igual que passa amb la higiene d'edició.)
 *
 * Determinista (regex), sense dependències ni agent -mateix cost que la resta de checks.
 *
 * Ús:  node kit-si-ua/ci-plantilla/comprova-antipatrons.js --base origin/main --head HEAD [--warn]
 *      node kit-si-ua/ci-plantilla/comprova-antipatrons.js --dir .   (sense git: tot l'arbre)
 *      node kit-si-ua/ci-plantilla/comprova-antipatrons.js --fitxer Services/A.cs [--fitxer …]
 *      --warn: reporta sense fallar (per a adopció gradual en un legacy)
 *
 * `--fitxer` (repetible, 1.37.0) revisa només eixes rutes, sense git ni arbre. És la porta del hook
 * `hooks-plantilla/comprova-edicio.js`, que passa el fitxer que l'agent acaba d'editar:
 * mateixos patrons, mateixes exempcions, un sol lloc on viuen.
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}
const base = arg('base', 'origin/main');
const head = arg('head', 'HEAD');
const warnOnly = process.argv.includes('--warn');
const dir = arg('dir', null);

let fitxers;
try {
  fitxers = require('./fitxers.js');
} catch (e) {
  console.error("Falta fitxers.js al costat d'este script (arriba amb ci-plantilla 1.30.0).");
  console.error('Refresca la còpia: node <clon>/kit-si-ua/ci-plantilla/instal·la-ci.js --dest . --actualitza');
  process.exit(2);
}

// Este repositori és un catàleg de documentació: els exemples de codi dins dels skills
// mostren deliberadament el patró prohibit per a explicar per què no s'usa. `evals/` (1.37.0): els
// fitxers que avaluen els skills de revisió porten el defecte a posta perquè el troben.
const EXEMPT = [/^marc-referencial\//, /^planificacio\//, /^docs\//, /^audit-chatgpt-skills\//, /\/references\//, /(^|\/)evals\//, /SKILL\.md$/];

const DOTNET = /\.cs$/;
const ORACLE = /\.(pks|pkb|sql)$/;
// Frontend des de la 1.37.0: `.vue` i `.ts` (no `.d.ts`). Els tests, els e2e i la configuració
// de l'eina no són codi de l'aplicació: allí un `fetch` o un `axios` pot ser la cosa provada.
const FRONTEND = /\.(vue|ts)$/;
const FRONTEND_NO_APP = /\.d\.ts$|\.(spec|test)\.ts$|\.config\.ts$|(^|\/)(e2e|playwright|tests?|__tests__)\//;
// Fitxers de test (1.47.0): només hi passa el patró del test desactivat. Els noms són els que mira
// `hooks-plantilla/protegix-test-correccio.js`, restringits a les extensions de la pila.
const TEST = /(^|\/)(tests?|__tests__|e2e|playwright)\/|\.(test|spec)\.[jt]sx?$|Tests?\.cs$/i;
const TEST_EXT = /\.(cs|[jt]sx?)$/;

/**
 * severitat: 'error' = prohibició escrita en un skill (bloqueja, tret de --warn).
 *            'avis'  = mai bloqueja. Per dos motius: convenció forta sense prohibició literal, o
 *                      patró nou que encara no s'ha guanyat el dret a bloquejar (README § «Naixen
 *                      en avís»). Els del segon tipus porten `naix` amb la data: promocionar-los a
 *                      'error' és canviar eixa línia i anotar-ho a VERSION.md.
 */
const PATRONS_DOTNET = [
  {
    re: /\bIExceptionHandler\b/,
    severitat: 'error',
    motiu: 'IExceptionHandler no s\'usa a la UA; el punt central és ErrorHandlerMiddleware',
    font: 'ua-dotnet-errores § Principios fundamentales',
  },
  {
    // El que es prohibix és ProblemDetails com a **flux central** d'errors -el servici d'ASP.NET
    // que convertix tota excepció en RFC 7807-, no el tipus. El tipus sí que és legítim: el
    // `HandleError` del controlador en construïx un per a `Result<T>` (ua-dotnet-api), els tests
    // el deserialitzen per a verificar `type` (ua-dotnet-test), i `ValidationProblemDetails` és
    // el contracte de validació (ua-validacion). Fins a la 1.36.0 el patró era el nom del tipus
    // a seques, i acusava tot això.
    re: /\bAddProblemDetails\s*\(|\bIProblemDetails(?:Service|Writer)\b/,
    severitat: 'error',
    motiu: 'ProblemDetails com a flux central d\'errors: el punt únic és ErrorHandlerMiddleware (el tipus en un controlador o test sí que val)',
    font: 'ua-dotnet-errores § Principios fundamentales / ESTANDARDS.md',
  },
  {
    re: /\busing\s+(FluentResults|CSharpFunctionalExtensions|OneOf)\b/,
    severitat: 'error',
    motiu: 'llibreria externa del patró Result: el Result<T> de la UA és propi i es copia al projecte (Models/Errors/), no ve de cap NuGet',
    font: 'ua-dotnet-api § patron-result / ua-dotnet-errores § Principios fundamentales',
  },
  {
    // `ClaseOracleBD3` és el nom de la llibreria, mai un tipus C#: els tipus reals són
    // `ClaseOracleBd` / `IClaseOracleBd` (sense "3", "d" minúscula).
    re: /\bnew\s+ClaseOracleBD3\b|\bIClaseOracleBD3\b|\bClaseOracleBD3\s+\w+\s*[;=,)]/,
    severitat: 'error',
    motiu: 'ClaseOracleBD3 és el nom del paquet, no un tipus; els tipus són ClaseOracleBd / IClaseOracleBd',
    font: 'ua-oracle-datos § Nomenclatura',
  },
  {
    re: /\busing\s+Dapper\b|\busing\s+Microsoft\.EntityFrameworkCore\b|:\s*DbContext\b/,
    severitat: 'avis',
    motiu: 'l\'accés a dades de la UA va per IClaseOracleBd, no per Dapper/EF Core',
    font: 'ua-oracle-datos (convenció, sense prohibició literal)',
  },
  {
    // Roles de la vista Oracle, en minúscules, declarats una vegada; els controladors usen la
    // política per nom. `Policy = AuthorizationPolicies.X` no casa: no porta cometes.
    re: /\[Authorize\s*\([^\]]*\b(?:Roles|Policy)\s*=\s*"/,
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: '[Authorize] amb una cadena literal: els controladors usen les constants d\'AuthorizationPolicies',
    font: 'ua-dotnet-seguridad § Reglas obligatorias / references/gotchas.md §5',
  },
  {
    // Només la part de la consulta on van els valors (WHERE/AND/OR/SET/VALUES), en majúscules
    // -com s'escriu el SQL a la UA- perquè un `$"… and {x}"` d'un missatge de log no hi case.
    // Mai bloqueja: la regex no sap si el valor ve del client. `ua-dotnet-api` mateix interpola
    // el `ORDER BY NOMBRE_{idioma}` perquè el decidix `NormalizarIdioma`, i eixe cas no casa.
    // No veu un `$@"…"` partit en diverses línies si el `{` no va a la línia del `$`.
    re: /\$@?"[^"]*\b(?:WHERE|AND|OR|SET|VALUES)\b[^"]*\{/,
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: 'valor interpolat en la part de valors d\'una consulta SQL: el que ve del client va com a paràmetre (:nom), mai interpolat',
    font: 'ua-dotnet-api § 4. Reglas que no se negocian (5)',
  },
];

// Frontend, per línia. Tots són de la 1.37.0 i naixen en avís.
const PATRONS_FRONTEND = [
  {
    // `import type { … } from 'axios'` sí que val: tipar l'adaptador de `HttpApi` no fa cap petició.
    re: /\bfetch\s*\(|^\s*import\s+(?!type\b)[^;]*\bfrom\s+['"]axios['"]|\baxios\s*\.\s*(?:get|post|put|patch|delete|request|create)\s*\(/,
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: '`fetch`/`axios` solt: tot l\'HTTP va per `peticion` de @vueua/uacloud/http (URL base, credencials, avisos, errors)',
    font: 'ua-vue-uacloud § Reglas que no se negocian',
  },
  {
    re: /\buaT\s*\(/,
    nomes: /\.vue$/,
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: '`uaT()` en un component Vue: una aplicació Vue usa `t()` de vue-i18n; `uaT()` és del Design System sense Vue',
    font: 'ua-i18n-valencia § Què és sempre una violació',
  },
];

/**
 * Text visible literal al `<template>` d'un component Vue d'aplicació (1.39.0, I18-1). Només
 * compta el que cau dins del bloc `<template>` de primer nivell: el text d'un node i els
 * atributs estàtics que es veuen (`label`, `placeholder`, `title`, `aria-label`, `alt`). Un
 * atribut lligat (`:label="t(…)"`) i el que va dins de `{{ }}` no compten.
 *
 * Naix en avís perquè fa soroll: un símbol, una sigla o un nom propi també són text literal.
 * `demos/` i `templates/` en queden fora, com diu la regla.
 */
const PATRO_TEXT_LITERAL = {
  severitat: 'avis',
  naix: '2026-09-29',
  motiu: "text visible literal al `<template>`: tot text visible passa per `t(clau, 'text valencià')`",
  font: 'ua-i18n-valencia § Què és sempre una violació',
};
const VUE_SENSE_I18N = /(^|\/)(demos?|templates)\//;
const ATRIBUT_VISIBLE = /(?:^|\s)(label|placeholder|title|aria-label|alt)\s*=\s*"([^"]*)"/g;
const TE_PARAULA = /\p{L}{2,}/u;

function textLiteralTemplate(lines) {
  const obri = lines.findIndex((l) => /^<template[\s>]/.test(l));
  let tanca = -1;
  for (let i = lines.length - 1; i > obri; i--) {
    if (/^<\/template>/.test(lines[i])) { tanca = i; break; }
  }
  if (obri < 0 || tanca < 0) return [];
  // Per caràcter, no per línia: una interpolació, un comentari o el valor d'un atribut poden
  // ocupar diverses línies, i una paraula sola dins d'una etiqueta és un atribut booleà.
  const src = lines.slice(obri + 1, tanca).join('\n');
  const troballes = [];
  const vistes = new Set();
  const anota = (brut, pos) => {
    const text = brut.replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (!TE_PARAULA.test(text)) return;
    const inici = pos + brut.length - brut.trimStart().length;
    const linia = obri + 2 + src.slice(0, inici).split('\n').length - 1;
    if (vistes.has(linia)) return;
    vistes.add(linia);
    troballes.push({ ...PATRO_TEXT_LITERAL, linia, text });
  };
  let text = '';
  let iniciText = 0;
  const buida = () => {
    if (text) anota(text, iniciText);
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      buida();
      const j = src.indexOf('-->', i);
      i = j < 0 ? src.length : j + 3;
    } else if (src.startsWith('{{', i)) {
      const j = src.indexOf('}}', i);
      text += ' ';
      i = j < 0 ? src.length : j + 2;
    } else if (src[i] === '<') {
      buida();
      // L'etiqueta acaba en el `>` que no cau dins d'unes cometes.
      let j = i + 1;
      let cometa = null;
      while (j < src.length && (cometa || src[j] !== '>')) {
        if (cometa) { if (src[j] === cometa) cometa = null; }
        else if (src[j] === '"' || src[j] === "'") cometa = src[j];
        j++;
      }
      for (const m of src.slice(i, j).matchAll(ATRIBUT_VISIBLE)) anota(m[2], i + m.index);
      i = j + 1;
    } else {
      if (!text) iniciText = i;
      text += src[i];
      i++;
    }
  }
  buida();
  return troballes;
}

/**
 * Un test desactivat (1.47.0). Un test que no corre no vigila res, i desactivar-lo és el camí més
 * curt quan no passa. És l'altra meitat de `hooks-plantilla/protegix-test-correccio.js`, que només
 * veu les edicions per `Write`/`Edit`: este el veu al diff, vinga per on vinga.
 *
 * Només les línies que el canvi afig (`liniesNoves`): un skip que ja hi era no és d'esta MR.
 * Afluixar una asserció no ho detecta cap regex, i es queda fora.
 */
const PATRO_TEST_DESACTIVAT = {
  re: /\[(?:Fact|Theory)\s*\([^\]]*\bSkip\s*=|\[Ignore\b|\b(?:it|test|describe)\s*\.\s*skip\b|\b(?:xit|xtest|xdescribe)\s*\(/,
  severitat: 'avis',
  naix: '2026-10-19',
  motiu: 'test desactivat: un test que no corre no vigila res; si cal, digues a la MR per què i quan es reactiva',
  font: 'hooks-plantilla/README.md § Cobertura dels hooks (protegix-test-correccio.js)',
};

/**
 * Un test esborrat (1.56.0). L'altra manera de deixar de vigilar: el skip es veu a les línies que el
 * canvi afig, un test llevat només a les que lleva, i un fitxer de test esborrat ni tan sols arriba a
 * la passada de dalt. Es compta el balanç de declaracions (`[Fact]`, `[Theory]`, `it(`, `test(`) entre
 * les línies llevades i les afegides de cada fitxer de test del diff: moure un test o reescriure'l
 * no avisa; que en queden menys, sí.
 *
 * Només amb diff (sense `--dir` ni `--fitxer`): sense base no hi ha balanç. Un recompte no mesura la
 * força dels tests -afluixar una asserció continua sense veure-ho ningú-, i ajuntar tres `[Fact]` en
 * una `[Theory]` avisa sense que falte res: per això naix en avís, i la resposta és dir-ho a la MR.
 */
const PATRO_TEST_ESBORRAT = {
  re: /\[(?:Fact|Theory)\b|^\s*(?:it|test)\s*\(/,
  severitat: 'avis',
  naix: '2026-10-30',
  motiu: 'el canvi deixa menys tests dels que hi havia: si és volgut, digues a la MR quins i per què',
  font: 'hooks-plantilla/README.md § Cobertura dels hooks (protegix-test-correccio.js)',
};

function balançTests(file) {
  try {
    const diff = execSync(`git diff -U0 ${base}...${head} -- "${file}"`, { encoding: 'utf8' });
    let llevats = 0;
    let afegits = 0;
    for (const l of diff.split(/\r?\n/)) {
      if (/^(---|\+\+\+) /.test(l)) continue;
      const cos = l.slice(1).replace(/\/\/.*$/, '');
      if (!PATRO_TEST_ESBORRAT.re.test(cos)) continue;
      if (l[0] === '-') llevats++;
      else if (l[0] === '+') afegits++;
    }
    return { llevats, afegits };
  } catch (e) {
    return null;
  }
}

/**
 * Patrons que viuen DINS d'un comentari, i per això es miren sobre la línia crua: la resta de
 * passades lleven els comentaris abans de buscar. Valen per a totes les extensions revisades.
 * Exigixen els punts suspensius i una paraula d'«això no ha canviat»: cap dels dos sols basta.
 * Mesurat en crear-lo sobre 809 fitxers de set aplicacions reals: cap coincidència.
 */
const PATRONS_COMENTARI = [
  {
    re: /(?:\/\/|\/\*|--|<!--)\s*(?:\.{3}|…)\s*.*\b(?:rest|resto|resta|remaining|existing|unchanged|sin\s+cambios|sense\s+canvis|igual|same|anterior|previous)\b/i,
    severitat: 'avis',
    naix: '2026-09-26',
    motiu: 'comentari en lloc de codi («... resto sin cambios»): el fitxer desat ha perdut el que hi havia; compara-ho amb el diff',
    font: 'ESTANDARDS.md §12',
  },
];

/**
 * Patrons que ocupen més d'una línia per definició -un `catch` buit en són dos o tres-, de manera
 * que la passada per línia de baix no els veu mai. Es revisen sobre el fitxer sencer (amb els
 * comentaris de línia ja llevats) i la línia es calcula des de l'índex de la coincidència.
 *
 * Limitacions conegudes, assumides: no cobrix comentaris de bloc ni literals de cadena.
 *
 * Un `catch` que només conté un comentari SÍ que es reporta: el comentari no propaga res, així que
 * l'excepció s'engolix igual que si el bloc estiguera buit del tot. Documentar per què s'ignora un
 * error no és gestionar-lo. Una línia sencera comentada que continga el patró, en canvi, no es
 * reporta -parlar-ne no és aplicar-ho-, perquè els comentaris de línia es lleven abans de buscar.
 */
const PATRONS_FITXER_DOTNET = [
  {
    re: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g,
    severitat: 'error',
    motiu: 'catch buit: l\'excepció no arriba a ErrorHandlerMiddleware -ni correu, ni traceId, ni log',
    font: 'ESTANDARDS.md §12 / ua-dotnet-errores § Principios fundamentales',
  },
  {
    // `[^{}]*` a banda i banda: exigix que el `return null` estiga al cos immediat del `catch`,
    // sense cap bloc pel mig. Sense això casaria un `catch` que sí que gestiona l'error i, molt
    // més avall i dins d'un altre bloc, retorna null legítimament.
    re: /catch\s*(?:\([^)]*\))?\s*\{[^{}]*\breturn\s+(?:null|default)\s*;[^{}]*\}/g,
    severitat: 'error',
    motiu: 'catch que retorna null/default: convertix un error de sistema en un resultat buit',
    font: 'ESTANDARDS.md §12 / ua-dotnet-errores § Principios fundamentales',
  },
];

/**
 * Paràmetres OUT de `ua.DynamicParameters` (`p.Add(nom, valor, tipoBd:, direccion:, tamano:)`).
 * La crida sol ocupar dos o tres línies, per això va a la passada de fitxer. Cada entrada casa
 * amb una crida `.Add(…)` sencera -fins al `;`- i `revisa` diu si eixa crida infringix la regla.
 */
const OUT_ADD = /\.Add\s*\(\s*"[^"]*"\s*,[^;]*?ParameterDirection\.(?:Output|InputOutput)[^;]*?\)\s*;/g;
const PATRONS_OUT_DOTNET = [
  {
    revisa: (c) => /OracleDbType\.Varchar2/.test(c) && !/\btamano\s*:/.test(c),
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: 'OUT Varchar2 sense `tamano`: Oracle reserva un buffer mínim i llança ORA-06502 en escriure el missatge (tamano: 4000)',
    font: 'ua-oracle-datos § Procedimientos Almacenados — reglas OUT',
  },
  {
    revisa: (c) => !/\btipoBd\s*:/.test(c),
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: 'OUT sense `tipoBd`: Varchar2 amb tamano 4000, o Decimal per a NUMBER',
    font: 'ua-oracle-datos § Procedimientos Almacenados — reglas OUT',
  },
  {
    revisa: (c) => /ParameterDirection\.Output\b/.test(c) && /^\.Add\s*\(\s*"[^"]*"\s*,\s*(?:DBNull\.Value|default)\b/.test(c),
    severitat: 'avis',
    naix: '2026-09-24',
    motiu: 'OUT amb valor inicial DBNull.Value/default: ha de ser `null`',
    font: 'ua-oracle-datos § Procedimientos Almacenados — reglas OUT',
  },
];

const PATRONS_FITXER_ORACLE = [
  {
    re: /WHEN\s+OTHERS\s+THEN\s+NULL\s*;/gi,
    severitat: 'error',
    motiu: 'EXCEPTION WHEN OTHERS THEN NULL: silencia l\'error abans que ClaseOracleBD3 el puga classificar',
    font: 'ESTANDARDS.md §12 / ua-dotnet-errores/references/error-contract-ua.md',
  },
];

// `(?:[^']|'')*` perquè PL/SQL escapa la cometa simple doblant-la (`L''expedient`): amb un
// tancament no-golós el missatge es tallaria a la primera meitat i el recompte de `#` seria fals.
// Les cometes dobles no delimiten cadenes en PL/SQL (delimiten identificadors), per això no hi són.
const RAISE_RE = /RAISE_APPLICATION_ERROR\s*\(\s*(-?\d+)\s*,\s*'((?:[^']|'')*)'/i;

function revisaOracle(linia) {
  const m = RAISE_RE.exec(linia);
  if (!m) return null;
  const codi = parseInt(m[1], 10);
  const missatge = m[2];

  if (codi > -20000 || codi < -20999) {
    return {
      severitat: 'error',
      motiu: `RAISE_APPLICATION_ERROR amb codi ${codi}: Oracle només admet de -20000 a -20999`,
      font: 'Oracle (restricció de la plataforma)',
    };
  }
  // El contracte d'errors de la UA: `# missatge #` = error d'usuari (sense correu); sense cap
  // `#` = error de sistema (correu). Un sol `#` no és cap de les dos: ClaseOracleBD3 no el
  // detecta com a error d'usuari i s'envia correu d'una cosa que anava dirigida a l'usuari.
  const hashos = (missatge.match(/#/g) || []).length;
  if (hashos % 2 !== 0) {
    return {
      severitat: 'error',
      motiu: `RAISE_APPLICATION_ERROR amb ${hashos} '#' (senar): el missatge d'usuari es delimita amb # a banda i banda, o cap`,
      font: 'ua-dotnet-errores/references/error-contract-ua.md § Oracle → BDException',
    };
  }
  return null;
}

// `--fitxer` guanya sobre `--dir` i sobre el diff: qui nomena les rutes sap què vol revisar.
const nomenats = process.argv
  .map((a, i, tots) => (a === '--fitxer' ? tots[i + 1] : null))
  .filter(Boolean)
  .map((f) => f.split('\\').join('/').replace(/^\.\//, ''));

// Un patró que naix en avís ho diu: qui el llig ha de saber que és una regla escrita que encara no
// bloqueja, no una simple convenció.
const enAvis = (t) => (t.naix ? ` [naix en avís, ${t.naix}]` : '');
const esTest = (f) => TEST.test(f) && TEST_EXT.test(f) && !/\.d\.ts$/.test(f);

/**
 * Línies que el canvi afig a `file`, o `null` si no hi ha amb què comparar (llavors compta el fitxer
 * sencer). En diff, contra `base`; amb `--fitxer` (el hook), contra `HEAD`: el que l'agent ha tocat
 * i encara no és al commit. Un fitxer que git no seguix és nou sencer.
 */
function liniesNoves(file) {
  if (dir) return null;
  try {
    if (nomenats.length && !execSync(`git ls-files -- "${file}"`, { encoding: 'utf8' }).trim()) return null;
    const rang = nomenats.length ? 'HEAD' : `${base}...${head}`;
    const diff = execSync(`git diff -U0 ${rang} -- "${file}"`, { encoding: 'utf8' });
    const noves = new Set();
    for (const m of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
      const inici = parseInt(m[1], 10);
      const n = m[2] === undefined ? 1 : parseInt(m[2], 10);
      for (let k = 0; k < n; k++) noves.add(inici + k);
    }
    return noves;
  } catch (e) {
    return null;
  }
}

const tocats = nomenats.length
  ? nomenats
  : fitxers.llista({ dir, cmd: `git diff --name-only ${base}...${head}`, nom: 'comprova-antipatrons.js' });
const changed = tocats
  .filter(
    (f) =>
      (DOTNET.test(f) || ORACLE.test(f) || (FRONTEND.test(f) && !FRONTEND_NO_APP.test(f)) || esTest(f)) &&
      !EXEMPT.some((r) => r.test(f)) &&
      fs.existsSync(f)
  );

let errors = 0;
let avisos = 0;

// El balanç va abans i sobre `tocats`, no sobre `changed`: un fitxer de test esborrat ja no existix.
if (!dir && !nomenats.length) {
  for (const file of tocats.filter((f) => esTest(f) && !EXEMPT.some((r) => r.test(f)))) {
    const b = balançTests(file);
    if (!b || b.llevats <= b.afegits) continue;
    const t = PATRO_TEST_ESBORRAT;
    avisos++;
    const estat = fs.existsSync(file) ? '' : ', fitxer esborrat';
    console.log(`avís ${file} — ${t.motiu}${enAvis(t)}`);
    console.log(`      font: ${t.font}`);
    console.log(`      ${b.llevats} declaració(ns) de test llevada(es), ${b.afegits} afegida(es)${estat}`);
  }
}

for (const file of changed) {
  const esOracle = ORACLE.test(file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  if (esTest(file)) {
    const noves = liniesNoves(file);
    const t = PATRO_TEST_DESACTIVAT;
    lines.forEach((raw, i) => {
      const linia = raw.replace(/\/\/.*$/, '');
      if ((noves && !noves.has(i + 1)) || !t.re.test(linia)) return;
      avisos++;
      console.log(`avís ${file}:${i + 1} — ${t.motiu}${enAvis(t)}`);
      console.log(`      font: ${t.font}`);
      console.log(`      ${linia.trim().slice(0, 100)}`);
    });
    // Un test de frontend no és codi de l'aplicació: la resta de patrons no hi passen.
    if (!DOTNET.test(file)) continue;
  }

  // --- Passada a nivell de fitxer -----------------------------------------
  // Es reaprofita la mateixa neteja de comentaris de línia que fa la passada de baix, per a no
  // reportar un patró que només apareix comentat.
  const netes = lines.map((raw) => (esOracle ? raw.replace(/--.*$/, '') : raw.replace(/\/\/.*$/, '')));
  const contingut = netes.join('\n');
  const deFitxer = [];
  const esFrontend = FRONTEND.test(file);
  const deFitxerPatrons = esOracle ? PATRONS_FITXER_ORACLE : esFrontend ? [] : PATRONS_FITXER_DOTNET;
  for (const p of deFitxerPatrons) {
    p.re.lastIndex = 0; // les regex són /g i conserven estat entre fitxers
    let m;
    while ((m = p.re.exec(contingut)) !== null) {
      deFitxer.push({ ...p, linia: contingut.slice(0, m.index).split('\n').length, text: m[0] });
    }
  }
  if (DOTNET.test(file)) {
    OUT_ADD.lastIndex = 0;
    let m;
    while ((m = OUT_ADD.exec(contingut)) !== null) {
      // Una crida pot infringir més d'una regla (sense tipoBd ni tamano): només la primera, com
      // fa la passada per línia, perquè la correcció d'una sol arrossegar l'altra.
      const p = PATRONS_OUT_DOTNET.find((o) => o.revisa(m[0]));
      if (p) deFitxer.push({ ...p, linia: contingut.slice(0, m.index).split('\n').length, text: m[0] });
    }
  }
  if (/\.vue$/.test(file) && !VUE_SENSE_I18N.test(file)) deFitxer.push(...textLiteralTemplate(lines));
  // Per línia, no per patró: si no, dos troballes del mateix fitxer ixen desordenades.
  deFitxer.sort((a, b) => a.linia - b.linia);
  for (const t of deFitxer) {
    const bloqueja = t.severitat === 'error' && !warnOnly;
    if (t.severitat === 'error') errors++;
    else avisos++;
    console.log(`${bloqueja ? '✖' : 'avís'} ${file}:${t.linia} — ${t.motiu}${enAvis(t)}`);
    console.log(`      font: ${t.font}`);
    console.log(`      ${t.text.replace(/\s+/g, ' ').trim().slice(0, 100)}`);
  }

  lines.forEach((raw, i) => {
    for (const t of PATRONS_COMENTARI.filter((p) => p.re.test(raw))) {
      avisos++;
      console.log(`avís ${file}:${i + 1} — ${t.motiu}${enAvis(t)}`);
      console.log(`      font: ${t.font}`);
      console.log(`      ${raw.trim().slice(0, 100)}`);
    }

    // Comentaris de línia fora: parlar del patró prohibit no és aplicar-lo. No cobrix
    // comentaris de bloc ni literals de cadena -limitació coneguda, assumida per simplicitat.
    const linia = esOracle ? raw.replace(/--.*$/, '') : raw.replace(/\/\/.*$/, '');
    if (!linia.trim()) return;

    const troballes = esOracle
      ? [revisaOracle(linia)].filter(Boolean)
      : esFrontend
        ? PATRONS_FRONTEND.filter((p) => (!p.nomes || p.nomes.test(file)) && p.re.test(linia))
        : PATRONS_DOTNET.filter((p) => p.re.test(linia));

    for (const t of troballes) {
      const bloqueja = t.severitat === 'error' && !warnOnly;
      if (t.severitat === 'error') errors++;
      else avisos++;
      const marca = bloqueja ? '✖' : 'avís';
      console.log(`${marca} ${file}:${i + 1} — ${t.motiu}${enAvis(t)}`);
      console.log(`      font: ${t.font}`);
      console.log(`      ${linia.trim().slice(0, 100)}`);
    }
  });
}

if (!errors && !avisos) {
  console.log(`Cap antipatró en ${changed.length} fitxer(s) revisat(s) (.cs/.sql/.vue/.ts i tests).`);
  process.exit(0);
}

console.log(`\n${errors} error(s), ${avisos} avís(os) en ${changed.length} fitxer(s) revisat(s).`);
if (errors && !warnOnly) {
  console.log('Els avisos mai bloquegen. Per a adopció gradual en un legacy: --warn.');
  process.exit(1);
}
process.exit(0);
