'use strict';
/**
 * Què sap una pipeline de la PR que l'ha disparada, siga GitLab o Azure DevOps / TFS.
 * Mòdul de `comprova-descripcio-mr.js` i `comprova-origen-mr.js`, no un check.
 *
 * GitLab ho passa tot en variables. Azure només hi passa les branques: la descripció i les
 * etiquetes s'han de demanar a l'API, amb el token de la pipeline, que no arriba als scripts si el
 * pas no el mapeja (`env: SYSTEM_ACCESSTOKEN: $(System.AccessToken)`). Quan no es pot llegir, es
 * llança un error que ho explica: qui crida l'ha de dir, perquè un check que no ha pogut mirar no
 * pot acabar com si haguera mirat.
 *
 * api-version 5.0 és Azure DevOps Server 2019, el mínim que entén YAML. El recurs d'etiquetes hi és
 * encara en preview.
 */

const senseRefs = (branca) => (branca || '').replace(/^refs\/heads\//, '');

/** Les branques de la PR, o null si esta pipeline no ve d'una PR. */
function branques(env = process.env) {
  if (env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME !== undefined) {
    return {
      desti: env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME,
      origen: env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME || '',
    };
  }
  if (env.SYSTEM_PULLREQUEST_TARGETBRANCH !== undefined) {
    return {
      desti: senseRefs(env.SYSTEM_PULLREQUEST_TARGETBRANCH),
      origen: senseRefs(env.SYSTEM_PULLREQUEST_SOURCEBRANCH),
    };
  }
  return null;
}

async function apiAzure(env, sufix, versio) {
  const token = env.SYSTEM_ACCESSTOKEN;
  // `$(System.AccessToken)` arriba literal si la variable no s'ha resolt.
  if (!token || token.startsWith('$(')) {
    throw new Error('falta SYSTEM_ACCESSTOKEN: el pas ha de portar «env: SYSTEM_ACCESSTOKEN: $(System.AccessToken)»');
  }
  const coleccio = env.SYSTEM_COLLECTIONURI || env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI;
  const projecte = env.SYSTEM_TEAMPROJECTID || env.SYSTEM_TEAMPROJECT;
  const repositori = env.BUILD_REPOSITORY_ID;
  const pr = env.SYSTEM_PULLREQUEST_PULLREQUESTID;
  if (!coleccio || !projecte || !repositori || !pr) {
    throw new Error("falten variables de la pipeline (col·lecció, projecte, repositori o número de PR)");
  }
  if (typeof fetch !== 'function') throw new Error("cal Node 18 o posterior a l'agent");

  const base = coleccio.replace(/\/?$/, '/');
  const url =
    `${base}${encodeURIComponent(projecte)}/_apis/git/repositories/${encodeURIComponent(repositori)}` +
    `/pullRequests/${encodeURIComponent(pr)}${sufix}?api-version=${versio}`;
  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new Error(`no s'ha pogut connectar amb el servidor (${(e.cause && e.cause.code) || e.message})`);
  }
  // Un token invàlid pot tornar 203 amb la pàgina d'entrada en HTML: només val un 200 amb JSON.
  if (resposta.status !== 200) {
    throw new Error(`el servidor ha contestat ${resposta.status}; mira que el servei de compilació puga llegir el repositori`);
  }
  try {
    return await resposta.json();
  } catch (e) {
    throw new Error('el servidor no ha contestat JSON');
  }
}

/** La descripció de la PR; undefined si esta pipeline no ve d'una PR. Llança si no es pot llegir. */
async function descripcio(env = process.env) {
  if (env.CI_MERGE_REQUEST_DESCRIPTION !== undefined) return env.CI_MERGE_REQUEST_DESCRIPTION;
  if (env.SYSTEM_PULLREQUEST_TARGETBRANCH === undefined) return undefined;
  return (await apiAzure(env, '', '5.0')).description || '';
}

/** Les etiquetes de la PR, en minúscules. Llança si no es poden llegir. */
async function etiquetes(env = process.env) {
  if (env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME !== undefined) {
    return (env.CI_MERGE_REQUEST_LABELS || '').split(',').map((e) => e.trim().toLowerCase());
  }
  const r = await apiAzure(env, '/labels', '5.0-preview.1');
  return (r.value || []).map((e) => String(e.name).toLowerCase());
}

module.exports = { branques, descripcio, etiquetes };
