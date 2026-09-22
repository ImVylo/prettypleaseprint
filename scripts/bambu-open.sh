#!/usr/bin/env bash
#
# ppp-bambu → BambuStudio bridge. Handles a `ppp-bambu://slice/<id>` link by
# fetching the model from a Pretty Please Print instance and opening it in a
# local BambuStudio.
#
# Runs ON THE PERSON'S OWN MACHINE — same shape as scripts/prusa-open.sh, and
# for the same reason: BambuStudio's own `bambustudioopen://` URL handler only
# downloads from an allowlist that trusts makerworld.com and nothing else —
# there is no setting to add a self-hosted host to it (see
# github.com/bambulab/BambuStudio/issues/6120). So instead of asking
# BambuStudio to fetch, this script fetches the bytes itself and hands
# BambuStudio a *local* path, which has no domain to check.
#
# This file is deliberately a near-duplicate of prusa-open.sh rather than a
# shared library the two source: they are invoked as two different desktop
# handlers for two different URL schemes, each copied to ~/.local/bin on
# install (see install-slicer-handler.sh) for the same "a copy never goes
# stale under your feet" reason prusa-open.sh documents. A shared library
# would need its own install/versioning story to get the same guarantee, for
# maybe forty lines saved.
#
# Config lives at $PPP_SLICER_CONF (default ~/.config/ppp/slicer.conf) —
# the SAME file prusa-open.sh reads, since both bridges belong to the same
# app instance:
#   PPP_BASE          the instance, e.g. https://print.example         (required)
#   PPP_BAMBU_SLICER  the BambuStudio command    (default: bambu-studio)
#   PPP_DOWNLOAD_DIR  where fetched models land  (default: ~/.cache/ppp/models,
#                                                  shared with the Prusa bridge)
#
# The clicked link carries its own credential, exactly like the Prusa one:
# `ppp-bambu://slice/<id>?t=<token>`, minted for the person looking at that
# ticket, good for half an hour and for that model only. Nothing secret is
# ever written to disk.

set -euo pipefail

CONF="${PPP_SLICER_CONF:-$HOME/.config/ppp/slicer.conf}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/ppp"
LOG="$LOG_DIR/slicer.log"
mkdir -p "$LOG_DIR"

note() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >>"$LOG"
}
fail() {
  note "ERROR (bambu): $1"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u critical "Open in BambuStudio failed" "$1" || true
  fi
  printf 'bambu-open: %s\n' "$1" >&2
  exit 1
}

[ -f "$CONF" ] || fail "no config at $CONF — run install-slicer-handler.sh first"
# shellcheck disable=SC1090
. "$CONF"

: "${PPP_BASE:?PPP_BASE is not set in $CONF}"
DOWNLOAD_DIR="${PPP_DOWNLOAD_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/ppp/models}"

# --- locate BambuStudio ------------------------------------------------------
# Same shape as the Prusa bridge's slicer search: a bare name, a full path
# (AppImage), or a multi-word command ("flatpak run …"), probed in that order
# when PPP_BAMBU_SLICER is unset.
if [ -n "${PPP_BAMBU_SLICER:-}" ]; then
  read -r -a SLICER_CMD <<<"$PPP_BAMBU_SLICER"
else
  SLICER_CMD=()
  for cand in bambu-studio bambustudio BambuStudio bambu-studio-gui; do
    if command -v "$cand" >/dev/null 2>&1; then SLICER_CMD=("$cand"); break; fi
  done
  if [ "${#SLICER_CMD[@]}" -eq 0 ] && command -v flatpak >/dev/null 2>&1 &&
    flatpak info com.bambulab.BambuStudio >/dev/null 2>&1; then
    SLICER_CMD=(flatpak run com.bambulab.BambuStudio)
  fi
  if [ "${#SLICER_CMD[@]}" -eq 0 ]; then
    for g in \
      "$HOME"/Applications/*[Bb]ambu*[Ss]tudio*.AppImage \
      "$HOME"/Downloads/*[Bb]ambu*[Ss]tudio*.AppImage \
      "$HOME"/.local/bin/*[Bb]ambu*[Ss]tudio*.AppImage \
      /opt/*[Bb]ambu*[Ss]tudio*/*.AppImage; do
      [ -x "$g" ] && { SLICER_CMD=("$g"); break; }
    done
  fi
fi

[ "${#SLICER_CMD[@]}" -gt 0 ] || fail \
  "could not find BambuStudio. Set PPP_BAMBU_SLICER in $CONF — a binary name, the full path to an AppImage, or 'flatpak run com.bambulab.BambuStudio'."

# --- parse the link -----------------------------------------------------------
url="${1:-}"
[ -n "$url" ] || fail "no URL given — this is invoked by clicking a ppp-bambu:// link"

rest="${url#ppp-bambu://slice/}"
id="${rest%%\?*}"
id="${id%/}"
case "$id" in
  "" | *[!0-9]*) fail "not a model link: $url (expected ppp-bambu://slice/<number>)" ;;
esac

link_token=""
if [ "$rest" != "${rest#*\?}" ]; then
  query="${rest#*\?}"
  case "$query" in
    *t=*)
      link_token="${query##*t=}"
      link_token="${link_token%%&*}"
      ;;
  esac
fi
case "$link_token" in
  "") fail "that link carries no credential — open the ticket in the app and click the button there" ;;
  *[!A-Za-z0-9._-]*) fail "the credential in that link is malformed — open the ticket again and re-click" ;;
esac

command -v curl >/dev/null 2>&1 || fail "curl is not installed"
slicer_head="${SLICER_CMD[0]}"
command -v "$slicer_head" >/dev/null 2>&1 || [ -x "$slicer_head" ] ||
  fail "slicer '$slicer_head' is not runnable — fix PPP_BAMBU_SLICER in $CONF (a name on PATH, an AppImage path, or 'flatpak run com.bambulab.BambuStudio')"

# --- fetch --------------------------------------------------------------------
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
hdr="$tmp/headers"
body="$tmp/body"

note "fetching story $id from $PPP_BASE (bambu)"
code="$(
  curl -sS -o "$body" -D "$hdr" -w '%{http_code}' \
    --get --data-urlencode "t=$link_token" \
    "$PPP_BASE/api/models/$id" 2>"$tmp/err"
)" || fail "could not reach $PPP_BASE: $(tr -d '\r' <"$tmp/err" | tail -n1)"

case "$code" in
  200) : ;;
  401) fail "that link has expired (HTTP 401). They last half an hour — open the ticket again and click the button." ;;
  404) fail "story $id is not there, or not one this account may see (HTTP 404)" ;;
  *)   fail "server returned HTTP $code for story $id" ;;
esac

name="$(
  grep -i '^content-disposition:' "$hdr" | tr -d '\r' |
    sed -n 's/.*filename="\([^"]*\)".*/\1/p' | head -n1
)"
name="$(basename "${name:-model-$id.stl}")"
name="$(printf '%s' "$name" | tr ' ' '_' | tr -cd 'A-Za-z0-9._-')"
case "$name" in "" | .*) name="model-$id.stl" ;; esac

mkdir -p "$DOWNLOAD_DIR"
find "$DOWNLOAD_DIR" -maxdepth 1 -type f -mtime +1 -delete 2>/dev/null || true

out="$DOWNLOAD_DIR/PPP-$((100 + id))-$name"
mv "$body" "$out"
note "saved $out"

# --- open -----------------------------------------------------------------
# BambuStudio has no documented --single-instance flag the way PrusaSlicer
# does; it is launched plainly with the file as its one argument, which is
# also all its own command-line wiki page shows for opening a model.
note "opening with: ${SLICER_CMD[*]}"
setsid "${SLICER_CMD[@]}" "$out" >>"$LOG" 2>&1 &
note "handed off story $id to BambuStudio"
