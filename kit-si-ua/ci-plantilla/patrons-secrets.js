/**
 * Patrons de secret probable -la font única que comparteixen `comprova-secrets.js` (commit i CI) i
 * el hook `oculta-secrets-eixida.js` de `hooks-plantilla/` (eixida de les eines abans que arribe al
 * model). Abans vivien dins de `comprova-secrets.js`; es van traure quan el segon consumidor els va
 * necessitar (1.45.0), perquè dos còpies divergixen a la primera excepció nova -que és com
 * `ua-ds-fusio` i el catàleg van passar set versions amb regles distintes (vore la nota 2 d'avall).
 *
 * Exporta:
 *   PATTERNS, PLACEHOLDER_RE, TRUNCAT_RE  -el que `comprova-secrets.js` aplica línia a línia
 *   oculta(text)                          -torna { text, trobades } amb cada valor substituït
 *
 * Un fals positiu es corregix ací (PLACEHOLDER_RE o el patró), no en qui el consumix: així el
 * commit, la CI i el hook canvien alhora.
 */
'use strict';

// `\$\{` (1.25.1): un valor que comença per interpolació de variable d'entorn/expressió
// (`"${GITHUB_TOKEN}"`, `"${{ secrets.X }}"`) no és mai un secret literal -és sintaxi que un altre
// procés (shell, GitHub Actions, MCP config) substituirà, no la clau en si. Detectat a
// docs/prova-2.md:1229/1244 (2026-09-03): un exemple de configuració citat d'un article extern va
// bloquejar el commit tot i no dur cap credencial real.
// `secret ocultat` (1.45.0): el text que posa `oculta()`. Sense ell, una eixida ja ocultada que
// tornara a passar pel hook es tornaria a comptar com a troballa.
const PLACEHOLDER_RE = /^(x{3,}|\*{3,}|<.*>|\.\.\.|your[-_]|changeme|change_me|example|placeholder|redactat|redacted|todo|fixme|test|dummy|foo|bar|xxxx|\$\{|\[secret ocultat)/i;
// Valor truncat (1.43.1): `"rt_9Hk2..."`, `"eyJhbGciOiJFUzI1NiIs…"`. Un secret real no s'escriu
// elidit -si acaba en punts suspensius és la mostra d'un format, no la clau. Detectat en
// l'exemple de parell access/refresh token d'un article extern (2026-10-09).
const TRUNCAT_RE = /(\.\.\.|…)$/;

const PATTERNS = [
  { re: /\bAKIA[0-9A-Z]{16}\b/, motiu: 'clau d\'accés AWS (AKIA...)', captura: null },
  // Tres correccions acumulades ací (1.18.0):
  //   1. La paraula clau pot dur prefix i sufix separats per `_`/`-`: la forma habitual d'una
  //      variable d'entorn és `AWS_SECRET_ACCESS_KEY`, no `secret`. Abans el patró exigia que la
  //      paraula clau anara seguida directament de `[:=]`, així que
  //      `const AWS_SECRET_ACCESS_KEY = "wJalr…"` passava net (detectat a ua-ds-fusio,
  //      2026-08-16). Els afixos han de dur separador, de manera que `tokenizer = "…"` continua
  //      sense disparar: `izer` no ve precedit de `_`/`-`.
  //   2. `(?<!data-)` exclou atributs HTML/DOM (`data-token="…"`, selectors, props Vue): són noms
  //      kebab-case, no credencials. Este tros es va corregir a la còpia de `ua-ds-fusio` i mai va
  //      tornar ací -la deriva que el README § "Mantindre-ho sincronitzat" advertix-, així que el
  //      catàleg ha estat set versions donant falsos positius que el consumidor ja no tenia.
  //   3. `['"]?` davant de `[:=]` per a la clau citada d'un JSON (`"api_key": "…"`), que no
  //      detectava cap de les dos versions anteriors: la cometa de tancament s'interposava entre
  //      la paraula clau i els dos punts.
  // El lookbehind va just davant de la paraula clau, no al principi del patró, i la classe inicial
  // exclou `-` perquè la coincidència no puga arrancar al guionet de `data-` i esquivar-lo.
  {
    re: /(?:^|[^A-Za-z0-9_-])(?:[A-Za-z0-9]+[_-])*(?<!data-)(api[_-]?key|secret|token|passwd|password|pwd)(?:[_-][A-Za-z0-9]+)*['"]?\s*[:=]\s*['"]([^'"\s]{8,})['"]/i,
    motiu: 'assignació de clau/contrasenya amb valor literal',
    captura: 2,
  },
  { re: /-----BEGIN\s?(RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----/, motiu: 'bloc de clau privada', captura: null },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, motiu: 'token amb forma de JWT', captura: null },
  { re: /;\s*Password\s*=\s*([^;'"\r\n]{4,})/i, motiu: 'contrasenya en cadena de connexió (Oracle/.NET)', captura: 1 },
];

// La línia de capçalera sola no basta per a ocultar: el cos de la clau ve a les línies següents.
// Sense línia de tancament, s'oculta fins al final del text -davant del dubte, tanca.
const BLOC_CLAU_PRIVADA = /-----BEGIN\s?(?:RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----[\s\S]*?(?:-----END\s?(?:RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----|$)/g;

const marca = (motiu) => `[secret ocultat: ${motiu}]`;

function oculta(text) {
  const trobades = [];
  let eixida = text.replace(BLOC_CLAU_PRIVADA, () => {
    trobades.push('bloc de clau privada');
    return marca('bloc de clau privada');
  });
  for (const { re, motiu, captura } of PATTERNS) {
    if (motiu === 'bloc de clau privada') continue;
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    eixida = eixida.replace(global, (...m) => {
      if (!captura) {
        trobades.push(motiu);
        return marca(motiu);
      }
      const valor = m[captura];
      if (PLACEHOLDER_RE.test(valor) || TRUNCAT_RE.test(valor)) return m[0];
      trobades.push(motiu);
      // Només el valor: el nom de la clau es queda, i el model sap què hi havia sense veure-ho.
      const i = m[0].lastIndexOf(valor);
      return m[0].slice(0, i) + marca(motiu) + m[0].slice(i + valor.length);
    });
  }
  return { text: eixida, trobades };
}

module.exports = { PATTERNS, PLACEHOLDER_RE, TRUNCAT_RE, oculta };
