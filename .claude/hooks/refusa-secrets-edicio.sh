#!/usr/bin/env bash
# PreToolUse hook (Write|Edit): refusa editar fitxers que sembles credencials
# o secrets de produccio (.env.production, appsettings.Production.json, claus
# privades...) nomes per patro de ruta, sense mirar el contingut. Determinista
# -sense agent.
#
# Complementa comprova-secrets-commit.sh, que actua mes tard (en el commit) i
# per contingut: este hook actua abans, en l'edicio, i per ruta -"este fitxer
# es nega a editar-se" en lloc de "recorda no tocar-lo".
#
# Cobertura: dispara nomes en Write/Edit. Una escriptura per Bash (heredoc, sed -i,
# redireccio) no el dispara mai -el compensa comprova-secrets-commit.sh, que mira
# el contingut staged en el commit i no depen de com s'ha escrit el fitxer
# (README.md § "Cobertura dels hooks").
#
# Bypass: UA_PERMET_EDITAR_SECRETS=<ruta> a l'entorn (llista separada per comes
# si calen diverses), per a falsos positius (p. ex. un fitxer d'exemple anomenat
# credentials.json.sample que no encaixa igual). Nomena el fitxer exacte -no
# "1"- perque el bypass aixeca eixa ruta i continua bloquejant la resta.
# Abans, "=1" aixecava tota la sessio (vore VERSION.md).
#
# NO RETORNA MAI permissionDecision:'allow' (4.3.0) -mateix motiu que a
# comprova-secrets-commit.sh: un 'allow' explícit resol la crida i s'endu per
# davant les regles `ask` i el feedback dels hooks germans. Silenci i exit 0.
#
# La llista cobrix `.env` pelat i `.env.*` des de la 4.3.0. Abans només mirava
# `.env.production`/`.env.prod`, i això deixava una asimetria absurda amb
# permissions.snippet.json: `Read(./.env)` denegava llegir-lo, però escriure'l
# no ho parava ningú. Detectat a ua-ds-fusio el 2026-08-16 (un Write de `.env`
# amb `SECRET=proves` va passar net). Els sufixos d'exemple continuen editables:
# són plantilles que es committegen a propòsit.
#
# Registre (5.28.0): cada refús, cada bypass i la primera edicio neta de cada
# sessio van a ci-plantilla/registre-disparadors.js, per a decidir si es retira,
# es modifica o s'esten (README.md § "Registre dels hooks que avisen o bloquegen").

input="$(cat)"
file_path="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input&&j.tool_input.file_path?j.tool_input.file_path:'')}catch(e){}})" <<< "$input")"

deny() {
  node -e "
    const msg=process.argv[1];
    process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:msg}}));
  " "$1"
}
# "No opine": silenci i exit 0. No es el mateix que 'allow' -vore capcal.
callar() { exit 0; }
# Registre de hooks (ci-plantilla/registre-disparadors.js >= 1.55.0): anota que ha fet este hook
# per a poder decidir si es retira, es modifica o s'esten. Sense l'script, o amb una copia
# anterior, no fa res; mai canvia el que fa el hook. La sessio la llig l'script de l'entrada.
compta() {
  local r="ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || r="kit-si-ua/ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || return 0
  printf '%s' "$input" | node "$r" hook refusa-secrets-edicio "$1" - "${2:-}" "${3:-}" >/dev/null 2>&1 || true
}

if [ -n "$UA_PERMET_EDITAR_SECRETS" ]; then
  IFS=',' read -r -a rutes_permeses <<< "$UA_PERMET_EDITAR_SECRETS"
  for r in "${rutes_permeses[@]}"; do
    if [ "$r" = "$file_path" ]; then
      echo "bypass: UA_PERMET_EDITAR_SECRETS aixecat sobre '$file_path'" >&2
      compta bypass "$file_path"
      callar
    fi
  done
fi

# Plantilles d'entorn: existixen per a ser editades i committejades. Van primer
# perque son mes especifiques que el patro *.env.* de baix.
case "$file_path" in
  *.env.example|*.env.exemple|*.env.ejemplo|*.env.sample|*.env.template|*.env.plantilla|*.env.dist)
    compta silenci
    callar
    ;;
esac

case "$file_path" in
  *.env|*.env.*|*appsettings.Production.json|*appsettings.Prod.json|*/secrets/*|*\\secrets\\*|*credentials.json|*credenciales.json|*.pfx|*.pem|*id_rsa*)
    compta bloqueig "$file_path"
    deny "Refusat: '$file_path' sembla un fitxer de credencials/secrets. Edita una plantilla (.env.example) o defineix UA_PERMET_EDITAR_SECRETS=$file_path si es un fals positiu."
    ;;
esac
compta silenci
exit 0
