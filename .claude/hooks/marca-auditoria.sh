#!/usr/bin/env bash
# Deixa rastre de si l'auditoria d'un torn s'ha executat o no.
#
# Per què existix: el hook agent de `Stop` té ordre de no bloquejar mai i de no informar ningú
# ("NO bloqueges mai la finalitzacio de la sessio, passe el que passe"). Amb això, «l'auditor ha
# revisat i no ha trobat res» i «l'auditor no s'ha arribat a executar» produïxen exactament la
# mateixa eixida: cap entrada a REGISTRE-ERRORS.md. Un control sense senyal quan cau no és un
# control. Este script és eixe senyal.
#
# Per què "torn" i no "sessió": `Stop` dispara cada volta que l'agent principal acaba de
# respondre, no en tancar-se la sessió (una sessió llarga dispara `Stop` moltes voltes). El nom
# antic d'este marcador (`--fi-sessio`) prometia el que no mesurava -es va corregir el 2026-08-05
# després que el log mostrara tres línies del mateix `sessio` en la mateixa conversa.
#
# Dos comptadors independents al mateix fitxer:
#   fi-torn   -l'escriu un hook `command` determinista, que no depén de cap model ni de cap
#             permís de lectura: si l'agent ha acabat de respondre, la línia hi és.
#   revisada  -l'escriu el propi agent auditor com a últim pas. Si falla abans (permisos,
#             temps, transcripció il·legible), esta línia no apareix.
#
# L'anàlisi final del pilot compara els dos recomptes (per torn, l'aparellament és 1:1, que és
# el que fa útil la comparació):
#   grep -c 'fi-torn'  .claude/auditoria-sessions.log   # torns amb agent principal acabat
#   grep -c 'revisada' .claude/auditoria-sessions.log   # torns realment auditats
# Si el segon és menor que el primer, el buit és exactament el mesurament que falta.
#
# Per a comptar SESSIONS (no torns), cal deduplicar per identificador -una sessió llarga hi
# aporta moltes línies `fi-torn`:
#   grep 'fi-torn' .claude/auditoria-sessions.log | awk '{print $NF}' | sort -u | wc -l
#
# Ús:
#   marca-auditoria.sh --fi-torn  [--sessio <id>] [--nota "..."]
#   marca-auditoria.sh --revisada [--sessio <id>] [--nota "..."]
#
# Interruptor: `UA_REGISTRE_ERRORS=0` l'apaga sencer, igual que registra-error.sh -si algú apaga
# el registre, també s'apaga la comptabilitat del registre.
#
# MAI bloqueja ni falla cap a fora: sempre `exit 0`.

set -u

[ "${UA_REGISTRE_ERRORS:-1}" = "0" ] && exit 0
[ "${UA_REGISTRE_ERRORS:-1}" = "false" ] && exit 0

# Ancorat al directori del propi script, no al de treball: un hook `command` i una crida des de
# l'agent no tenen per què compartir cwd, i dos fitxers de registre a mitges no mesuren res.
DIR_CLAUDE="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)"
[ -n "$DIR_CLAUDE" ] || { echo "marca-auditoria: no localitze el directori .claude" >&2; exit 0; }
FITXER="$DIR_CLAUDE/auditoria-sessions.log"

tipus=""; sessio=""; nota=""

while [ $# -gt 0 ]; do
  case "$1" in
    --fi-torn)  tipus="fi-torn";  shift ;;
    --revisada) tipus="revisada"; shift ;;
    --sessio)   sessio="${2:-}";  shift 2 ;;
    --nota)     nota="${2:-}";    shift 2 ;;
    *) echo "marca-auditoria: argument desconegut '$1'" >&2; exit 0 ;;
  esac
done

[ -n "$tipus" ] || { echo "marca-auditoria: falta --fi-torn o --revisada" >&2; exit 0; }

# El hook `command` rep el JSON del hook per stdin; l'agent, en canvi, crida este script des de
# Bash i ha de passar l'id amb `--sessio`. Si no arriba per cap dels dos camins, es marca igual:
# val més una línia sense id que cap línia. `read -t 1` evita quedar-se penjat si no hi ha stdin.
if [ -z "$sessio" ] && [ ! -t 0 ]; then
  entrada=""
  read -r -t 1 entrada 2>/dev/null || true
  sessio="$(printf '%s' "$entrada" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
fi
[ -n "$sessio" ] || sessio="desconeguda"

# Només els 12 primers caràcters: identifiquen la sessió per a correlacionar les dues línies
# sense guardar l'id sencer. Ací no va mai contingut de la sessió, només que va passar i quan.
sessio="$(printf '%s' "$sessio" | tr -cd 'A-Za-z0-9-' | cut -c1-12)"
nota="$(printf '%s' "$nota" | tr '\n\r\t' '   ' | cut -c1-120)"

linia="$(date +%Y-%m-%dT%H:%M:%S) · $tipus · sessio: $sessio"
[ -n "$nota" ] && linia="$linia · $nota"

printf '%s\n' "$linia" >> "$FITXER"

exit 0
