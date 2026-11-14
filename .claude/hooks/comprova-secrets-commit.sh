#!/usr/bin/env bash
# PreToolUse hook (Bash i PowerShell, if: git commit*): bloqueja el commit si algun fitxer
# staged conté un secret probable (claus d'API, contrasenyes, claus privades,
# JWT, contrasenyes de cadena de connexió). Determinista -invoca
# ci-plantilla/comprova-secrets.js --staged, sense cap agent. Bypass amb el
# marcador [secrets-ok: <ruta>] (llista per comes si calen diverses) obrint o
# tancant una línia del missatge de commit, mateix patró que [no-doc] -anomenar-lo
# enmig d'una frase no l'invoca (vore avall). El marcador ha de nomenar la ruta
# de la troballa -no val sol, sense ruta- perque el bypass aixeca eixe fitxer i
# continua bloquejant qualsevol altra troballa que no s'haja nomenat.
#
# Cobertura: dispara en el commit -veu l'staged vinga d'on vinga escrit (Write/Edit, Bash, un
# altre client de git). No cobrix res més enllà: un fitxer amb secret que mai arriba a "git
# commit" (queda staged i s'abandona) no el veu ningú, però tampoc arriba enlloc perillós
# (README.md § "Cobertura dels hooks").
#
# Còpia idèntica de skills-si-ua/.claude/hooks/comprova-secrets-commit.sh
# -este arxiu és el que es distribuïx als projectes consumidors (veure
# hooks-plantilla/README.md). Si es corregix un dels dos, corregix l'altre.
#
# NO RETORNA MAI permissionDecision:'allow' (4.3.0). Quan no troba res ix per
# exit 0 en silenci, que en el contracte de PreToolUse vol dir "no opine" i
# deixa continuar l'avaluació normal. Fins a la 4.2.3 retornava 'allow' explícit
# i eixa decisió resolia la crida: s'enduia per davant la regla `ask` de
# `Bash(git commit:*)` de permissions.snippet.json -cap commit preguntava- i
# també el feedback no bloquejant (exit 1 + stderr) del hook germà
# comprova-docmap-commit.js, que compartix matcher. Un guardia que, per dir que
# tot va bé, apaga els altres guardies fa net negatiu.
#
# Registre (5.28.0): cada bloqueig, cada [secrets-ok] i el primer commit net de
# cada sessió van a ci-plantilla/registre-disparadors.js, per a decidir si es
# retira, es modifica o s'estén (README.md § "Registre dels hooks que avisen o
# bloquegen"). Mai el secret ni la ruta: només que ha passat.

input="$(cat)"
command="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input&&j.tool_input.command?j.tool_input.command:'')}catch(e){}})" <<< "$input")"

deny() {
  node -e "
    const msg=process.argv[1];
    process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:msg}}));
  " "$1"
}
# "No opine": silenci i exit 0. No és el mateix que 'allow' -vore capçal.
callar() { exit 0; }
# Registre de hooks (ci-plantilla/registre-disparadors.js >= 1.55.0): anota què ha fet este hook
# per a poder decidir si es retira, es modifica o s'estén. Sense l'script, o amb una còpia
# anterior, no fa res; mai canvia el que fa el hook. La sessió la llig l'script de l'entrada.
compta() {
  local r="ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || r="kit-si-ua/ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || return 0
  printf '%s' "$input" | node "$r" hook comprova-secrets-commit "$1" - "${2:-}" "${3:-}" >/dev/null 2>&1 || true
}

SCRIPT="ci-plantilla/comprova-secrets.js"
[ -f "$SCRIPT" ] || SCRIPT="kit-si-ua/ci-plantilla/comprova-secrets.js"

if [ ! -f "$SCRIPT" ]; then
  callar
fi

sortida="$(node "$SCRIPT" --staged 2>&1)"
if [ $? -eq 0 ]; then
  compta silenci
  callar
fi

# El marcador ha d'obrir o tancar una línia del missatge de `-m`, no aparéixer en qualsevol lloc
# de l'orde. Fins a la 4.4.0 açò era `case "$command" in *"[secrets-ok]"*)`, que casava la
# subcadena on fóra: un commit que **parlara** del marcador -«explica el bypass [secrets-ok]»-
# apagava la detecció de secrets sencera, i el hook callava com si no haguera trobat res. És el
# mateix defecte que es va corregir a `comprova-docmap-commit.js` (ci-plantilla 1.25.0), però ací
# el que s'apaga és el guardia de seguretat, no el de documentació.
#
# La regla ix de la mesura feta sobre `[no-doc]`: de les 24 aparicions de l'historial dels dos
# repositoris, les invocacions reals estaven totes a la vora de la línia i les mencions totes
# enmig d'una frase. Es mesura sobre el missatge extret de `-m` i no sobre l'orde sencera, que
# acaba en cometa i no arribaria mai a la vora.
#
# §62.B.1: el marcador ja no aixeca "tot el commit" -nomena la ruta (o llista per comes) de la
# troballa que cobrix, i el guardia només calla si TOTES les troballes reals estan cobertes.
if node -e '
  var cmd = process.argv[1];
  var sortida = process.argv[2];
  // El here-string de PowerShell (`-m @\x27` … `\x27@`) va primer: acaba en cometa+arrova a
  // principi de línia, i un apòstrof dins del missatge («l\x27agent») no el talla. Sense esta
  // forma, des de l\x27eina PowerShell el marcador no es trobava mai.
  var reHere = /-[a-zA-Z]*m\s+@("|\x27)\r?\n([\s\S]*?)\r?\n\1@/g;
  var re = /-[a-zA-Z]*m\s+("|\x27)([\s\S]*?)\1/g;
  var missatges = [];
  var m;
  while ((m = reHere.exec(cmd)) !== null) missatges.push(m[2]);
  while ((m = re.exec(cmd)) !== null) missatges.push(m[2]);

  function rutesPermeses(text) {
    var rutes = [];
    String(text || "")
      .replace(/```[\s\S]*?```/g, "\n")
      .replace(/`[^`\n]*`/g, " ")
      .split("\n")
      .forEach(function (linia) {
        var s = linia.trim();
        var mm = s.match(/^\[secrets-ok:\s*([^\]]+)\]/) || s.match(/\[secrets-ok:\s*([^\]]+)\]$/);
        if (mm) rutes = rutes.concat(mm[1].split(",").map(function (r) { return r.trim(); }));
      });
    return rutes;
  }

  function fitxersTrobats(text) {
    var fitxers = [];
    String(text || "").split("\n").forEach(function (linia) {
      var mm = linia.match(/^✖\s+(.+):\d+\s+—/);
      if (mm) fitxers.push(mm[1]);
    });
    return fitxers;
  }

  var rutes = missatges.reduce(function (acc, msg) { return acc.concat(rutesPermeses(msg)); }, []);
  var trobats = fitxersTrobats(sortida);
  var pendents = trobats.filter(function (f) { return rutes.indexOf(f) === -1; });
  if (pendents.length === 0) {
    process.stderr.write("bypass: [secrets-ok] aixecat sobre " + JSON.stringify(trobats) + "\n");
  }
  process.exit(pendents.length === 0 ? 0 : 1);
' "$command" "$sortida"; then
  compta bypass
  callar
fi

resum="$(printf '%s' "$sortida" | head -c 800)"
compta bloqueig
deny "Possible(s) secret(s) al commit -revisa abans de continuar (bypass amb [secrets-ok: <ruta>] al missatge, per fitxer, si és fals positiu):\n$resum"
exit 0
