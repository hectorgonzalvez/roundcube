#!/usr/bin/env node
/**
 * Canari de context — AVISA i MAI bloqueja (§51.C: naix en mode avís).
 *
 * Què fa
 * ------
 * Comprova a cada torn que l'agent continua seguint `doc-projecte/CONTEXT-IA.md`. Dos meitats, un
 * sol script:
 *
 *   node canari.js inicia    (SessionStart) → tria una paraula aleatòria per a la sessió, la guarda
 *                                             a `.claude/canari/<session_id>` i la dona a Claude
 *                                             com a `additionalContext`: «Paraula de canari d'esta
 *                                             sessio: `garrofer-47`». Res més: ni què fer-ne.
 *   node canari.js comprova  (Stop)         → mira si l'última resposta porta la paraula. Si no la
 *                                             porta, avisa la persona per `systemMessage`.
 *
 * Què fer amb la paraula ho diu `CONTEXT-IA.md` § "Comportament de l'agent" (acabar cada resposta
 * amb `🐤 <paraula>`), i només ho diu allí. Eixe repartiment és tot el mecanisme.
 *
 * Per què no n'hi ha prou amb un canari escrit al CLAUDE.md
 * ---------------------------------------------------------
 * El truc clàssic (una regla fixa del tipus «acaba cada resposta amb 🐤») té tres forats:
 *
 *   1. **Ningú el mira.** Depén que la persona note que el canari ha deixat de cantar, i després de
 *      dos dies ja no el llig. Ací el compara el hook de `Stop` a cada torn, i només parla quan falta.
 *   2. **Es pot portar d'una altra banda.** Una marca fixa la porta qualsevol sessió vella, exemple
 *      o fitxer del repositori. Una paraula nova a cada sessió, que no és enlloc, no es pot endevinar
 *      ni arrossegar d'una conversa anterior.
 *   3. **Només vigila un camí.** Ací la regla i la paraula viatgen per camins
 *      diferents (l'`@import` del CLAUDE.md i el hook d'arrencada) i el canari només canta si
 *      arriben les dos. Un `@doc-projecte/CONTEXT-IA.md` trencat després d'una migració, un
 *      `CLAUDE.md` que no es carrega perquè la sessió s'ha obert en una altra carpeta: tot acaba
 *      igual, sense 🐤, i tot es veu.
 *
 * Per què es renova en `compact` i no en `resume`
 * -----------------------------------------------
 * En `startup` i `clear` comença una conversa nova: paraula nova. En `compact` també, perquè el
 * resum porta les respostes anteriors i, amb elles, la paraula vella: renovar-la és el que obliga
 * a tornar a llegir la regla en lloc de copiar el resum. En `resume` es manté: la conversa és la
 * mateixa, i canviar-la faria fallar la primera resposta sense que res s'haja degradat.
 *
 * Cobertura: per quins camins NO passa
 * -------------------------------------
 * Només veu el torn de l'agent principal (`Stop`; els subagents no carreguen el canari). Un torn
 * interromput per la persona no dispara `Stop`. Sense `inicia` adoptat, `comprova` no troba cap
 * paraula i calla -el costat segur de fallar, però també un canari mut: si mai no l'has vist
 * cantar, comprova que el `SessionStart` del snippet hi és. Codex no el rep (no té estos hooks), i
 * la regla de `CONTEXT-IA.md` és condicional precisament per això: sense paraula, no hi ha res a fer.
 * Que la paraula hi siga no demostra que s'hagen seguit les **altres** regles: demostra que el
 * document s'ha carregat, que és el que un canari pot dir. I entre dos `compact` el model pot
 * continuar la marca imitant les seues respostes anteriors encara que ja no atenga la regla: la
 * regla **enterrada** en una sessió llarga la detecta només a mitges.
 *
 * Com es nota que no funciona
 * ---------------------------
 * Obri una sessió i mira el final de la primera resposta: sense `🐤 <paraula>`, falla l'arrencada o
 * la regla; amb 🐤 però sense avís quan esborres la línia d'una resposta, falla `comprova`. El
 * parell de casos de `ci-plantilla/proves/casos/canari.js` ho fixa per les dos bandes.
 *
 * Codis d'eixida
 * --------------
 *   0 → sempre. L'avís viatja dins del JSON (`systemMessage`), que és el canal de `Stop` per a parlar
 *       a la persona sense tornar a posar l'agent a treballar (`decision: "block"` ho faria, i
 *       promocionar-lo a això és una decisió de `VERSION.md`, no d'este fitxer).
 *
 * Registre: cada avís de `comprova` i el primer torn net de cada sessió van a
 * `ci-plantilla/registre-disparadors.js` (≥ 1.55.0), per a decidir si es retira, es modifica o
 * s'estén. Un avís repetit en la mateixa sessió és el senyal que importa: o la regla no arriba, o
 * la sessió ja és massa llarga. `inicia` no anota res: dona la paraula sempre, no opina.
 *
 * Interruptor: UA_CANARI=0 apaga les dos meitats.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIR = path.join('.claude', 'canari');
const MARCA = '🐤';
// Paraules sense accents ni apòstrofs: han de sobreviure a qualsevol consola i a qualsevol
// normalització que faça el model en copiar-les.
const PARAULES = [
  'garrofer', 'taronger', 'ametler', 'olivera', 'magraner', 'llimera', 'palmera', 'pinyol',
  'barranc', 'marjal', 'albufera', 'serralada', 'calderola', 'sequia', 'safareig', 'rambla',
  'falco', 'gavina', 'oroneta', 'garsa', 'merla', 'puput', 'cucut', 'teuladi',
  'cabassa', 'rajola', 'campana', 'brasero', 'gerro', 'cistella', 'llanda', 'botijo',
];
// Fitxers d'estat de sessions velles: no fan mal, però tampoc no han de créixer sense fi.
const VIDA_MS = 7 * 24 * 3600 * 1000;

function llig() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

// El session_id va a un nom de fitxer: res que no siga alfanumèric o guió.
const fitxer = (sessio) => path.join(DIR, String(sessio || 'desconeguda').replace(/[^A-Za-z0-9-]/g, '_'));

function neteja() {
  try {
    const ara = Date.now();
    for (const f of fs.readdirSync(DIR)) {
      const p = path.join(DIR, f);
      if (ara - fs.statSync(p).mtimeMs > VIDA_MS) fs.rmSync(p, { force: true });
    }
  } catch {
    /* sense carpeta, res a netejar */
  }
}

function inicia(e) {
  const f = fitxer(e.session_id);
  let paraula = '';
  if (e.source === 'resume') {
    try {
      paraula = fs.readFileSync(f, 'utf8').trim();
    } catch {
      /* sessió reprengueda sense estat: se'n tria una de nova */
    }
  }
  if (!paraula) {
    paraula = `${PARAULES[crypto.randomInt(PARAULES.length)]}-${crypto.randomInt(10, 100)}`;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(f, paraula + '\n', 'utf8');
  }
  neteja();
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `Paraula de canari d'esta sessio: \`${paraula}\`.`,
      },
    })
  );
}

// L'última resposta de l'agent. Claude Code la passa a `Stop` en `last_assistant_message`; si la
// versió no la porta, es busca a la transcripció (l'últim missatge `assistant` amb text).
function ultimaResposta(e) {
  if (typeof e.last_assistant_message === 'string') return e.last_assistant_message;
  if (!e.transcript_path) return null;
  let linies;
  try {
    linies = fs.readFileSync(e.transcript_path, 'utf8').split('\n');
  } catch {
    return null;
  }
  for (let i = linies.length - 1; i >= 0; i--) {
    let r;
    try {
      r = JSON.parse(linies[i]);
    } catch {
      continue;
    }
    if (r.type !== 'assistant' || !r.message) continue;
    const c = r.message.content;
    const text = typeof c === 'string'
      ? c
      : (Array.isArray(c) ? c : []).filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
    if (text.trim()) return text;
  }
  return null;
}

// Registre de hooks: anota què ha fet este hook per a poder decidir si es retira, es modifica o
// s'estén. Sense l'script, o amb una còpia anterior a la 1.55.0, no fa res.
function compta(resultat, e) {
  try {
    const on = ['ci-plantilla', 'kit-si-ua/ci-plantilla']
      .map((c) => path.join(c, 'registre-disparadors.js'))
      .find((f) => fs.existsSync(f));
    if (on) require(path.resolve(on)).registraHook('canari', resultat, { sessio: e.session_id || null });
  } catch {
    /* el registre no pot trencar el hook */
  }
}

function comprova(e) {
  // Un `Stop` que ja ve d'un altre hook de `Stop` que ha bloquejat: no és una resposta nova.
  if (e.stop_hook_active) return;
  let paraula;
  try {
    paraula = fs.readFileSync(fitxer(e.session_id), 'utf8').trim();
  } catch {
    return; // sense `inicia`, no hi ha res a comparar
  }
  if (!paraula) return;
  const resposta = ultimaResposta(e);
  // Un torn sense text (només eines) no és una resposta que haja de portar el canari.
  if (resposta === null || !resposta.trim()) return;
  if (resposta.includes(paraula)) return compta('silenci', e);
  compta('avis', e);
  console.log(
    JSON.stringify({
      systemMessage:
        `${MARCA} El canari no ha cantat: la resposta no porta «${MARCA} ${paraula}». ` +
        'Les instruccions de doc-projecte/CONTEXT-IA.md no estan arribant a l\'agent o ja no les atén ' +
        '(CLAUDE.md sense carregar, @import trencat o una sessió massa llarga). Si es repetix, ' +
        'fes /compact o obri una sessió nova amb traspàs.',
    })
  );
}

if (process.env.UA_CANARI === '0' || process.env.UA_CANARI === 'false') process.exit(0);
const mode = process.argv[2];
const e = llig();
try {
  if (mode === 'inicia') inicia(e);
  else if (mode === 'comprova') comprova(e);
} catch {
  /* el canari no pot trencar una sessió: qualsevol error, silenci */
}
process.exit(0);
