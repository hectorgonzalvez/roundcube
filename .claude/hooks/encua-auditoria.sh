#!/usr/bin/env bash
# Encua un torn perquè l'auditoria del registre d'errors es passe DESPRÉS, fora del camí
# interactiu del programador.
#
# Per què existix
# ---------------
# L'auditoria era un hook de tipus `agent` al `Stop`. Tenia ordre de no informar ningú i de no
# bloquejar mai, però en la pràctica:
#   - el seu accés a eines era intermitent (de vegades executava `bash` amb èxit, de vegades li era
#     denegat), així que la marca `revisada` s'escrivia o no per motius aliens al contingut;
#   - quan fallava, l'informe de fallada arribava igualment a l'agent principal i acabava davant de
#     l'usuari -fuita d'un canal que havia de ser silenciós;
#   - i pujar-li el model (Haiku → Sonnet, 2026-08-06) no ho va resoldre: el defecte no era de
#     capacitat.
#
# La solució no és fer el hook més llest, és traure'l del camí crític. Ací només s'encua; l'anàlisi
# la fa `/auditoria` després, en una sessió normal amb permisos complets, reexecutable si falla.
#
# Què NO canvia: `marca-auditoria.sh --fi-torn` continua sent el denominador exacte del pilot i no
# es toca. La sèrie mesurada és contínua; l'únic que canvia és com es produïx `revisada`.
#
# MAI bloqueja ni falla cap a fora: sempre `exit 0`.

set -u

[ "${UA_REGISTRE_ERRORS:-1}" = "0" ] && exit 0
[ "${UA_REGISTRE_ERRORS:-1}" = "false" ] && exit 0

DIR_CLAUDE="$(cd "$(dirname "$0")/.." 2>/dev/null && pwd)"
[ -n "$DIR_CLAUDE" ] || exit 0
CUA="$DIR_CLAUDE/auditoria-pendents.log"

# El hook rep el JSON per stdin. `read -t 1` evita penjar-se si no n'hi ha.
entrada=""
if [ ! -t 0 ]; then
  read -r -t 1 entrada 2>/dev/null || true
fi
[ -n "$entrada" ] || exit 0

extrau() {
  printf '%s' "$entrada" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"
}

sessio="$(extrau session_id)"
transcripcio="$(extrau transcript_path)"

[ -n "$sessio" ] || sessio="desconeguda"
[ -n "$transcripcio" ] || exit 0   # sense transcripció no hi ha res a auditar

# Un torn per línia. La deduplicació per sessió la fa `/auditoria` en consumir la cua: ací interessa
# saber quants torns hi ha hagut, no comprimir-los.
printf '%s\t%s\t%s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$sessio" "$transcripcio" >> "$CUA"

exit 0
