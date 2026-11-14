#!/usr/bin/env bash
# SessionStart hook: imprimeix un resum breu de l'estat del repositori
# (branca, canvis sense commitejar, ultims commits) que Claude Code afig al
# context inicial de la sessio. Complementa CONTEXT-IA.md (estatic, normatiu)
# amb estat dinamic, sense duplicar-lo -evita re-explicar "en que estava" a
# cada sessio nova. A mes, cinc avisos que nomes ixen quan toca: commits
# d'origin que no tens (fetch, mai pull), un traspas de menys de 48 h a
# handoff-workspace/, la llista de tasques-workspace/TASQUES.md (fetes, pendents i
# bloquejades), les hores per anotar (nomes si un pla.md te "Calibratge": la data de
# l'ultima anotacio i quants commits teus hi ha des d'aleshores, mai una xifra d'hores) i
# el kit de documentacio (doc-projecte/.kit-version, o
# docs/.kit-version abans de kit-projecte 3.0.0) per darrere
# del clon del cataleg.
#
# Cobertura: passa per cada arrencada de sessio (startup, resume, clear,
# compact); no passa per una sessio sense el hook adoptat ni pel kit d'un
# projecte sense clon enllacat; ho compensen comprova-desfasament.js a la CI i
# /ua-skills:onboarding --verify.
#
# No bloqueja mai. Eixida JSON: additionalContext (context de Claude) i
# systemMessage (el mateix resum, visible a la pantalla en carregar); sense node,
# text pla (SessionStart no te contracte de permissio).
# Si no es un repositori Git, ix en silenci. Cada avis falla en silenci: sense
# xarxa, sense upstream o sense cataleg, simplement no apareix.
#
# Cataleg: UA_CATALEG si esta definida (absoluta o relativa al projecte); si
# no, el desti del symlink ~/.claude/skills.
#
# Registre (5.28.0): quins dels cinc avisos han eixit (o cap, la primera
# arrencada de cada sessio) va a ci-plantilla/registre-disparadors.js, per a
# decidir si cal retirar-ne, modificar-ne o estendre'n algun (README.md
# § "Registre dels hooks que avisen o bloquegen"). El resum fix no compta: ix sempre.

# L'esdeveniment de SessionStart arriba per stdin; nomes el vol el registre (session_id). Des
# d'una terminal no n'hi ha, i llegir-lo penjaria l'script.
input=""
[ -t 0 ] || input="$(cat)"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

genera_resum() {
  branca="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  canvis="$(git status --short 2>/dev/null | head -20)"
  commits="$(git log --oneline -5 2>/dev/null)"

  echo "## Estat del repositori a l'inici de la sessio"
  echo
  echo "**Branca:** $branca"
  echo
  if [ -n "$canvis" ]; then
    echo "**Canvis sense commitejar:**"
    echo '```'
    echo "$canvis"
    echo '```'
  else
    echo "**Canvis sense commitejar:** cap"
  fi
  echo
  echo "**Ultims 5 commits:**"
  echo '```'
  echo "$commits"
  echo '```'

  # --- PR obertes ---------------------------------------------------------------
  # Nomes si hi ha `gh` i sessio iniciada; amb temps maxim per no penjar l'arrencada.
  # Sense xarxa, sense gh o sense autenticar, simplement no apareix.
  if command -v gh >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      prs="$(timeout 8 gh pr list --state open --limit 10 2>/dev/null)"
    else
      prs="$(gh pr list --state open --limit 10 2>/dev/null)"
    fi
    if [ -n "$prs" ]; then
      echo
      echo "**PR obertes** (numero, titol, branca):"
      echo '```'
      echo "$prs" | cut -f1-3
      echo '```'
    fi
  fi

  # --- Per darrere d'origin -----------------------------------------------------
  # Nomes fetch, i amb temps maxim: sense xarxa una arrencada no pot quedar penjada.
  # Sense `timeout` (macOS sense coreutils) no es fa fetch i es compara amb l'ultim
  # estat conegut de l'upstream.
  if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then
      GIT_TERMINAL_PROMPT=0 timeout 5 git fetch --quiet >/dev/null 2>&1
    fi
    darrere="$(git rev-list --count 'HEAD..@{u}' 2>/dev/null)"
    if [ -n "$darrere" ] && [ "$darrere" -gt 0 ]; then
      echo
      echo "**Per darrere de l'upstream:** $darrere commit(s). Comenta-ho a l'usuari abans de comencar; no faces pull pel teu compte."
    fi
  fi

  # --- Traspas recent -----------------------------------------------------------
  if [ -d handoff-workspace ]; then
    traspas="$(find handoff-workspace -maxdepth 1 -name '*.md' -mmin -2880 -type f 2>/dev/null | xargs -r ls -t 2>/dev/null | head -1)"
    if [ -n "$traspas" ]; then
      echo
      echo "**Traspas recent:** \`$traspas\` -$(head -1 "$traspas" | sed 's/^#* *//'). Si l'usuari diu \"repren\", llig-lo primer."
    fi
  fi

  # --- Llista de tasques --------------------------------------------------------
  # La de /ua-skills:tasques. Una faena llarga passa per diverses sessions i branques, i la
  # llista es versiona i viatja amb elles: sense este avis, cada sessio tornava a reconstruir el
  # pendent del traspas anterior (cdp, 2026-10).
  llista=tasques-workspace/TASQUES.md
  if [ -f "$llista" ]; then
    # Una tasca pot ocupar diverses linies (Prettier les talla): les de continuacio, sagnades, son
    # de la tasca de dalt, i el BLOQUEJAT pot caure en qualsevol d'elles.
    recompte="$(awk '
      function tanca() { if (estat == "o") { o++; if (text ~ /BLOQUEJAT/) b++ } else if (estat == "x") f++; estat = "" }
      /^[[:space:]]*- \[[xX]\]/ { tanca(); estat = "x"; text = $0; next }
      /^[[:space:]]*- \[ \]/    { tanca(); estat = "o"; text = $0; next }
      /^[[:space:]]+[^[:space:]]/ { if (estat != "") text = text " " $0; next }
      { tanca() }
      END { tanca(); printf "%d %d %d", f, o, b }' "$llista")"
    fetes="${recompte%% *}"
    bloquejades="${recompte##* }"
    obertes="${recompte#* }"; obertes="${obertes%% *}"
    faena="$(head -1 "$llista" | sed 's/^#* *//; s/^Tasques *[—-]* *//')"
    echo
    if [ "$obertes" -gt 0 ]; then
      echo "**Tasques en curs:** \`$llista\` ($faena): $fetes fetes i $obertes pendents, $bloquejades d'elles bloquejades. Llig-la abans de triar que fer; si el disc i la llista no diuen el mateix, guanya el disc."
    else
      echo "**Tasques acabades:** \`$llista\` ($faena) te les $fetes marcades. Proposa a l'usuari arxivar-la (\`TASQUES-<data>.md\`) i deixar una linia al pla.md."
    fi
  fi

  # --- Hores per anotar ---------------------------------------------------------
  # Nomes si algun pla.md te "Calibratge": el projecte estima per fase i te registre d'hores
  # (ua-planificador, references/estimacio.md; el mateix criteri que el Pas 2 d'obri-pr). Es
  # pregunten al traspas (handoff, Pas 3b) i abans del push d'una PR (obri-pr, Pas 2), i en una
  # sessio en que cap dels dos moments passa, ningu se'n recorda: aci nomes es diu la data de
  # l'ultima anotacio i quants commits teus hi ha des d'aleshores. Mai una xifra d'hores.
  pla_hores="$(find . -maxdepth 5 -name pla.md -not -path '*/node_modules/*' -not -path './.git/*' -exec grep -l '^#\{2,4\} *Calibratge' {} + 2>/dev/null | head -1 | tr -d '\r')"
  if [ -n "$pla_hores" ]; then
    ancora="$(git rev-parse --git-common-dir 2>/dev/null)/ua-hores-ultima-anotacio"
    if [ -f "$ancora" ]; then
      desde="$(head -1 "$ancora" 2>/dev/null | tr -d '\r')"
      n_commits="$(git log --all --since="$desde" --author="$(git config user.email 2>/dev/null)" --oneline 2>/dev/null | wc -l | tr -d ' ')"
      if [ -n "$desde" ] && [ "${n_commits:-0}" -gt 0 ]; then
        echo
        echo "**Hores sense anotar:** l'ultima anotacio es del ${desde%%T*} i hi ha $n_commits commit(s) teus des d'aleshores. Pregunta-les a l'usuari al traspas (handoff, Pas 3b) i abans del push d'una PR (obri-pr, Pas 2); mai les estimes."
      fi
    elif grep -q '^| *20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] *|' "$pla_hores" 2>/dev/null; then
      echo
      echo "**Hores sense anotar:** el registre de \`$pla_hores\` te linies pero falta l'ancora (\`ua-hores-ultima-anotacio\`, dins de \`git rev-parse --git-common-dir\`). Al traspas o en obrir la PR, pregunta \"des de quan\" sense proposar-ho; en acabar, crea l'ancora."
    fi
  fi

  # --- Kit de documentacio desfasat ---------------------------------------------
  versio_de() { sed -n 's/^versio:[[:space:]]*\([^[:space:]]*\).*/\1/p' "$1" 2>/dev/null | head -1; }

  segell=""
  for s in doc-projecte/.kit-version docs/.kit-version; do
    [ -f "$s" ] && { segell="$s"; break; }
  done
  if [ -n "$segell" ]; then
    cataleg="${UA_CATALEG:-$(readlink -f "$HOME/.claude/skills" 2>/dev/null)}"
    local_v="$(versio_de "$segell")"
    font_v=""
    for f in "$cataleg/kit-si-ua/kit-projecte/VERSION.md" "$cataleg/kit-projecte/VERSION.md"; do
      if [ -n "$cataleg" ] && [ -f "$f" ]; then font_v="$(versio_de "$f")"; break; fi
    done
    if [ -n "$local_v" ] && [ -n "$font_v" ] && [ "$local_v" != "$font_v" ] &&
      [ "$(printf '%s\n%s\n' "$local_v" "$font_v" | sort -V | head -1)" = "$local_v" ]; then
      echo
      echo "**Kit de documentacio desfasat:** el projecte el te a la v$local_v i el cataleg va per la v$font_v. Proposa a l'usuari \`/ua-skills:onboarding --actualitza\`; no l'executes sense que ho demane."
    fi
  fi
}

# Registre de hooks (ci-plantilla/registre-disparadors.js >= 1.55.0): anota que ha fet este hook
# per a poder decidir si es retira, es modifica o s'esten. Sense l'script, o amb una copia
# anterior, no fa res; mai canvia el que fa el hook. La sessio la llig l'script de l'entrada.
compta() {
  local r="ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || r="kit-si-ua/ci-plantilla/registre-disparadors.js"
  [ -f "$r" ] || return 0
  printf '%s' "$input" | node "$r" hook injecta-estat-sessio "$1" - "${2:-}" "${3:-}" >/dev/null 2>&1 || true
}

# Eixida JSON: additionalContext va al context de Claude i systemMessage el veu
# l'usuari a la pantalla en carregar la sessio. Sense node, cau a text pla (que
# Claude Code tambe afig al context, pero l'usuari no veu).
resum="$(genera_resum)"

# Quins avisos han eixit, llegits del resum mateix: genera_resum corre en un subshell.
avisos=""
for parell in "darrere:Per darrere de l'upstream:" "traspas:Traspas recent:" "tasques:Tasques " "hores:Hores sense anotar:" "kit:Kit de documentacio desfasat:"; do
  case "$resum" in
    *"**${parell#*:}"*) avisos="${avisos:+$avisos+}${parell%%:*}" ;;
  esac
done
if [ -n "$avisos" ]; then compta avis "" "$avisos"; else compta silenci; fi

if command -v node >/dev/null 2>&1; then
  printf '%s' "$resum" | node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () =>
      console.log(JSON.stringify({
        systemMessage: d,
        hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: d },
      })),
    );'
else
  printf '%s\n' "$resum"
fi
exit 0
