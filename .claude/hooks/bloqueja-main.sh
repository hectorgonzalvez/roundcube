#!/usr/bin/env bash
# PreToolUse hook (Bash i PowerShell, if: git commit*|git push*): bloqueja fer "git commit"
# o "git push" directament sobre main/master des d'una sessio de Claude Code.
# Determinista -mira nomes la branca actual i la comanda, sense agent.
#
# Per que existix: "no faces push a main" viu normalment nomes al cap de qui
# escriu el prompt, i el 5% de voltes que s'oblida costa un revert visible per
# a tot l'equip. Encoixinar la regla com a infraestructura -en lloc de com a
# recordatori- la fa complir sempre.
#
# Bypass: UA_PERMET_MAIN=1 a l'entorn, per a qui de veres necessita fer-ho
# (p. ex. un merge de release ja revisat a ma). No hi ha marcador al missatge
# de commit perque este hook tambe intercepta "git push", que no en porta cap.
# No s'estreny a una ruta -a diferencia dels altres bypass del kit- perque
# aixeca una decisio de branca, no de contingut; deixa rastre per stderr quan
# s'usa, igual que la resta.
#
# Cobertura: dispara en "git commit"/"git push" fets des d'una sessio de Claude Code. Un push fet
# des d'un IDE, un altre client de git, o un runner de CI no el veu mai -compensa'l amb proteccio
# de branca al servidor (fora d'este kit), no confiant nomes en este hook (README.md § "Cobertura
# dels hooks").
#
# NO RETORNA MAI permissionDecision:'allow' (4.3.0) -mateix motiu que a
# comprova-secrets-commit.sh: un 'allow' explicit resol la crida i s'endu per
# davant les regles `ask` de permissions.snippet.json i el feedback dels hooks
# germans. Aci feia especialment mal: este hook deixa passar per definicio tot
# el que NO va a main, o siga que en una branca de treball -el cas normal-
# aprovava en silenci absolutament tots els commits i pushes.
#
# Registre (5.28.0): cada bloqueig, cada bypass que de veres aixeca un bloqueig
# i el primer commit o push net de cada sessio van a
# ci-plantilla/registre-disparadors.js, per a decidir si es retira, es modifica
# o s'esten (README.md § "Registre dels hooks que avisen o bloquegen"). Amb
# UA_PERMET_MAIN=1 en una branca de treball no hi ha res aixecat, i no compta.

input="$(cat)"
command="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input&&j.tool_input.command?j.tool_input.command:'')}catch(e){}})" <<< "$input")"

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
  printf '%s' "$input" | node "$r" hook bloqueja-main "$1" - "${2:-}" "${3:-}" >/dev/null 2>&1 || true
}

bypass=false
if [ "$UA_PERMET_MAIN" = "1" ]; then
  echo "bypass: UA_PERMET_MAIN aixecat sobre '$command'" >&2
  bypass=true
fi
# On el hook bloquejaria: amb el bypass, calla i ho anota com a bypass.
bloqueja() {
  if [ "$bypass" = true ]; then
    compta bypass "" "$2"
    callar
  fi
  compta bloqueig "" "$2"
  deny "$1"
}

branca="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
# Branques protegides, comparades en minúscules: el procediment de la UA usa `Master` i
# `PREPRODUCCION`, en majúscula.
protegida() {
  case "$(printf %s "$1" | tr '[:upper:]' '[:lower:]')" in
    main|master|preproduccion) return 0 ;;
  esac
  return 1
}

case "$command" in
  *git\ push*)
    # Extrau els arguments de "git push" que no son flags (-u, --force...).
    # Amb 2+ arguments (remot + ref), la ref explicita mana sobre la branca
    # actual -"git push origin feature/x" estant a main no s'ha de bloquejar.
    # Amb 0-1 arguments ("git push", "git push origin") el push es implicit
    # sobre la branca actual, i llavors si mira la branca.
    resta="${command#*git push}"
    read -r -a paraules <<< "$resta"
    args=()
    for w in "${paraules[@]}"; do
      case "$w" in
        -*) ;;
        *) args+=("$w") ;;
      esac
    done
    dest_main=false
    if [ "${#args[@]}" -ge 2 ]; then
      ref="${args[1]}"
      case "$(printf %s "$ref" | tr '[:upper:]' '[:lower:]')" in
        *main*|*master*|*preproduccion*) dest_main=true ;;
      esac
    elif protegida "$branca"; then
      dest_main=true
    fi
    if [ "$dest_main" = true ]; then
      bloqueja "Bloquejat: 'git push' cap a main/master/PREPRODUCCION des d'una sessio de Claude Code. Crea o canvia a una branca de treball, o defineix UA_PERMET_MAIN=1 si cal fer-ho de veres." push
    fi
    ;;
  *git\ commit*)
    if protegida "$branca"; then
      bloqueja "Bloquejat: 'git commit' directament sobre main/master/PREPRODUCCION des d'una sessio de Claude Code. Canvia a una branca de treball primer, o defineix UA_PERMET_MAIN=1 si cal fer-ho de veres." commit
    fi
    ;;
esac
compta silenci
exit 0
