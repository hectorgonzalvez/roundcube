#!/usr/bin/env bash
# SessionEnd hook: en tancar-se la sessió, deixa un informe d'eixa sessió al
# directori de telemetria de la màquina (fora dels repositoris), amb camps
# enumerats i rutes relatives al projecte.
#
# Per què fora del repositori i no commitejat: així no toca cap commit de ningú
# ni obri cap debat de privacitat -les dades es queden a la màquina fins que el
# coordinador de qualitat les demane, i llavors s'entreguen amb
# `node kit-si-ua/ci-plantilla/registre-disparadors.js --exporta`.
#
# No bloqueja mai, no imprimix res, no costa tokens. Sense SCRIPT o sense
# registre local previ, no fa res (exit 0).
#
# Còpia idèntica de skills-si-ua/.claude/hooks/exporta-sessio.sh -si es corregix
# un dels dos, corregix l'altre (README § Mantindre-ho sincronitzat).

#
# Abans d'exportar, completa el registre amb la transcripció de la sessió: les
# ordes que escriu la persona (`/handoff`, `/ua-skills:auditoria`) no passen per
# l'eina `Skill` i registra-invocacio-skill.sh no les veu.

input="$(cat)"
camps="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write((j.session_id||'')+'\n'+(j.transcript_path||''))}catch(e){}})" <<< "$input")"
session_id="$(head -n 1 <<< "$camps")"
transcript_path="$(sed -n 2p <<< "$camps")"

[ -z "$session_id" ] && exit 0

SCRIPT="ci-plantilla/registre-disparadors.js"
[ -f "$SCRIPT" ] || SCRIPT="kit-si-ua/ci-plantilla/registre-disparadors.js"
[ -f "$SCRIPT" ] || exit 0

[ -n "$transcript_path" ] && node "$SCRIPT" completa-sessio "$session_id" "$transcript_path"
node "$SCRIPT" exporta-sessio "$session_id"
exit 0
