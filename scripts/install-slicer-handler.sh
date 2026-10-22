#!/usr/bin/env bash
#
# Register prusa-open.sh and bambu-open.sh as the handlers for `byd://` and
# `byd-bambu://` links on this Linux desktop, and lay down a shared config
# skeleton for both to read.
#
# Run it once, on the machine that has the printer and your slicer:
#   ./scripts/install-slicer-handler.sh
#
# What it does, all under your own home directory — nothing system-wide, no
# sudo:
#   1. copies prusa-open.sh and bambu-open.sh to ~/.local/bin/, and writes a
#      .desktop entry for each into ~/.local/share/applications, pointing at
#      *those copies*;
#   2. makes each the default handler for its own x-scheme-handler MIME type
#      (byd for PrusaSlicer, byd-bambu for BambuStudio);
#   3. creates ~/.config/byd/slicer.conf (mode 600) for you to fill in, if it
#      is not already there — one shared file, since both bridges belong to
#      the same app instance and need the same BYD_BASE.
#
# Neither slicer has to actually be installed for this to run cleanly: only
# clicking the corresponding button in the app ever invokes the handler, and
# a missing slicer fails loudly there, not here.
#
# macOS and Windows register a scheme differently (a .app/Info.plist and a
# registry key respectively) — docs/prusaslicer.md has both for PrusaSlicer;
# the same shapes apply to BambuStudio with byd-bambu in place of byd. This
# installer is Linux/XDG only, and says so rather than pretending to work
# elsewhere.

set -euo pipefail

case "$(uname -s)" in
  Linux) : ;;
  *) echo "This installer is Linux/XDG only. See docs/prusaslicer.md for macOS and Windows." >&2
     exit 1 ;;
esac

here="$(cd "$(dirname "$0")" && pwd)"

bin_dir="$HOME/.local/bin"
apps_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$bin_dir" "$apps_dir"

# Install a COPY of each handler, and point its .desktop at that rather than
# at the checkout.
#
# The entry used to name the script where it sits in the working tree, which
# quietly made the button depend on which branch happened to be checked out:
# switch to anything cut before the handler landed and the file is gone, the
# click does nothing, and nothing anywhere says why. That is not hypothetical —
# it has bitten twice, most recently when the file was there but was a different
# version than the deployed app expected.
#
# A copy costs one `cp` and severs the dependency entirely. It is overwritten on
# every run, so re-running after a `git pull` is how you update the helpers —
# and the closing message says so.
#
# One iteration per slicer: scheme, source script, install name, display name.
install_handler() {
  local scheme="$1" source_name="$2" install_name="$3" display_name="$4"
  local source_handler="$here/$source_name"
  [ -f "$source_handler" ] || { echo "$source_name is not beside this installer ($source_handler)" >&2; exit 1; }

  local handler="$bin_dir/$install_name"
  cp "$source_handler" "$handler"
  chmod +x "$handler"
  echo "installed $handler"

  local desktop="$apps_dir/$install_name.desktop"
  # %u is the clicked URL, passed through to the handler as its one argument.
  cat >"$desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=BYD Printing → $display_name
Comment=Open a $scheme:// model link in $display_name
Exec=$handler %u
Terminal=false
NoDisplay=true
MimeType=x-scheme-handler/$scheme;
DESKTOP
  echo "wrote $desktop"

  # Make it the default for the scheme. xdg-mime is the portable way; if it is
  # absent, fall back to editing mimeapps.list directly so this still works on
  # a minimal install.
  if command -v xdg-mime >/dev/null 2>&1; then
    xdg-mime default "$install_name.desktop" "x-scheme-handler/$scheme"
    echo "registered $scheme:// via xdg-mime"
  else
    local mimeapps="${XDG_CONFIG_HOME:-$HOME/.config}/mimeapps.list"
    touch "$mimeapps"
    if ! grep -q "^x-scheme-handler/$scheme=" "$mimeapps" 2>/dev/null; then
      grep -q '^\[Default Applications\]' "$mimeapps" 2>/dev/null || printf '[Default Applications]\n' >>"$mimeapps"
      local tmp
      tmp="$(mktemp)"
      awk -v line="x-scheme-handler/$scheme=$install_name.desktop" \
        '/^\[Default Applications\]/ { print; print line; next } { print }' \
        "$mimeapps" >"$tmp" && mv "$tmp" "$mimeapps"
    fi
    echo "registered $scheme:// in $mimeapps (xdg-mime not found)"
  fi
}

install_handler byd        prusa-open.sh byd-slicer       PrusaSlicer
install_handler byd-bambu  bambu-open.sh byd-bambu-slicer BambuStudio

command -v update-desktop-database >/dev/null 2>&1 &&
  update-desktop-database "$apps_dir" 2>/dev/null || true

# Config skeleton — never overwrite an existing one. Still created 600: it holds
# no credential any more, but an existing file might, and tightening is free.
conf_dir="${XDG_CONFIG_HOME:-$HOME/.config}/byd"
conf="$conf_dir/slicer.conf"
mkdir -p "$conf_dir"
if [ -f "$conf" ]; then
  echo "left your existing config alone: $conf"
else
  umask 077
  cat >"$conf" <<'CONF'
# BYD Printing slicer bridge config. Shared by prusa-open.sh and
# bambu-open.sh — one file, since both belong to the same app instance and
# need the same BYD_BASE.
#
# There is nothing secret in here. The clicked link carries its own credential
# — minted by the app for whoever was looking at that ticket, good for half an
# hour and for that one model — so the only thing this file has to say is which
# instance to talk to.

# The instance, no trailing slash. This is the only required setting.
BYD_BASE="https://print.example"

# Optional. Left unset, the PrusaSlicer bridge finds it on its own — a binary
# on PATH (prusa-slicer / prusaslicer / PrusaSlicer), a Flatpak install, or an
# AppImage in ~/Applications, ~/Downloads or ~/.local/bin. Set it only to point
# somewhere else, in any of these forms:
#   BYD_SLICER="prusa-slicer"                              # a binary name
#   BYD_SLICER="$HOME/Applications/PrusaSlicer-2.9.0.AppImage"   # an AppImage
#   BYD_SLICER="flatpak run com.prusa3d.PrusaSlicer"      # a Flatpak
#   BYD_SLICER="orca-slicer"                              # any slicer works
# (A path containing spaces is the one form this cannot express.)

# Optional. Same idea, for the BambuStudio bridge — a binary on PATH
# (bambu-studio / bambustudio / BambuStudio), a Flatpak install, or an
# AppImage in the same places as above.
#   BYD_BAMBU_SLICER="bambu-studio"                                  # a binary name
#   BYD_BAMBU_SLICER="$HOME/Applications/BambuStudio.AppImage"       # an AppImage
#   BYD_BAMBU_SLICER="flatpak run com.bambulab.BambuStudio"          # a Flatpak

# Optional. Where fetched models are cached (pruned after a day). Shared by
# both bridges.
# BYD_DOWNLOAD_DIR="$HOME/.cache/byd/models"
CONF
  chmod 600 "$conf"
  echo "created $conf — set BYD_BASE to your instance"
fi

echo
echo "Done. Set BYD_BASE in $conf, then click 'Open in PrusaSlicer' or"
echo "'Open in BambuStudio' on any ticket. No token to paste — the link"
echo "carries its own."
echo
echo "Both helpers are copies under $bin_dir, so the buttons do not care"
echo "which branch this checkout is on. After a git pull, re-run this"
echo "installer to update them."
if [ -f "$conf" ] && grep -q '^[[:space:]]*BYD_TOKEN=' "$conf" 2>/dev/null; then
  echo
  echo "NOTE: $conf still sets BYD_TOKEN. That was the old way in and it is a"
  echo "      long-lived credential on disk; links carry their own now. You can"
  echo "      delete the line."
fi
echo "Trouble? tail -f \"\${XDG_STATE_HOME:-\$HOME/.local/state}/byd/slicer.log\""
