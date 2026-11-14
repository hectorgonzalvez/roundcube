#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): recorda skills UA segons el fitxer tocat,
# llegint el mapa carpeta/patró -> skills de skillmap.json (via
# ci-plantilla/suggereix-skills.js, determinista, sense agent). Substituix els
# antics suggest-dotnet-review.sh / suggest-ux-review.sh (mapeig hardcodejat en
# bash): ara la lògica és dades (skillmap.json), mateixa idea que docmap.json ja
# aplica al hook de documentació. No bloqueja mai, no executa cap skill.
#
# Passa també session_id al script perquè el suggeriment quede anotat al registre
# de disparadors i es puga saber després si s'ha atés (parella d'este hook:
# registra-invocacio-skill.sh). Sense session_id el suggeriment ix igual.
#
# Este fitxer viu en dos llocs bessons: kit-si-ua/hooks-plantilla/suggest-skills.sh (el que es
# distribuïx als projectes, vore el seu README) i .claude/hooks/suggest-skills.sh (el que corre
# en este repositori). El contingut ha de ser idèntic: si es corregix un, es corregix l'altre,
# i comprova-desfasament.js compara els dos costats. Necessita SCRIPT
# (kit-si-ua/ci-plantilla/suggereix-skills.js) i un skillmap.json -sense cap dels dos no fa res
# (exit 0).
#
# Cobertura: només Write/Edit; una escriptura per Bash no dispara el suggeriment. Sense cost real
# -el pitjor que passa és que un agent no rep el recordatori i el skill correcte no s'invoca a
# temps, revisable com qualsevol altra deriva d'abast (README.md § "Cobertura dels hooks").

input="$(cat)"
camps="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const f=j.tool_input&&j.tool_input.file_path?j.tool_input.file_path:'';process.stdout.write(f+'\n'+(j.session_id||''))}catch(e){}})" <<< "$input")"

file_path="$(head -n 1 <<< "$camps")"
session_id="$(tail -n 1 <<< "$camps")"

[ -z "$file_path" ] && exit 0

SCRIPT="ci-plantilla/suggereix-skills.js"
[ -f "$SCRIPT" ] || SCRIPT="kit-si-ua/ci-plantilla/suggereix-skills.js"
[ -f "$SCRIPT" ] || exit 0

node "$SCRIPT" "$file_path" "$session_id"
exit 0
