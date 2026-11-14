#!/usr/bin/env node
/**
 * Registre de disparadors: mesura si el bucle "el hook suggerix un skill -> l'skill
 * s'invoca de veres" es tanca. Respon la pregunta que l'ecosistema encara no sap
 * respondre: quines regles de `skillmap.json` serveixen, quines
 * són soroll, i quins skills s'invoquen sense que cap regla els haja suggerit.
 *
 * Des de la 1.55.0 respon també una segona pregunta, la dels hooks que avisen o
 * bloquegen: cal retirar-ne algun, modificar-lo o estendre'l a tot l'equip? Cada
 * hook d'eixos anota el que ha fet (`registraHook`) i l'informe ho llig en eixos
 * tres termes (secció «Hooks que avisen o bloquegen»).
 *
 * NO és una nova font de veritat (P2): és telemetria local, derivada i esborrable.
 * El fitxer (`.claude/registre-disparadors.jsonl`) està gitignorat -si es perd, es
 * torna a omplir sol. Cap decisió del pipeline en depén.
 *
 * Dos rols en un sol fitxer:
 *   - Mòdul: `require(...).registra(tipus, dades)` -l'usa suggereix-skills.js.
 *            `require(...).registraHook(hook, resultat, dades)` -l'usen els hooks JS.
 *   - CLI:   `node kit-si-ua/ci-plantilla/registre-disparadors.js invocacio <skill> [sessio]`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js hook <hook> <resultat> [sessio|-] [fitxer] [regla]`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js --informe [--json] [fitxer.jsonl...]`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js exporta-sessio <sessio>`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js completa-sessio <sessio> <transcripcio.jsonl>`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js completa-projecte [dir-transcripcions]`
 *            `node kit-si-ua/ci-plantilla/registre-disparadors.js --exporta`
 *
 * Mai llança: qualsevol error d'escriptura o de lectura es engolix. Un registre
 * trencat no pot trencar mai un hook ni un commit.
 *
 * Desactivar-lo en una màquina: `UA_REGISTRE_DISPARADORS=0`.
 * Moure el fitxer: `UA_REGISTRE_DISPARADORS=<ruta>`.
 * Moure el directori d'informes per sessió: `UA_TELEMETRIA=<ruta>`.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RUTA_PER_DEFECTE = path.join('.claude', 'registre-disparadors.jsonl');

/** Ruta del registre, o null si està desactivat o no hi ha on escriure. */
function rutaRegistre() {
  const env = process.env.UA_REGISTRE_DISPARADORS;
  if (env === '0' || env === 'false') return null;
  if (env) return env;
  // Sense `.claude/` no hi ha hooks muntats: no crees carpetes en projectes que no l'usen.
  if (!fs.existsSync('.claude')) return null;
  return RUTA_PER_DEFECTE;
}

/**
 * Afig un esdeveniment al registre. Silenciós per disseny.
 * @param {'suggeriment'|'invocacio'} tipus
 * @param {object} dades
 */
function registra(tipus, dades) {
  try {
    const ruta = rutaRegistre();
    if (!ruta) return;
    const linia = JSON.stringify(Object.assign({ ts: new Date().toISOString(), tipus }, dades));
    fs.appendFileSync(ruta, linia + '\n', 'utf8');
  } catch (e) {
    // Un registre que falla no pot degradar el hook que el crida.
  }
}

/* --------------------------------------------------------------------------
 * Hooks que avisen o bloquegen
 *
 * Per a decidir si un hook es retira, es modifica o s'estén cal saber dues
 * coses: quantes vegades actua, i sobre quantes sessions. La primera la dona
 * cada actuació; la segona, una línia `present` la primera vegada que el hook
 * calla en una sessió. Sense eixa línia, «no ha actuat mai» i «no està muntat»
 * es confonen, i la primera és motiu per a retirar-lo i la segona no.
 *
 * Els silencis següents no s'anoten: un hook de `Write|Edit` dispara a cada
 * edició, i el registre creixeria una línia per hook i per edició per a dir
 * sempre el mateix. La marca de «ja hi és en esta sessió» va a un directori
 * temporal del sistema, no a `.claude/`: no cal gitignorar res de nou, i si el
 * sistema l'esborra el pitjor que passa és una línia `present` repetida.
 *
 * El recompte és una cota inferior: un hook que peta abans d'arribar a la seua
 * línia, una còpia sense esta funció o una sessió amb el registre apagat no
 * compten. I només veu els camins per on el hook passa (README de
 * hooks-plantilla § «Cobertura dels hooks»): el que el hook no veu tampoc ho
 * compta.
 * -------------------------------------------------------------------------- */

/** Resultats que un hook pot anotar. `present` no es passa: el deriva `silenci`. */
const RESULTATS_HOOK = ['avis', 'bloqueig', 'oculta', 'bypass', 'silenci'];

// Un `session_id` o un nom de hook van a un nom de fitxer: res que no siga segur.
const segur = (t) => String(t || '').replace(/[^A-Za-z0-9._-]/g, '_');

const VIDA_MARQUES_MS = 7 * 24 * 3600 * 1000;

/**
 * Crea la marca (hook, sessió) i torna true si no hi era. Les marques van per
 * registre (hash de la seua ruta), perquè dos projectes -o dos proves- amb el
 * mateix `session_id` no es tapen l'un a l'altre.
 */
function marcaPresencia(ruta, sessio, hook) {
  const clau = crypto.createHash('sha1').update(path.resolve(ruta)).digest('hex').slice(0, 12);
  const dir = path.join(os.tmpdir(), 'ua-registre-hooks', clau);
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.writeFileSync(path.join(dir, `${segur(sessio)}.${segur(hook)}`), '', { flag: 'wx' });
  } catch (e) {
    return false;
  }
  // Només quan naix una marca nova, que és una vegada per hook i sessió: netejar
  // a cada crida costaria un `readdir` per edició.
  try {
    const ara = Date.now();
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (ara - fs.statSync(p).mtimeMs > VIDA_MARQUES_MS) fs.rmSync(p, { force: true });
    }
  } catch (e) {
    /* una marca que no s'esborra no fa mal */
  }
  return true;
}

/**
 * Anota el que ha fet un hook que avisa o bloqueja. Silenciós per disseny, com
 * `registra`: un registre trencat no pot canviar mai el que fa el hook.
 * @param {string} hook  nom del hook sense extensió (`comprova-edicio`)
 * @param {'avis'|'bloqueig'|'oculta'|'bypass'|'silenci'} resultat
 * @param {{sessio?: string, fitxer?: string, regla?: string}} dades
 *   `regla` és un identificador enumerat (l'script o el patró que ha actuat),
 *   mai text lliure: ix de la màquina amb `exporta-sessio`.
 */
function registraHook(hook, resultat, dades) {
  try {
    if (!hook || !RESULTATS_HOOK.includes(resultat)) return;
    const ruta = rutaRegistre();
    if (!ruta) return;
    const d = dades || {};
    const sessio = d.sessio || null;
    const nova = sessio ? marcaPresencia(ruta, sessio, hook) : false;
    if (resultat === 'silenci') {
      if (nova) registra('hook', { hook, resultat: 'present', sessio });
      return;
    }
    const linia = { hook, resultat, sessio };
    if (d.fitxer) linia.fitxer = d.fitxer;
    if (d.regla) linia.regla = d.regla;
    registra('hook', linia);
  } catch (e) {
    // Mateix contracte que `registra`.
  }
}

/** Llig un `.jsonl` del registre, descartant línies corruptes. */
function lligFitxer(ruta) {
  try {
    if (!fs.existsSync(ruta)) return [];
    return fs
      .readFileSync(ruta, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

/** Llig el registre sencer, descartant línies corruptes. */
function llig() {
  return lligFitxer(rutaRegistre() || RUTA_PER_DEFECTE);
}

/**
 * Agrupa els suggeriments bruts en **ocasions**: un parell (regla, fitxer, sessió).
 *
 * El hook dispara cada vegada que s'edita el fitxer, de manera que tornar tres
 * voltes al mateix component compta tres suggeriments encara que l'agent només
 * haja decidit una volta si atendre'l. Comptar el brut inflava la taxa de soroll
 * (26 esdeveniments reals = 3 ocasions). Es conserva el `ts` més antic: així una
 * invocació posterior continua correlacionant.
 */
function ocasions(suggeriments) {
  const perClau = new Map();
  for (const s of suggeriments) {
    const clau = [s.regla || '(sense nom)', s.fitxer || '', s.sessio || ''].join('|');
    const prev = perClau.get(clau);
    if (!prev) perClau.set(clau, Object.assign({}, s, { repeticions: 1 }));
    else {
      prev.repeticions += 1;
      if (s.ts < prev.ts) prev.ts = s.ts;
    }
  }
  return [...perClau.values()];
}

/**
 * Correlaciona suggeriments i invocacions.
 *
 * Un suggeriment es considera **seguit** si, en la mateixa sessió i en un moment
 * posterior, s'invoca algun dels skills que eixa regla proposava. Es correlaciona
 * per sessió i no per finestra de temps perquè el que interessa és si el
 * suggeriment ha canviat la conducta dins de la tasca, no com de ràpid.
 *
 * Un suggeriment no seguit es desglossa en dos casos que no volen dir el mateix:
 *   - `altreSkill`: en eixa sessió sí que es va invocar algun skill, però un altre.
 *     Això sí que és senyal contra la regla (la conducta existia i el mapa no la
 *     va encertar).
 *   - `capInvocacio`: en eixa sessió no es va invocar cap skill. No diu res sobre
 *     la regla -pot ser que la tasca no en necessitara cap.
 * Sense este desglossament, un 0% de seguiment és ininterpretable.
 */
function analitza(esdeveniments) {
  const bruts = esdeveniments.filter((e) => e.tipus === 'suggeriment');
  const suggeriments = ocasions(bruts);
  const invocacions = esdeveniments.filter((e) => e.tipus === 'invocacio');

  const perRegla = new Map();
  const sessionsSenseId = new Set();

  for (const s of suggeriments) {
    const clau = s.regla || '(sense nom)';
    if (!perRegla.has(clau)) {
      perRegla.set(clau, {
        regla: clau,
        skills: s.skills || [],
        suggeriments: 0,
        esdeveniments: 0,
        seguits: 0,
        altreSkill: 0,
        capInvocacio: 0,
        correlacionables: 0,
      });
    }
    const r = perRegla.get(clau);
    r.suggeriments += 1;
    r.esdeveniments += s.repeticions;

    if (!s.sessio) {
      sessionsSenseId.add(s.ts);
      continue;
    }
    r.correlacionables += 1;
    const posteriors = invocacions.filter((i) => i.sessio === s.sessio && i.ts >= s.ts);
    if (posteriors.some((i) => (s.skills || []).includes(i.skill))) r.seguits += 1;
    else if (posteriors.length) r.altreSkill += 1;
    else r.capInvocacio += 1;
  }

  // Skills invocats sense que cap regla del mapa els haja suggerit abans en eixa
  // sessió: forats del skillmap, no soroll. Són el senyal més accionable del registre.
  const forats = new Map();
  for (const i of invocacions) {
    const suggeritAbans = suggeriments.some(
      (s) => s.sessio && s.sessio === i.sessio && s.ts <= i.ts && (s.skills || []).includes(i.skill)
    );
    if (suggeritAbans) continue;
    forats.set(i.skill, (forats.get(i.skill) || 0) + 1);
  }

  return {
    total: {
      suggeriments: suggeriments.length,
      esdeveniments: bruts.length,
      invocacions: invocacions.length,
      // Només les sessions amb activitat d'skills: les dels hooks inflarien la mostra d'esta taula.
      sessions: new Set([...bruts, ...invocacions].map((e) => e.sessio).filter(Boolean)).size,
    },
    regles: [...perRegla.values()].sort((a, b) => b.suggeriments - a.suggeriments),
    forats: [...forats.entries()].map(([skill, n]) => ({ skill, invocacions: n })).sort((a, b) => b.invocacions - a.invocacions),
    suggerimentsSenseSessio: sessionsSenseId.size,
  };
}

/* --------------------------------------------------------------------------
 * Informes per sessió — el material que sí ix de la màquina
 *
 * El `.jsonl` de dalt és local i esborrable, i porta rutes absolutes de la
 * màquina de qui treballa: no s'entrega mai. El que s'entrega és el que escriu
 * `exporta-sessio`, i eixos fitxers naixen ja nets -camps enumerats i rutes
 * relatives al repositori-, de manera que qui els entrega pot obrir-los i vore
 * exactament què envia. Netejar en exportar en compte de en escriure deixaria
 * la decisió per al moment de més pressa; ací el fitxer entregable no existix
 * mai en forma bruta.
 *
 * Viuen FORA dels repositoris, un sol directori per màquina agrupat per
 * projecte. Dins de `.claude/` d'un projecte, un `git clean -xdf` o un clon nou
 * els esborraria sense que ningú se n'adonara, i «passa'm els informes» es
 * convertiria en una cacera per N projectes.
 * -------------------------------------------------------------------------- */

/** Només estos camps ixen de la màquina. Res de text lliure, res de rutes absolutes. */
function neteja(e) {
  const net = { ts: e.ts, tipus: e.tipus, sessio: e.sessio || null };
  if (e.regla) net.regla = e.regla;
  if (e.hook) net.hook = e.hook;
  if (e.resultat) net.resultat = e.resultat;
  if (e.skill) net.skill = e.skill;
  if (e.via === 'orde' || e.via === 'eina') net.via = e.via;
  if (Array.isArray(e.skills)) net.skills = e.skills;
  if (e.fitxer) net.fitxer = relativitza(e.fitxer);
  return net;
}

/**
 * Ruta relativa a l'arrel del projecte. Si el fitxer cau fora (un altre
 * repositori obert en la mateixa sessió), es queda només el nom: la ruta diria
 * com té organitzat el disc qui treballa, i això no és el que es mesura.
 */
function relativitza(fitxer) {
  try {
    const rel = path.relative(process.cwd(), fitxer);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return path.basename(fitxer);
    return rel.split(path.sep).join('/');
  } catch (e) {
    return path.basename(String(fitxer));
  }
}

/** Directori d'informes de la màquina, o null si la telemetria està desactivada. */
function directoriBase() {
  const env = process.env.UA_REGISTRE_DISPARADORS;
  if (env === '0' || env === 'false') return null;
  return process.env.UA_TELEMETRIA || path.join(os.homedir(), '.claude', 'telemetria-ua');
}

function nomProjecte() {
  return path.basename(process.cwd()).replace(/[^A-Za-z0-9._-]/g, '-') || 'projecte';
}

/**
 * Escriu l'informe d'una sessió. El crida el hook de `SessionEnd`.
 * Reescriu el fitxer sencer en lloc d'afegir-hi: si el hook dispara dos voltes
 * per a la mateixa sessió, el resultat és el mateix i no es dupliquen entrades.
 * Torna la ruta escrita, o null si no hi havia res a escriure.
 */
function exportaSessio(sessio) {
  try {
    const base = directoriBase();
    if (!base || !sessio) return null;
    const esdeveniments = llig().filter((e) => e.sessio === sessio);
    if (!esdeveniments.length) return null;

    const dir = path.join(base, nomProjecte());
    fs.mkdirSync(dir, { recursive: true });
    const data = (esdeveniments[0].ts || new Date().toISOString()).slice(0, 10);
    const ruta = path.join(dir, `${data}-${sessio}.jsonl`);
    fs.writeFileSync(ruta, esdeveniments.map((e) => JSON.stringify(neteja(e))).join('\n') + '\n', 'utf8');
    return ruta;
  } catch (e) {
    return null;
  }
}

/** Tots els informes per sessió de la màquina, agrupats per projecte. */
function informesLocals() {
  const base = directoriBase();
  if (!base || !fs.existsSync(base)) return [];
  const resultat = [];
  // Només es llig un nivell de subdirectoris: les exportacions ja fusionades es
  // deixen a l'arrel de `base`, i així mai s'exporta una exportació.
  for (const projecte of fs.readdirSync(base)) {
    const dir = path.join(base, projecte);
    let fitxers;
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
      fitxers = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    } catch (e) {
      continue;
    }
    for (const f of fitxers) resultat.push({ projecte, ruta: path.join(dir, f) });
  }
  return resultat;
}

/**
 * Fusiona tot el que té esta màquina en UN fitxer llest per a entregar al
 * coordinador de qualitat. La idea és que entregar-ho siga una orde i no una
 * recopilació: si costa buscar els fitxers, no s'entreguen.
 */
function exporta() {
  const base = directoriBase();
  if (!base) {
    console.log('Telemetria desactivada en esta màquina (UA_REGISTRE_DISPARADORS=0). Res a exportar.');
    return;
  }
  const informes = informesLocals();
  if (!informes.length) {
    console.log('No hi ha cap informe de sessió en esta màquina.');
    console.log(`Directori esperat: ${base}`);
    console.log("S'omplin sols en tancar-se cada sessió, si el hook `SessionEnd` està muntat.");
    return;
  }

  const linies = [];
  const perProjecte = new Map();
  const sessions = new Set();
  for (const { projecte, ruta } of informes) {
    let contingut;
    try {
      contingut = fs.readFileSync(ruta, 'utf8');
    } catch (e) {
      continue;
    }
    for (const l of contingut.split('\n').filter(Boolean)) {
      let e;
      try {
        e = JSON.parse(l);
      } catch (err) {
        continue;
      }
      e.projecte = projecte;
      linies.push(JSON.stringify(e));
      if (e.sessio) sessions.add(e.sessio);
      perProjecte.set(projecte, (perProjecte.get(projecte) || 0) + 1);
    }
  }

  // El nom de la màquina va al nom del fitxer, no dins de les entrades: serveix
  // perquè al coordinador no se li sobreescriguen dos entregues, i qui l'entrega
  // el veu abans d'enviar-lo.
  const maquina = String(os.hostname() || 'maquina').replace(/[^A-Za-z0-9._-]/g, '-');
  const ruta = path.join(base, `telemetria-${maquina}-${new Date().toISOString().slice(0, 10)}.jsonl`);
  try {
    fs.writeFileSync(ruta, linies.join('\n') + '\n', 'utf8');
  } catch (e) {
    console.error(`No s'ha pogut escriure ${ruta}: ${e.message}`);
    return;
  }

  console.log(`Informe per a entregar: ${ruta}`);
  console.log(`${linies.length} esdeveniments · ${sessions.size} sessions · ${perProjecte.size} projectes`);
  for (const [projecte, n] of [...perProjecte.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${projecte.padEnd(28)} ${String(n).padStart(5)} esdeveniments`);
  }
  console.log('\nConté noms de skill, de hook i de regla, rutes relatives al projecte i marques de temps.');
  console.log("Cap text de conversa, cap ruta absoluta. Obri'l abans d'enviar-lo si vols comprovar-ho.");
}

function percent(part, total) {
  if (!total) return '—';
  return Math.round((part / total) * 100) + '%';
}

/**
 * Llig el registre en els tres termes de la decisió que el motiva: retirar,
 * modificar o estendre cada hook. Cap dels tres és un veredicte -l'informe
 * apunta candidats, la decisió és de qui mantén el catàleg-:
 *
 *   - **Retirar?** Present en una mostra suficient i no ha actuat mai: costa
 *     temps a cada crida i no ha parat res.
 *   - **Modificar?** Algun `bypass` (cada un és un fals positiu declarat per qui
 *     l'aixeca) o actuacions que es repetixen sobre el mateix fitxer en la
 *     mateixa sessió (l'avís no es corregix: o no s'entén, o acusa quan no toca).
 *     Només els hooks que anoten fitxer poden repetir-se en este sentit.
 *   - **Estendre?** Actua en una mostra suficient sense bypass ni repeticions:
 *     candidat a passar a l'oferta general o, si està en avís, a la promoció de
 *     `ci-plantilla/README.md` § «Naixen en avís».
 *
 * `oculta` no compta per a les repeticions: tornar a llegir el mateix fitxer
 * torna a ocultar el mateix secret, i això és el hook fent la seua faena.
 *
 * Les xarxes de seguretat (secrets i branca protegida) no reben mai «retirar?»:
 * paren un cas rar i car, i zero actuacions és el que s'espera d'elles, no el
 * senyal que sobren. Per a eixes, l'informe diu «xarxa» i la decisió de
 * retirar-les no es pren amb este recompte.
 */
const MOSTRA_HOOKS = 10;
const XARXES = new Set(['refusa-secrets-edicio', 'comprova-secrets-commit', 'oculta-secrets-eixida', 'bloqueja-main', 'revisa-prompt', 'guarda-shell']);

function analitzaHooks(esdeveniments) {
  const linies = esdeveniments.filter((e) => e.tipus === 'hook' && e.hook);
  const perHook = new Map();
  const repeticions = new Map();
  for (const e of linies) {
    if (!perHook.has(e.hook)) {
      perHook.set(e.hook, { hook: e.hook, sessions: new Set(), avis: 0, bloqueig: 0, oculta: 0, bypass: 0, repetits: 0, regles: {} });
    }
    const h = perHook.get(e.hook);
    if (e.sessio) h.sessions.add(e.sessio);
    if (['avis', 'bloqueig', 'oculta', 'bypass'].includes(e.resultat)) h[e.resultat] += 1;
    if (e.regla && e.resultat !== 'present') h.regles[e.regla] = (h.regles[e.regla] || 0) + 1;
    // Només amb fitxer: sense ell, una repetició és el mateix avís en un altre torn (el canari, els
    // avisos d'arrencada després d'un `compact`), i això no diu que l'avís no es corregisca.
    if ((e.resultat === 'avis' || e.resultat === 'bloqueig') && e.sessio && e.fitxer) {
      const clau = [e.hook, e.sessio, e.fitxer].join('|');
      repeticions.set(clau, (repeticions.get(clau) || 0) + 1);
    }
  }
  for (const [clau, n] of repeticions) {
    if (n > 1) perHook.get(clau.split('|')[0]).repetits += 1;
  }

  const hooks = [...perHook.values()].map((h) => {
    const sessions = h.sessions.size;
    const actuacions = h.avis + h.bloqueig + h.oculta;
    let lectura = 'mostra petita';
    if (h.bypass || h.repetits) lectura = 'modificar?';
    else if (sessions >= MOSTRA_HOOKS && !actuacions) lectura = XARXES.has(h.hook) ? 'xarxa, cap actuació' : 'retirar?';
    else if (sessions >= MOSTRA_HOOKS) lectura = 'estendre?';
    return Object.assign({}, h, { sessions, actuacions, lectura });
  });
  return { mostra: MOSTRA_HOOKS, hooks: hooks.sort((a, b) => b.actuacions - a.actuacions || a.hook.localeCompare(b.hook)) };
}

/**
 * Els hooks que la configuració connecta i que s'anoten al registre, però que no hi tenen cap línia
 * (1.62.0). L'informe de dalt només veu els hooks que han escrit alguna cosa, i un que no corre
 * -peta en arrancar, falta `node`, el `matcher` ja no casa perquè l'eina ha canviat- simplement no
 * hi apareixia. En `PreToolUse` eixe hook deixa passar l'acció, i per a una xarxa és l'única manera
 * de distingir «zero actuacions» de «no corre».
 *
 * Només amb `MOSTRA_HOOKS` sessions al registre o més (de qualsevol tipus de línia): amb menys, un
 * registre nou i un hook mort no es distingixen. Un hook d'ocasió rara (`avisa-pr-sense-obri-pr`
 * només corre en obrir una PR des de la sessió) pot eixir-hi sense estar mort: per això diu
 * «comprova que corre», no «mort».
 *
 * Llig la configuració de `arrel`. Sense `hooks-connectats.js` (còpia anterior) torna buit.
 */
function analitzaConnexio(esdeveniments, hooks, arrel) {
  const sessions = new Set(esdeveniments.map((e) => e.sessio).filter(Boolean)).size;
  const eixida = { sessions, senseLinia: [] };
  if (sessions < MOSTRA_HOOKS) return eixida;
  let connexio;
  try {
    connexio = require('./hooks-connectats.js');
  } catch (e) {
    return eixida;
  }
  const ambLinies = new Set(hooks.map((h) => h.hook));
  const { scripts } = connexio.hooksConnectats(arrel);
  for (const script of [...scripts.keys()].sort()) {
    const nom = connexio.nomAlRegistre(path.join(arrel, '.claude', 'hooks', script));
    if (nom && !ambLinies.has(nom)) eixida.senseLinia.push({ hook: nom, script });
  }
  return eixida;
}

function informeConnexio(connexio) {
  if (!connexio || !connexio.senseLinia.length) return;
  console.log(`\n  Connectats i sense cap línia en ${connexio.sessions} sessions -comprova que corren:`);
  for (const h of connexio.senseLinia) console.log(`    ${h.script}`);
  console.log(
    "  Un hook que no corre deixa passar l'acció sense rastre. Si no és que no ha tingut ocasió" +
      "\n  (un hook de PR en un període sense PR), executa'l a mà amb una entrada de prova."
  );
}

function informeHooks(dades) {
  if (!dades.hooks.length) {
    console.log('\nHooks que avisen o bloquegen: cap línia al registre.');
    console.log('  Cap hook adoptat anota res encara (cal hooks-plantilla >= 5.28.0 i ci-plantilla >= 1.55.0).');
    informeConnexio(dades.connexio);
    return;
  }
  console.log('\nHooks que avisen o bloquegen (una sessió = una sessió on el hook ha corregut almenys una vegada):');
  for (const h of dades.hooks) {
    console.log(
      `  ${h.hook.padEnd(26)} ${String(h.sessions).padStart(4)} sessions · ` +
        `${String(h.avis).padStart(3)} avisos · ${String(h.bloqueig).padStart(3)} bloquejos · ` +
        `${String(h.oculta).padStart(3)} ocultacions · ${String(h.bypass).padStart(3)} bypass · ` +
        `${String(h.repetits).padStart(3)} repetits  -> ${h.lectura}`
    );
    const regles = Object.entries(h.regles).sort((a, b) => b[1] - a[1]);
    if (regles.length) console.log(`  ${''.padEnd(26)} per regla: ${regles.map(([r, n]) => `${r} ${n}`).join(', ')}`);
  }
  console.log(
    '\n  retirar?   present en ' + dades.mostra + ' sessions o més i no ha actuat mai. Les xarxes de seguretat' +
      '\n             (secrets i branca protegida) no: zero és el que s\'espera d\'elles.' +
      '\n  modificar? algun bypass (fals positiu declarat) o la mateixa actuació repetida sobre el mateix fitxer en una sessió.' +
      '\n  estendre?  actua en ' + dades.mostra + ' sessions o més sense bypass ni repeticions.' +
      '\n  Són candidats, no veredictes. El recompte és una cota inferior: un hook que peta abans' +
      '\n  d\'anotar, una còpia antiga o el registre apagat (UA_REGISTRE_DISPARADORS=0) no compten,' +
      '\n  i el que el hook no veu (una escriptura per Bash, un push des de l\'IDE) tampoc.'
  );
  if (dades.hooks.some((h) => h.lectura === 'mostra petita')) {
    console.log(`  Amb menys de ${dades.mostra} sessions, un hook no rep cap lectura: falta població.`);
  }
  informeConnexio(dades.connexio);
}

function informe() {
  // Fitxers passats per argument (les entregues de `--exporta` de cada màquina) en lloc del
  // registre local: és com es respon «l'estenem a tot l'equip?», que una sola màquina no sap.
  const fitxers = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const esdeveniments = fitxers.length ? fitxers.flatMap(lligFitxer) : llig();
  const dades = analitza(esdeveniments);
  dades.hooks = analitzaHooks(esdeveniments);
  dades.hooks.connexio = analitzaConnexio(esdeveniments, dades.hooks.hooks, process.cwd());

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(dades, null, 2) + '\n');
    return;
  }

  const ambSkills = dades.total.suggeriments || dades.total.invocacions;
  if (!ambSkills && !dades.hooks.hooks.length) {
    console.log('Registre buit. El fitxer s\'omple sol a mesura que els hooks disparen.');
    console.log(`Ruta esperada: ${fitxers.length ? fitxers.join(', ') : rutaRegistre() || RUTA_PER_DEFECTE}`);
    return;
  }
  if (ambSkills) informeSkills(dades);
  else console.log("Registre de disparadors — skillmap.json: cap suggeriment ni invocació d'skill.");
  informeHooks(dades.hooks);
}

function informeSkills(dades) {
  console.log('Registre de disparadors — skillmap.json');
  console.log(
    `${dades.total.suggeriments} ocasions de suggeriment (${dades.total.esdeveniments} esdeveniments bruts) · ` +
      `${dades.total.invocacions} invocacions d'skill · ${dades.total.sessions} sessions\n`
  );

  console.log("Per regla del mapa (una ocasió = un parell fitxer/sessió, no cada re-edició):");
  for (const r of dades.regles) {
    const taxa = percent(r.seguits, r.correlacionables);
    console.log(
      `  ${r.regla.padEnd(24)} ${String(r.suggeriments).padStart(4)} ocasions · ` +
        `${String(r.seguits).padStart(4)} seguits (${taxa}) · ` +
        `${String(r.altreSkill).padStart(3)} altre skill · ${String(r.capInvocacio).padStart(3)} cap invocació`
    );
  }

  if (dades.forats.length) {
    console.log('\nSkills invocats sense suggeriment previ (candidats a regla nova al skillmap):');
    for (const f of dades.forats) {
      console.log(`  ${f.skill.padEnd(24)} ${String(f.invocacions).padStart(4)} invocacions`);
    }
  }

  // Només és senyal contra una regla si en eixa sessió es va invocar un ALTRE skill:
  // vol dir que hi havia conducta i el mapa no la va encertar. Un 0% fet només de
  // sessions sense cap invocació no acusa la regla, acusa la mostra.
  const mortes = dades.regles.filter((r) => !r.seguits && r.altreSkill);
  if (mortes.length) {
    console.log("\nRegles que disparen i mai s'atenen, havent-hi conducta (candidates a revisar o llevar):");
    for (const r of mortes) {
      console.log(`  ${r.regla} (${r.suggeriments} ocasions, 0 seguits, ${r.altreSkill} amb un altre skill)`);
    }
  }

  const sensePoblacio = dades.regles.filter((r) => !r.seguits && !r.altreSkill && r.capInvocacio);
  if (sensePoblacio.length) {
    console.log('\nRegles sense dades concloents (van disparar, però en eixes sessions no es va invocar cap skill):');
    for (const r of sensePoblacio) console.log(`  ${r.regla} (${r.capInvocacio} ocasions sense cap invocació)`);
    console.log("  -> No en tragues conclusions: falta població, no és soroll de la regla.");
  }

  if (dades.total.sessions < 10 || dades.total.invocacions === 0) {
    console.log(
      `\nAvís de mostra: ${dades.total.sessions} sessions i ${dades.total.invocacions} invocacions registrades.` +
        '\nAmb esta mida cap percentatge d\'esta taula és concloent.'
    );
  }

  if (dades.suggerimentsSenseSessio) {
    console.log(`\nNota: ${dades.suggerimentsSenseSessio} suggeriments sense identificador de sessió -no correlacionables.`);
    console.log('Passa amb registres anteriors a la v1.11.0 de ci-plantilla, o si el hook no passa la sessió.');
  }
}

/* --------------------------------------------------------------------------
 * Invocacions que el hook de `Skill` no veu
 *
 * `registra-invocacio-skill.sh` és un PostToolUse de l'eina `Skill`: només veu
 * els skills que carrega el model. Quan la persona escriu `/handoff` o
 * `/ua-skills:auditoria`, Claude Code expandix l'skill o l'orde sense passar
 * per l'eina, i el hook no s'assabenta. Mesurat a `cdp` el 2026-11-13: 8
 * invocacions registrades contra més de 70 a les transcripcions.
 *
 * La transcripció sí que ho té: el missatge `<command-name>/x</command-name>`
 * de la persona, seguit, amb el mateix `promptId`, del cos expandit (`isMeta`,
 * contingut en llista). Una orde de l'eina (`/model`, `/clear`, `/compact`) no
 * porta eixe cos: o no porta res o porta text pla `<local-command-…>`. Així es
 * distingixen sense llista d'ordes.
 *
 * `completaSessio` compara la transcripció amb el registre de la sessió i hi
 * afig només la diferència, amb `via: 'orde'` o `via: 'eina'`. És idempotent:
 * si el `SessionEnd` dispara dues voltes, o la sessió es reprén, no duplica.
 * -------------------------------------------------------------------------- */

/** Text pla del contingut d'un missatge de la transcripció. */
function textMissatge(contingut) {
  if (typeof contingut === 'string') return contingut;
  if (!Array.isArray(contingut)) return '';
  return contingut
    .filter((c) => c && c.type === 'text')
    .map((c) => c.text || '')
    .join('\n');
}

/**
 * Invocacions d'skill o d'orde d'una transcripció de Claude Code.
 * @returns {{skill: string, ts: string|null, via: 'orde'|'eina'}[]}
 */
function invocacionsTranscripcio(ruta) {
  let linies;
  try {
    linies = fs.readFileSync(ruta, 'utf8').split(/\r?\n/);
  } catch (e) {
    return [];
  }
  const entrades = [];
  for (const l of linies) {
    if (!l.trim()) continue;
    try {
      entrades.push(JSON.parse(l));
    } catch (e) {
      /* línia corrupta: es descarta */
    }
  }
  const resultat = [];
  for (let i = 0; i < entrades.length; i++) {
    const e = entrades[i];
    if (e.isSidechain || !e.message) continue;
    const contingut = e.message.content;
    if (e.type === 'assistant' && Array.isArray(contingut)) {
      for (const c of contingut) {
        if (c && c.type === 'tool_use' && c.name === 'Skill' && c.input && c.input.skill) {
          resultat.push({ skill: String(c.input.skill).replace(/^\//, ''), ts: e.timestamp || null, via: 'eina' });
        }
      }
      continue;
    }
    if (e.type !== 'user' || typeof contingut !== 'string') continue;
    const m = contingut.match(/<command-name>\/([^<\s]+)<\/command-name>/);
    // Sense promptId no es pot lligar al seu cos: `/clear` no en porta, i el missatge
    // següent ja és el prompt nou de la persona.
    if (!m || !e.promptId) continue;
    // El cos expandit és el missatge següent de la persona amb el mateix promptId.
    const seguent = entrades
      .slice(i + 1, i + 6)
      .find((x) => x.type === 'user' && x.message && x.promptId === e.promptId);
    // El cos expandit d'un skill o d'una orde és un missatge `isMeta` amb contingut en
    // llista. El de les ordes de l'eina és text pla (`<local-command-…>`) o no n'hi ha.
    if (!seguent || !seguent.isMeta || !Array.isArray(seguent.message.content)) continue;
    const cos = textMissatge(seguent.message.content);
    if (!cos.trim() || /^\s*<(local-command|command-name)/.test(cos)) continue;
    resultat.push({ skill: m[1], ts: e.timestamp || null, via: 'orde' });
  }
  return resultat;
}

/**
 * Afig al registre les invocacions de la transcripció que hi falten per a la
 * sessió. Torna quantes n'ha afegides. Mai llança.
 */
function completaSessio(sessio, transcripcio) {
  try {
    const ruta = rutaRegistre();
    if (!ruta || !sessio || !transcripcio) return 0;
    const reals = invocacionsTranscripcio(transcripcio);
    if (!reals.length) return 0;
    const jaHiSon = new Map();
    for (const e of llig()) {
      if (e.tipus === 'invocacio' && e.sessio === sessio) jaHiSon.set(e.skill, (jaHiSon.get(e.skill) || 0) + 1);
    }
    const vistes = new Map();
    let afegides = 0;
    for (const r of reals) {
      const n = (vistes.get(r.skill) || 0) + 1;
      vistes.set(r.skill, n);
      if (n <= (jaHiSon.get(r.skill) || 0)) continue;
      const linia = { ts: r.ts || new Date().toISOString(), tipus: 'invocacio', skill: r.skill, sessio, via: r.via };
      fs.appendFileSync(ruta, JSON.stringify(linia) + '\n', 'utf8');
      afegides++;
    }
    return afegides;
  } catch (e) {
    return 0;
  }
}

/**
 * Directori de transcripcions de Claude Code per al projecte del directori
 * actual: `~/.claude/projects/<ruta amb cada caràcter no alfanumèric com a ->`.
 */
function dirTranscripcions() {
  return path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^A-Za-z0-9]/g, '-'));
}

/**
 * Completa totes les sessions amb transcripció d'este projecte i n'exporta les
 * que han canviat. Servix per a una màquina on el hook encara no existia, o
 * per a recuperar l'historial abans d'un `--exporta`.
 */
function completaProjecte(dir) {
  const d = dir || dirTranscripcions();
  if (!rutaRegistre()) return { error: "no hi ha `.claude/` al directori actual o el registre està desactivat" };
  if (!fs.existsSync(d)) return { error: `no hi ha transcripcions a ${d}` };
  let sessions = 0;
  let afegides = 0;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.jsonl'))) {
    const sessio = path.basename(f, '.jsonl');
    const n = completaSessio(sessio, path.join(d, f));
    sessions++;
    afegides += n;
    if (n) exportaSessio(sessio);
  }
  return { dir: d, sessions, afegides };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--informe')) {
    informe();
  } else if (args.includes('--exporta')) {
    exporta();
  } else if (args[0] === 'invocacio' && args[1]) {
    registra('invocacio', { skill: args[1], sessio: args[2] || null });
  } else if (args[0] === 'hook' && args[1] && args[2]) {
    // Els hooks de shell: `node registre-disparadors.js hook <hook> <resultat> [sessio] [fitxer] [regla]`.
    // Amb `-` com a sessió, la llig del JSON de l'esdeveniment per stdin: el hook de shell li passa
    // la seua entrada tal qual i no ha de tocar el parser amb què ja llig l'orde o la ruta.
    let sessio = args[3] || null;
    if (sessio === '-') {
      try {
        sessio = JSON.parse(fs.readFileSync(0, 'utf8')).session_id || null;
      } catch (e) {
        sessio = null;
      }
    }
    registraHook(args[1], args[2], { sessio, fitxer: args[4] || null, regla: args[5] || null });
  } else if (args[0] === 'exporta-sessio' && args[1]) {
    exportaSessio(args[1]);
  } else if (args[0] === 'completa-sessio' && args[1] && args[2]) {
    const n = completaSessio(args[1], args[2]);
    if (args.includes('--verbos')) console.log(`${n} invocacions afegides`);
  } else if (args[0] === 'completa-projecte') {
    const r = completaProjecte(args[1]);
    if (r.error) {
      console.error(`completa-projecte: ${r.error}`);
      process.exit(1);
    }
    console.log(`${r.afegides} invocacions afegides de ${r.sessions} transcripcions (${r.dir})`);
  } else {
    console.error('Ús: node kit-si-ua/ci-plantilla/registre-disparadors.js --informe [--json] [fitxer.jsonl...]');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js --exporta');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js invocacio <skill> [sessio]');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js hook <hook> <resultat> [sessio|-] [fitxer] [regla]');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js exporta-sessio <sessio>');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js completa-sessio <sessio> <transcripcio.jsonl> [--verbos]');
    console.error('    node kit-si-ua/ci-plantilla/registre-disparadors.js completa-projecte [dir-transcripcions]');
    process.exit(1);
  }
}

module.exports = {
  registra,
  registraHook,
  llig,
  analitza,
  analitzaHooks,
  analitzaConnexio,
  exportaSessio,
  exporta,
  invocacionsTranscripcio,
  completaSessio,
  completaProjecte,
};
