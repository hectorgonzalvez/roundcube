#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): formata amb Prettier el fitxer acabat de tocar
# si l'extensio es md/yml/yaml/json. No bloqueja mai encara que prettier falle
# o no estiga instal·lat.
#
# NO toca codi font (.vue fora des de la 5.9.0): formatar codi es una decisio del projecte -un
# script npm, lint-staged, un pas de CI-, no un efecte lateral d'una edicio de l'agent. Els hooks
# d'este kit son ajuda cooperativa, no frontera (README § "Limit escrit").
#
# Cobertura: nomes Write/Edit; una escriptura per Bash no el dispara. Sense cost real -el format
# el revisa qui llig el diff, i cap regla d'este cataleg en depen (README.md § "Cobertura dels
# hooks").
#
# Prettier reescriu el fitxer SENCER encara que l'edicio siga d'una sola linia. Per a excloure'n
# un -documents llargs que se citen per numero de linia, on reformatar no es cosmetic sino que
# trenca les citacions- posa'l al .prettierignore del projecte: prettier el respecta encara que la
# ruta li arribe explicita, com ací. Vore README.md § "Com adoptar-ho" punt 4.

input="$(cat)"
file_path="$(node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input&&j.tool_input.file_path?j.tool_input.file_path:'')}catch(e){}})" <<< "$input")"

# Sense configuracio explicita del projecte no s'usa el fallback d'`npx`: es baixaria la versio mes
# recent de prettier i li aplicaria els SEUS valors per defecte al fitxer -cometes, punts i coma,
# blocs-, que no tenen per que ser els del projecte. Falla tancat, com la resta de hooks del kit
# quan els falta la seua dada. Amb prettier instal·lat al projecte no cal: adoptar-lo ja es la
# decisio.
te_config_prettier() {
  for f in .prettierrc .prettierrc.json .prettierrc.json5 .prettierrc.yml .prettierrc.yaml \
           .prettierrc.toml .prettierrc.js .prettierrc.cjs .prettierrc.mjs \
           prettier.config.js prettier.config.cjs prettier.config.mjs; do
    [ -f "$f" ] && return 0
  done
  # La clau `prettier` de package.json tambe es configuracio valida. Es llig amb node (que este
  # hook ja necessita) i no amb grep, perque `"prettier"` a devDependencies no es configuracio.
  [ -f package.json ] && node -e "process.exit(require('./package.json').prettier===undefined?1:0)" 2>/dev/null && return 0
  return 1
}

case "$file_path" in
  */.system/*|*\.system\*)
    ;;
  *.md|*.yml|*.yaml|*.json)
    if [ -f "node_modules/.bin/prettier" ]; then
      node_modules/.bin/prettier --write "$file_path" >/dev/null 2>&1
    elif command -v npx >/dev/null 2>&1 && te_config_prettier; then
      npx --yes prettier --write "$file_path" >/dev/null 2>&1
    fi
    ;;
esac
exit 0
