#!/usr/bin/env bash
# PostToolUse hook (Skill): anota al registre de disparadors que s'ha invocat un
# skill. És la meitat que tanca el bucle -suggest-skills.sh anota què es va
# suggerir, este anota què es va fer de veres. Amb les dos meitats,
# `node kit-si-ua/ci-plantilla/registre-disparadors.js --informe` sap quines regles del
# skillmap serveixen i quins skills s'invoquen sense que cap regla els suggerisca.
#
# Només escriu una línia JSON en un fitxer local gitignorat. No bloqueja mai, no
# imprimix res al context de l'agent (cap cost de tokens), no altera cap decisió.
#
# Còpia idèntica de skills-si-ua/.claude/hooks/registra-invocacio-skill.sh -este
# arxiu és el que es distribuïx als projectes consumidors (veure README.md). Si es
# corregix un dels dos, corregix l'altre. Necessita SCRIPT (ci-plantilla/
# registre-disparadors.js) -sense ell no fa res (exit 0).

input="$(cat)"
camps="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const t=j.tool_input||{};const s=t.skill||t.name||t.skill_name||'';process.stdout.write(s+'\n'+(j.session_id||''))}catch(e){}})" <<< "$input")"

skill="$(head -n 1 <<< "$camps")"
session_id="$(tail -n 1 <<< "$camps")"

[ -z "$skill" ] && exit 0

SCRIPT="ci-plantilla/registre-disparadors.js"
[ -f "$SCRIPT" ] || SCRIPT="kit-si-ua/ci-plantilla/registre-disparadors.js"
[ -f "$SCRIPT" ] || exit 0

node "$SCRIPT" invocacio "$skill" "$session_id"
exit 0
