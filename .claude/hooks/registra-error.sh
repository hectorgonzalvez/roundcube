#!/usr/bin/env bash
# Afig una entrada a doc-projecte/REGISTRE-ERRORS.md (a l'arrel en un projecte anterior a
# kit-projecte 3.0.0). El crida el hook agent de `Stop`, que és qui decidix
# SI cal registrar alguna cosa; este script només decidix si l'escriptura està habilitada i que
# el format siga vàlid. Eixa separació és a propòsit: el judici és semàntic i el fa un model,
# però l'interruptor i la validació han de ser deterministes.
#
# Ús:
#   registra-error.sh --tipus IA --detecta persona \
#                     --esperat "..." --passat "..." --causa "..." [--via hook] [--peca <valor>]
#
# `--peca` és la clau enumerada que fa comptable el registre entre projectes: quina peça va
# fallar. Obligatòria de facto en `EINES` (sense ella s'escriu `sense determinar`, que és el que
# fa visible el buit en lloc d'amagar-lo) i útil en `SISTEMA` quan el pedaç és d'un component que
# mantenim nosaltres. La llista és tancada a posta: amb text lliure, «el mateix patró en dos
# projectes» no es pot comptar, i eixe recompte és tota la raó del camp.
#
# Interruptor: `UA_REGISTRE_ERRORS=0` el desactiva sencer (mateix patró que
# UA_REGISTRE_DISPARADORS a ci-plantilla). Qui el vulga apagar no ha de demanar permís a ningú.
#
# MAI bloqueja ni falla cap a fora: sempre `exit 0`. Un registre trencat no pot trencar una sessió.
# Els problemes van a stderr, que el hook no mostra a l'usuari.

set -u

[ "${UA_REGISTRE_ERRORS:-1}" = "0" ] && exit 0
[ "${UA_REGISTRE_ERRORS:-1}" = "false" ] && exit 0

# El kit viu a doc-projecte/; un projecte sense migrar el té a l'arrel. Si hi ha els dos, guanya
# el nou i es diu: escriure en silenci a la còpia que ningú llig és la fallada que cal evitar.
FITXER=""
for candidat in "doc-projecte/REGISTRE-ERRORS.md" "REGISTRE-ERRORS.md"; do
  [ -f "$candidat" ] || continue
  if [ -z "$FITXER" ]; then
    FITXER="$candidat"
  else
    echo "registra-error: hi ha $FITXER i $candidat -escric al primer; esborra la còpia antiga" >&2
  fi
done
[ -n "$FITXER" ] || { echo "registra-error: no hi ha REGISTRE-ERRORS.md ací (ni a doc-projecte/ ni a l'arrel)" >&2; exit 0; }

tipus=""; detecta=""; esperat=""; passat=""; causa=""; via=""; peca=""

while [ $# -gt 0 ]; do
  case "$1" in
    --tipus)   tipus="${2:-}";   shift 2 ;;
    --detecta) detecta="${2:-}"; shift 2 ;;
    --esperat) esperat="${2:-}"; shift 2 ;;
    --passat)  passat="${2:-}";  shift 2 ;;
    --causa)   causa="${2:-}";   shift 2 ;;
    --via)     via="${2:-}";     shift 2 ;;
    --peca)    peca="${2:-}";    shift 2 ;;
    *) echo "registra-error: argument desconegut '$1'" >&2; exit 0 ;;
  esac
done

# Validació dels dos camps que fan comptable el fitxer. Si no són exactes, l'anàlisi final
# (`grep "^### 20"`) els compta però no els classifica, i el pilot es queda sense mesura.
case "$tipus" in
  IA|SISTEMA|REQUISIT|EINES) ;;
  *) echo "registra-error: tipus invàlid '$tipus' (IA|SISTEMA|REQUISIT|EINES)" >&2; exit 0 ;;
esac
case "$detecta" in
  IA|persona) ;;
  *) echo "registra-error: detecta invàlid '$detecta' (IA|persona)" >&2; exit 0 ;;
esac

# La peça no invalida l'entrada -val més una entrada sense clau que cap-, però un valor de fora de
# la llista sí que es descarta: si s'escriguera tal qual, el recompte entre projectes tindria tantes
# files com maneres hi ha de dir la mateixa cosa, que és el problema que el camp ve a resoldre.
if [ -n "$peca" ]; then
  case "$peca" in
    skills|hooks-plantilla|ci-plantilla|kit-projecte) ;;
    sistema-disseny-ua|PlantillaMVCCore) ;;
    claude-code|codex|git|node|dotnet|oracle) ;;
    altres) ;;
    *) echo "registra-error: peça desconeguda '$peca' -s'escriu l'entrada sense el camp; si el cas es repetix, afig el valor a la llista de REGISTRE-ERRORS.plantilla.md" >&2; peca="" ;;
  esac
fi
# En `EINES` el camp no és opcional de facto: si falta, s'escriu igualment amb "sense determinar".
# Un buit comptat és una dada; un buit omés desapareix del recompte i el fa parèixer complet.
[ "$tipus" = "EINES" ] && [ -z "$peca" ] && peca="sense determinar"

[ -n "$esperat" ] && [ -n "$passat" ] || {
  echo "registra-error: falta --esperat o --passat" >&2; exit 0
}
[ -n "$causa" ] || causa="sense determinar"

# Les entrades són d'una línia per camp: un salt de línia enmig trencaria el format i, amb ell,
# les ordres d'anàlisi. Es col·lapsen en lloc de rebutjar l'entrada -val més una entrada
# aplanada que cap.
neteja() { printf '%s' "$1" | tr '\n\r\t' '   ' | sed 's/  */ /g; s/^ //; s/ $//'; }

# Redacció determinista. Va ací i no al prompt del hook a propòsit: qui òmpli estos camps és un
# model que ha llegit la transcripció sencera, i el destí és un fitxer append-only que va al git.
# Confiar la privadesa al judici d'un model, sobre entrada il·limitada i amb resultat permanent,
# és el costat equivocat de la separació que declara la capçalera d'este script.
#
# Emmascara, no rebutja: val més una entrada redactada que cap (mateix criteri que `neteja`).
# És una xarxa, no una garantia -no substituïx la instrucció del prompt de no copiar secrets,
# la duplica en determinista per si el model l'ignora.
redacta() {
  printf '%s' "$1" | sed -E '
    s#(://)[^/[:space:]:@]+:[^/[:space:]@]+@#\1[CREDENCIALS]@#g
    s#[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}#[CORREU]#g
    s#-{3,}BEGIN[ A-Z]*PRIVATE KEY-{3,}#[CLAU-PRIVADA]#g
    s#(gh[pousr]_|github_pat_)[A-Za-z0-9_]{10,}#[TOKEN]#g
    s#\bsk-[A-Za-z0-9_-]{10,}#[TOKEN]#g
    s#\bxox[baprs]-[A-Za-z0-9-]{10,}#[TOKEN]#g
    s#\bAKIA[0-9A-Z]{16}\b#[TOKEN]#g
    s#([Bb]earer )[A-Za-z0-9._~+/=-]{10,}#\1[TOKEN]#g
    s#\b([Pp]assword|[Pp]asswd|[Cc]ontrasenya|[Cc]ontrasena|[Ss]ecret|[Tt]oken|[Aa]pikey|[Aa]pi_key|[Aa]pi-key|[Cc]lave|[Cc]odper|CODPER)([[:space:]]*[:=][[:space:]]*)[^[:space:]]+#\1\2[REDACTAT]#g
    s#\b[0-9]{8}[A-Za-z]\b#[DOC]#g
    s#\b[XYZxyz][0-9]{7}[A-Za-z]\b#[DOC]#g
    s#\b[A-Za-z0-9+/_=]{40,}\b#[CADENA-LLARGA]#g
  '
}
# El llindar de 40 i el joc de caràcters sense guió de l última regla són a posta: agafen la forma
# d un token (base64/hex llarg i sense separadors) i deixen passar els identificadors del projecte,
# que són kebab-case amb guions i rarament arriben a 40. Un fals positiu es veu i es corregix amb
# una entrada nova; un secret comés al git, no.

esperat="$(redacta "$(neteja "$esperat")")"
passat="$(redacta "$(neteja "$passat")")"
causa="$(redacta "$(neteja "$causa")")"

capcalera="### $(date +%Y-%m-%d) · $tipus · detecta: $detecta"
[ -n "$via" ] && capcalera="$capcalera · via: $via"

{
  printf '\n%s\n' "$capcalera"
  printf 'Esperat: %s\n' "$esperat"
  printf 'Passat:  %s\n' "$passat"
  printf 'Causa:   %s\n' "$causa"
  [ -n "$peca" ] && printf 'Peça:    %s\n' "$peca"
} >> "$FITXER"

exit 0
