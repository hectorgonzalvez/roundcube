#!/usr/bin/env node
'use strict';
/**
 * Una PR/MR cap a `Master` només pot vindre de `PREPRODUCCION` o portar l'etiqueta `hotfix`
 * (procediment de branques de la UA: les branques de desenvolupament entren a PREPRODUCCION).
 *
 * Naix en mode avís, com tota regla nova de ci-plantilla: amb `--warn` (el que posa
 * `instal·la-ci.js`) avisa i ix amb 0; sense, ix amb 1. Es passa a error quan el projecte ho decidix.
 *
 * Les branques i les etiquetes les dona `context-pr.js` (GitLab o Azure DevOps / TFS). En Azure les
 * etiquetes vénen de l'API i només es demanen si fan falta. Si no es poden llegir, no es dona per
 * bona la PR: es tracta com un incompliment i es diu el motiu. Els noms de branca es comparen sense
 * distingir majúscules.
 *
 * Camins: passa per la pipeline de PR. No passa per un push directe a Master (ho para la protecció
 * de branca del projecte, i en les sessions de l'agent, `bloqueja-main.sh`).
 */
const { branques, etiquetes } = require('./context-pr');

const avis = process.argv.includes('--warn');

function incompliment(msg) {
  if (avis) {
    console.warn('AVÍS: ' + msg);
    return;
  }
  console.error(msg);
  process.exitCode = 1;
}

async function main() {
  const pr = branques();
  if (!pr) {
    console.log('comprova-origen-mr: no és una pipeline de PR. No es comprova res.');
    return;
  }
  if (pr.desti.toLowerCase() !== 'master') return;

  let correcte = pr.origen.toLowerCase() === 'preproduccion';
  if (!correcte) {
    try {
      correcte = (await etiquetes()).includes('hotfix');
    } catch (e) {
      incompliment(`PR a Master des de ${pr.origen}: no s'han pogut llegir les etiquetes per a saber si és un hotfix: ${e.message}.`);
      return;
    }
  }
  if (correcte) {
    console.log(`comprova-origen-mr: PR a Master des de ${pr.origen}: correcte.`);
    return;
  }
  incompliment(`Una PR a Master ve de PREPRODUCCION o d'un hotfix (etiqueta «hotfix»), no de ${pr.origen}.`);
}

main();
