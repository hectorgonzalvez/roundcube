'use strict';
/**
 * On viu el kit de documentació dins d'un projecte.
 *
 * Des de kit-projecte 3.0.0 tot el kit va dins de `doc-projecte/` (`kit-projecte/VERSION.md`
 * § 3.0.0); a l'arrel només es queden els fitxers que una eina
 * busca allí (`CLAUDE.md`, `AGENTS.md`, `.gitlab/`, `.claude/`). L'antic `docs/` s'aplana: el que
 * era `docs/historial-bugs.md` ara és `doc-projecte/historial-bugs.md`.
 *
 * El disseny és del projecte, no de cada fitxer: es decidix una vegada (hi ha `doc-projecte/` o
 * no) i totes les rutes el seguixen, també les dels missatges de "falta". Resoldre fitxer a fitxer
 * acabaria demanant crear a `doc-projecte/` el que falta d'un projecte que encara és a l'arrel, i
 * el deixaria amb els dos dissenys barrejats. Un projecte sense migrar continua funcionant.
 */
const fs = require('fs');
const path = require('path');

const DIR_KIT = 'doc-projecte';

// On estava cada fitxer abans de 3.0.0, quan no és a l'arrel amb el mateix nom.
const ANTIC = {
  'historial-decisions.md': path.join('docs', 'historial-decisions.md'),
  'historial-bugs.md': path.join('docs', 'historial-bugs.md'),
  producte: path.join('docs', 'producte'),
  [path.join('producte', 'README.md')]: path.join('docs', 'producte', 'README.md'),
  '.kit-version': path.join('docs', '.kit-version'),
};

function esDissenyNou(dir) {
  return fs.existsSync(path.join(dir, DIR_KIT));
}

// `rel` és la ruta dins de `doc-projecte/` (p. ex. 'historial-bugs.md' o 'producte').
function rutaNova(rel) {
  return path.join(DIR_KIT, rel);
}

function rutaAntiga(rel) {
  return ANTIC[rel] || rel;
}

// La ruta que toca segons el disseny del projecte, existisca o no el fitxer.
function ruta(dir, rel) {
  return esDissenyNou(dir) ? rutaNova(rel) : rutaAntiga(rel);
}

// La ruta del disseny que el projecte NO usa: si hi ha alguna cosa, és una còpia que sobra.
function rutaAltra(dir, rel) {
  return esDissenyNou(dir) ? rutaAntiga(rel) : rutaNova(rel);
}

// Amb barres cap avant, per als missatges i per a comparar amb el text dels punters.
function barres(r) {
  return r.split(path.sep).join('/');
}

module.exports = { DIR_KIT, esDissenyNou, rutaNova, rutaAntiga, ruta, rutaAltra, barres };
