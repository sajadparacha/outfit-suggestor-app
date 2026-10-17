#!/usr/bin/env bash
# Installs the embedded watch app (OutfitSuggestor.app/Watch/OutfitSuggestorWatch.app) on the
# paired Apple Watch right after the iPhone app is installed.
#
# watchOS only auto-installs companion apps for App Store / TestFlight builds, so development
# builds need this push. The iPhone app must be installed first, otherwise WatchConnectivity
# reports isWatchAppInstalled == false.
#
# Usage:
#   install-watch-companion.sh [--install-phone] [--wait-for-phone-launch]
#                              [--app <OutfitSuggestor.app>] [--phone <id>] [--watch <id>]
#
#   --install-phone           Install the iPhone app with devicectl first (CLI flow).
#   --wait-for-phone-launch   Wait until Xcode has (re)launched the iPhone app, then install the
#                             watch app (used by the OutfitSuggestor scheme's Run pre-action).
#   --app                     Built iPhone app. Default: build-device Debug-iphoneos product.
#   --phone                   iPhone UDID/name. Default: $TARGET_DEVICE_IDENTIFIER, else the only
#                             connected physical iPhone.
#   --watch                   Watch UDID/name. Default: $WATCH_DEVICE_ID, else the first physical
#                             Apple Watch known to devicectl.
#
# Set SKIP_WATCH_INSTALL=1 to disable.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_PATH="$IOS_DIR/build-device/Build/Products/Debug-iphoneos/OutfitSuggestor.app"
PHONE_ID="${TARGET_DEVICE_IDENTIFIER:-}"
WATCH_ID="${WATCH_DEVICE_ID:-}"
INSTALL_PHONE=0
WAIT_FOR_LAUNCH=0
PHONE_BUNDLE_ID="com.sajad.outfitsuggestor"
LAUNCH_WAIT_SECONDS=600
INSTALL_ATTEMPTS=6
RETRY_DELAY_SECONDS=20

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install-phone) INSTALL_PHONE=1 ;;
    --wait-for-phone-launch) WAIT_FOR_LAUNCH=1 ;;
    --app) APP_PATH="$2"; shift ;;
    --phone) PHONE_ID="$2"; shift ;;
    --watch) WATCH_ID="$2"; shift ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { echo "[$(date '+%H:%M:%S')] $*"; }

notify() {
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

if [[ "${SKIP_WATCH_INSTALL:-0}" == "1" ]]; then
  log "SKIP_WATCH_INSTALL=1 — skipping watch install."
  exit 0
fi

# Prints "<identifier>" of the first matching physical device: $1 = iOS|watchOS, $2 = iPhone|"".
find_device() {
  local json
  json="$(mktemp)"
  xcrun devicectl list devices --json-output "$json" >/dev/null 2>&1
  python3 - "$json" "$1" "$2" <<'PY'
import json, sys
path, platform, device_type = sys.argv[1:4]
devices = json.load(open(path)).get("result", {}).get("devices", [])
matches = []
for d in devices:
    hw = d.get("hardwareProperties", {})
    if hw.get("platform") != platform or hw.get("reality") != "physical":
        continue
    if device_type and hw.get("deviceType") != device_type:
        continue
    connected = d.get("connectionProperties", {}).get("tunnelState") == "connected"
    matches.append((not connected, hw.get("udid") or d.get("identifier")))
matches.sort()
connected = [m for m in matches if not m[0]]
if len(matches) == 1 or len(connected) == 1 or (device_type == "" and matches):
    print(matches[0][1])
PY
  rm -f "$json"
}

# Prints the PID of the running iPhone app, or nothing.
phone_app_pid() {
  local json
  json="$(mktemp)"
  if xcrun devicectl device info processes --device "$PHONE_ID" --timeout 20 \
      --json-output "$json" >/dev/null 2>&1; then
    python3 - "$json" <<'PY'
import json, sys
procs = json.load(open(sys.argv[1])).get("result", {}).get("runningProcesses", [])
for p in procs:
    if p.get("executable", "").endswith("/OutfitSuggestor.app/OutfitSuggestor"):
        print(p.get("processIdentifier"))
        break
PY
  fi
  rm -f "$json"
}

if [[ -z "$PHONE_ID" ]] && [[ $INSTALL_PHONE -eq 1 || $WAIT_FOR_LAUNCH -eq 1 ]]; then
  PHONE_ID="$(find_device iOS iPhone)"
  [[ -z "$PHONE_ID" ]] && { log "No single iPhone to pick. Pass --phone <udid|name>."; exit 1; }
fi

if [[ -z "$WATCH_ID" ]]; then
  WATCH_ID="$(find_device watchOS "")"
  [[ -z "$WATCH_ID" ]] && { log "No physical Apple Watch found. Pass --watch <udid|name>."; exit 1; }
fi

log "iPhone: ${PHONE_ID:-n/a}  Watch: $WATCH_ID"

if [[ $WAIT_FOR_LAUNCH -eq 1 ]]; then
  initial_pid="$(phone_app_pid)"
  log "Waiting for Xcode to install and launch the iPhone app (current PID: ${initial_pid:-none})..."
  deadline=$((SECONDS + LAUNCH_WAIT_SECONDS))
  while :; do
    sleep 3
    pid="$(phone_app_pid)"
    if [[ -n "$pid" && "$pid" != "$initial_pid" ]]; then
      log "iPhone app launched (PID $pid)."
      break
    fi
    if (( SECONDS >= deadline )); then
      log "Timed out waiting for the iPhone app to launch; not installing the watch app."
      exit 1
    fi
  done
fi

WATCH_APP="$APP_PATH/Watch/OutfitSuggestorWatch.app"
if [[ ! -d "$WATCH_APP" ]]; then
  log "Watch app not found at $WATCH_APP (build the OutfitSuggestor scheme for a device first)."
  exit 1
fi

if [[ $INSTALL_PHONE -eq 1 ]]; then
  log "Installing iPhone app..."
  if ! xcrun devicectl device install app --device "$PHONE_ID" --timeout 300 "$APP_PATH"; then
    log "iPhone install failed."
    exit 1
  fi
fi

for attempt in $(seq 1 "$INSTALL_ATTEMPTS"); do
  log "Installing watch app (attempt $attempt/$INSTALL_ATTEMPTS)..."
  if xcrun devicectl device install app --device "$WATCH_ID" --timeout 600 "$WATCH_APP"; then
    log "Watch app installed."
    notify "Outfit Suggestor" "Watch app installed on your Apple Watch."
    if [[ $INSTALL_PHONE -eq 1 ]]; then
      xcrun devicectl device process launch --device "$PHONE_ID" "$PHONE_BUNDLE_ID" >/dev/null 2>&1 || true
    fi
    exit 0
  fi
  (( attempt < INSTALL_ATTEMPTS )) && sleep "$RETRY_DELAY_SECONDS"
done

log "Could not reach the watch. Wake/unlock it, keep it on Wi-Fi near the iPhone, then run:"
log "  $0 --app \"$APP_PATH\" --watch \"$WATCH_ID\""
notify "Outfit Suggestor" "Watch install failed — wake and unlock your watch, then rerun install-watch-companion.sh."
exit 1
