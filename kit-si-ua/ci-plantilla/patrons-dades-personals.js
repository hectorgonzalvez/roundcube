/**
 * Patrons de dada personal probable -la font única que comparteixen el hook `revisa-prompt.js`
 * (el que la persona escriu o apega, abans que arribe al model) i `oculta-secrets-eixida.js` (quan
 * l'agent llig una transcripció de sessió) de `hooks-plantilla/`. Germà de `patrons-secrets.js`:
 * allò és una credencial, açò és una persona.
 *
 * Exporta:
 *   troba(text)    -torna [{ motiu, valor }] per cada coincidència que no és una excepció
 *   oculta(text)   -torna { text, trobades } amb cada valor substituït
 *   dniValid(num, lletra), EXCEPCIONS
 *
 * Què detecta, i per què tan poc
 * ------------------------------
 * DNI i NIE amb la **lletra de control correcta** (mòdul 23). Sense la comprovació, qualsevol
 * fragment de huit xifres i una lletra disparava; amb ella, un de cada 23 dels que tenen eixa forma
 * per casualitat. El consumidor principal bloqueja el prompt, i un bloqueig fals costa més que un
 * avís fals: per això la precisió mana sobre la cobertura. Els correus i la «forma d'extracte»
 * (diverses files amb una dada personal cadascuna) no hi són encara: el llindar del segon es fixa
 * amb el registre de `revisa-prompt.js`, no a ull.
 *
 * La mateixa forma que `registra-error.sh`
 * ---------------------------------------
 * El `sed` de `registra-error.sh` emmascara `\b[0-9]{8}[A-Za-z]\b` i `\b[XYZxyz][0-9]{7}[A-Za-z]\b`,
 * sense lletra de control: és un superconjunt d'açò. Tot el que este mòdul detecta, aquell ho ha
 * d'emmascarar, i `proves/cadena-hooks.js` ho comprova executant l'script. Per això no s'admeten
 * separadors (`12345678-Z`): el `sed` no els veu, i el superconjunt deixaria de ser-ho.
 *
 * Un fals positiu es corregix ací (`EXCEPCIONS` o el patró), no en qui el consumix.
 */
'use strict';

const LLETRES = 'TRWAGMYFPDXBNJZSQVHLCKE';

// DNI d'exemple que apareixen en documentació, en fixtures i en formularis de prova: són vàlids
// (la lletra quadra) i no són de ningú que calga protegir.
const EXCEPCIONS = new Set(['12345678Z', '00000000T', '11111111H', '87654321X', 'X1234567L']);

// Les vores imiten el `\b` del `sed` de `registra-error.sh`: ni lletra, ni xifra, ni `_` als costats.
const DNI_RE = /(?<![A-Za-z0-9_])([0-9]{8})([A-Za-z])(?![A-Za-z0-9_])/g;
const NIE_RE = /(?<![A-Za-z0-9_])([XYZxyz])([0-9]{7})([A-Za-z])(?![A-Za-z0-9_])/g;

function dniValid(num, lletra) {
  return LLETRES[parseInt(num, 10) % 23] === String(lletra).toUpperCase();
}

const marca = (motiu) => `[dada personal ocultada: ${motiu}]`;

function substituix(text, alTrobar) {
  let eixida = text.replace(DNI_RE, (m, num, lletra) => {
    if (!dniValid(num, lletra) || EXCEPCIONS.has(m.toUpperCase())) return m;
    return alTrobar('DNI', m);
  });
  eixida = eixida.replace(NIE_RE, (m, pre, num, lletra) => {
    const equivalent = 'XYZ'.indexOf(pre.toUpperCase()) + num;
    if (!dniValid(equivalent, lletra) || EXCEPCIONS.has(m.toUpperCase())) return m;
    return alTrobar('NIE', m);
  });
  return eixida;
}

function troba(text) {
  const trobades = [];
  substituix(String(text || ''), (motiu, valor) => {
    trobades.push({ motiu, valor });
    return valor;
  });
  return trobades;
}

function oculta(text) {
  const trobades = [];
  const eixida = substituix(String(text || ''), (motiu) => {
    trobades.push(motiu);
    return marca(motiu);
  });
  return { text: eixida, trobades };
}

module.exports = { troba, oculta, dniValid, EXCEPCIONS };
