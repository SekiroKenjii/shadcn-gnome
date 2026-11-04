# shellcheck shell=bash

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  _sg_color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
else
  _sg_color() { printf '%s' "$2"; }
fi

log()     { printf '%s %s\n' "$(_sg_color 34 ::)" "$*"; }
success() { printf '%s %s\n' "$(_sg_color 32 ok)" "$*"; }
warn()    { printf '%s %s\n' "$(_sg_color 33 '!!')" "$*" >&2; }
die()     { printf '%s %s\n' "$(_sg_color 31 xx)" "$*" >&2; exit 1; }
