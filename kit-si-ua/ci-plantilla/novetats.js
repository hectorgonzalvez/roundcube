#!/usr/bin/env node
/**
 * Titulars de les versions d'un VERSION.md entre dos números de versió.
 *
 * Mòdul, no CLI. L'usen `comprova-desfasament.js` (per a dir de què vas endarrerit, no només
 * que ho vas) i `instal·la-ci.js` (per a dir què t'has emportat en un refresc). Els dos llegixen
 * el mateix historial que la regla de bump del `docmap.json` ja obliga a mantindre al dia, o siga
 * que no hi ha cap font nova que se'n puga desincronitzar.
 *
 * Els dos que en depenen el carreguen amb `require` dins d'un try/catch: si este fitxer no ha
 * arribat a la còpia d'un projecte, el que s'ha de perdre és la informació extra, mai el check.
 * Un guardià que peta perquè li falta un mòdul de comoditat és pitjor que un que no dona detall.
 */
'use strict';
const fs = require('fs');

// Format d'una entrada de l'historial: `- **1.26.0 — 2026-09-10** — títol...`
const ENTRADA = /^- \*\*(\d[\d.]*)\s*[—-]\s*(\d{4}-\d{2}-\d{2})\*\*\s*[—-]?\s*(.*)$/;

function compara(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// El titular és el primer tros en negreta de l'entrada quan n'hi ha (la convenció des de la
// 1.20.0); si no, la primera frase. Es lleva el marcatge: això va a una terminal, no a un .md.
function titularDe(text) {
  const negreta = text.match(/^\*\*(.+?)\*\*/);
  let t = negreta ? negreta[1] : text.split(/(?<=\.)\s/)[0] || text;
  t = t.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;:]$/, '');
  return t.length > 96 ? t.slice(0, 93).replace(/\s+\S*$/, '') + '...' : t;
}

/**
 * Entrades de l'historial de `fitxerVersio` posteriors a `des` i fins a `fins`, de la més nova
 * a la més antiga: [{ versio, data, titular }]. Torna [] si el fitxer no es pot llegir -no
 * poder donar el detall no és un error, és no tindre'l.
 */
function novetats(fitxerVersio, des, fins) {
  let text;
  try {
    text = fs.readFileSync(fitxerVersio, 'utf8');
  } catch (e) {
    return [];
  }
  const linies = text.split(/\r?\n/);
  const entrades = [];
  for (let i = 0; i < linies.length; i++) {
    const m = linies[i].match(ENTRADA);
    if (!m) continue;
    const [, versio, data, primera] = m;
    if (compara(versio, des) <= 0 || compara(versio, fins) > 0) continue;
    // El titular pot continuar a la línia següent (les entrades van justificades a 100 columnes).
    // Es junta fins al primer blanc o fins a l'entrada següent: sense això, un titular partit es
    // tallava enmig d'una cita o d'un fragment de codi.
    const tros = [primera];
    for (let j = i + 1; j < linies.length; j++) {
      const seg = linies[j];
      if (!seg.trim() || ENTRADA.test(seg)) break;
      tros.push(seg.trim());
    }
    entrades.push({ versio, data, titular: titularDe(tros.join(' ')) });
  }
  return entrades;
}

module.exports = { compara, titularDe, novetats };
