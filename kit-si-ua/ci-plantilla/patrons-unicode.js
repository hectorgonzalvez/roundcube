/**
 * Caràcters Unicode que l'editor i el diff no mostren però que el model llig com a text (1.51.0).
 *
 * Un fitxer d'instruccions (`SKILL.md`, `CLAUDE.md`, `AGENTS.md`, `CONTEXT-IA.md`, `.claude/**`) és
 * el que l'agent obeïx. La regla d'importació del catàleg és llegir-lo sencer abans d'acceptar-lo, i
 * llegir és precisament el que no veu una instrucció escrita amb estos caràcters. Els carreguen
 * `valida-skill.js` (el catàleg) i `comprova-unicode-invisible.js` (els projectes): un sol lloc on
 * viu la llista, com `patrons-secrets.js`.
 *
 * Els rangs van en números, no en seqüències d'escapament dins d'una regex: una eina que
 * desescapa el text en escriure'l deixaria el caràcter real al fitxer, i el mòdul s'acusaria a si
 * mateix sense que ningú ho veiera.
 *
 * No hi entra U+00AD (guionet discrecional) ni U+00A0 (espai dur): es veuen o es comporten com a
 * text normal, i un fitxer en valencià en pot portar sense cap intenció.
 */
'use strict';

const CLASSES = [
  { des: 0x200b, fins: 0x200f, nom: 'amplada zero o marca de direcció' },
  { des: 0x202a, fins: 0x202e, nom: 'control bidi (incrustació o substitució)' },
  { des: 0x2060, fins: 0x2064, nom: 'unió de paraules o operador invisible' },
  { des: 0x2066, fins: 0x2069, nom: 'control bidi (aïllament)' },
  { des: 0xfeff, fins: 0xfeff, nom: "BOM fora de l'inici del fitxer" },
  { des: 0xe0000, fins: 0xe007f, nom: 'tag character (text amagat)' },
];

const classeDe = (codi) => CLASSES.find((c) => codi >= c.des && codi <= c.fins);
const punt = (codi) => 'U+' + codi.toString(16).toUpperCase().padStart(4, '0');

/**
 * Totes les aparicions d'un text, amb línia i columna (comptades des de 1, en punts de codi). El
 * BOM del primer caràcter del fitxer no compta: és l'única posició on és legítim.
 */
function troba(text) {
  const troballes = [];
  const sencer = text.codePointAt(0) === 0xfeff ? text.slice(1) : text;
  sencer.split(/\r?\n/).forEach((linia, i) => {
    let columna = 0;
    for (const ch of linia) {
      columna++;
      const codi = ch.codePointAt(0);
      const classe = classeDe(codi);
      if (classe) troballes.push({ linia: i + 1, columna, punt: punt(codi), nom: classe.nom });
    }
  });
  return troballes;
}

module.exports = { CLASSES, troba };
