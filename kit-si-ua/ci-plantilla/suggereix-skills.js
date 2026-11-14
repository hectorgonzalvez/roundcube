#!/usr/bin/env node
// Llig un file_path (argv[2]) i el mapa carpeta/patró -> skills (skillmap.json a
// l'arrel, ci-plantilla/skillmap.json, o kit-si-ua/ci-plantilla/skillmap.exemple.json
// com a fallback d'exemple) i imprimix el missatge de la primera regla que hi encaixe
// -o res si cap encaixa o no hi ha mapa. Determinista, sense agent -consumit per
// .claude/hooks/suggest-skills.sh (PostToolUse). Mai bloqueja, mai executa cap skill.
//
// argv[3] (opcional) és l'identificador de sessió: si arriba, el suggeriment queda
// anotat al registre de disparadors per a poder saber després si s'ha atés
// (registre-disparadors.js --informe). Sense ell el skill se suggerix igual.
//
// El suggeriment s'IMPRIMIX un sol cop per (regla, sessió). El hook dispara a cada
// Write|Edit, i el text imprés entra a la conversa com a `additionalContext`: és a
// dir, es queda allà i es reenvia en cada torn posterior fins al final de la sessió.
// Repetir-lo a cada edició no afig informació -l'agent ja ha decidit si atendre'l la
// primera volta- i sí que afig cost i soroll. El registre, en canvi, sí que anota
// cada disparada: `ocasions()` de registre-disparadors.js ja les agrupa per
// (regla, fitxer, sessió) i compta `repeticions`, de manera que la telemetria no
// perd res per no imprimir.

const fs = require("fs");
const path = require("path");

// El registre és opcional: si la còpia del projecte no el porta, se suggerix igual.
let registra = () => {};
let llig = () => [];
try {
  ({ registra, llig } = require("./registre-disparadors.js"));
} catch (e) {
  // Sense registre-disparadors.js no hi ha telemetria, però el hook ha de funcionar.
}

/**
 * Ja s'ha imprés esta regla en esta sessió? Sense `sessio` no es pot saber -i
 * llavors es preferix imprimir (perdre un suggeriment és pitjor que repetir-lo).
 */
function jaSuggerida(regla, sessio) {
  if (!sessio) return false;
  try {
    return llig().some(
      (e) => e.tipus === "suggeriment" && e.sessio === sessio && (e.regla || null) === regla
    );
  } catch (e) {
    return false;
  }
}

const filePath = process.argv[2] || "";
const sessio = process.argv[3] || null;
if (!filePath) process.exit(0);

// Les regles s'escriuen relatives a l'arrel del projecte (`^packages/...`,
// `^src/Backend/...`), però el hook rep del `tool_input.file_path` una ruta
// ABSOLUTA. Comparar-les directament feia que cap patró ancorat amb `^` encaixara
// mai -els mapes que seguixen `skillmap.exemple.json` estaven morts sencers i el
// hook callava sense que res ho delatara. Es relativitza abans de comparar; si el
// fitxer cau fora del projecte, es compara la ruta sencera com abans.
const normalitzat = relativitza(filePath);

function relativitza(fitxer) {
  const absolut = fitxer.replace(/\\/g, "/");
  try {
    const rel = path.relative(process.cwd(), fitxer).split(path.sep).join("/");
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return absolut;
    return rel;
  } catch (e) {
    return absolut;
  }
}

const candidats = [
  "skillmap.json",
  "ci-plantilla/skillmap.json",
  "kit-si-ua/ci-plantilla/skillmap.json",
  "kit-si-ua/ci-plantilla/skillmap.exemple.json",
];

let mapa = null;
for (const candidat of candidats) {
  if (fs.existsSync(candidat)) {
    try {
      mapa = JSON.parse(fs.readFileSync(candidat, "utf8"));
      break;
    } catch (e) {
      // JSON invàlid en este candidat: prova el següent en lloc de trencar el hook.
    }
  }
}

if (!mapa || !Array.isArray(mapa.regles)) process.exit(0);

for (const regla of mapa.regles) {
  const codi = regla.codi || [];
  const exclou = regla.exclou || [];

  const encaixa = codi.some((patro) => new RegExp(patro, "i").test(normalitzat));
  if (!encaixa) continue;

  const exclos = exclou.some((patro) => new RegExp(patro, "i").test(normalitzat));
  if (exclos) continue;

  const skills = (regla.skills || []).join(", ");
  const missatge = regla.missatge
    ? regla.missatge.replace(/\{\{fitxer\}\}/g, normalitzat)
    : `S'ha editat ${normalitzat}. Considera aplicar: ${skills}.`;

  // Es consulta ABANS de registrar: si no, la línia que acabem d'escriure seria
  // sempre la coincidència i el suggeriment no s'imprimiria mai.
  const repetit = jaSuggerida(regla.nom || null, sessio);

  registra("suggeriment", {
    regla: regla.nom || null,
    fitxer: normalitzat,
    skills: regla.skills || [],
    sessio,
  });

  if (repetit) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: missatge,
      },
    })
  );
  process.exit(0);
}
process.exit(0);
