#!/usr/bin/env bash
# Builds OutfitSuggestor for device and installs it on the iPhone, the iPad, and the Apple Watch.
#
# Order: iPhone -> iPad -> watch. The watch app must be installed after the iPhone app, otherwise
# WatchConnectivity reports isWatchAppInstalled == false ("Open your iPhone" on the watch).
# The watch step is delegated to install-watch-companion.sh (retries while the watch wakes up).
# A failure on one device does not stop the others; the exit code is non-zero if any failed.
#
# Usage:
#   build-and-install-all.sh [--skip-build] [--phone <id>] [--ipad <id>] [--watch <id>]
#
#   --skip-build   Reuse the last device build in build-device/ instead of rebuilding.
#   --phone        iPhone UDID/name. Default: $PHONE_DEVICE_ID, else Sajjad iphone.
#   --ipad         iPad UDID/name.   Default: $IPAD_DEVICE_ID, else Sajjad's iPad Pro.
#   --watch        Watch UDID/name.  Default: $WATCH_DEVICE_ID, else Sajjad's Apple Watch.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DERIVED_DATA="$IOS_DIR/build-device"
APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphoneos/OutfitSuggestor.app"
PHONE_BUNDLE_ID="com.sajad.outfitsuggestor"
PHONE_ID="${PHONE_DEVICE_ID:-00008160-000E082624A3400A}"
IPAD_ID="${IPAD_DEVICE_ID:-00008142-001909C222C2401C}"
WATCH_ID="${WATCH_DEVICE_ID:-00008310-000CF5C90A40E01E}"
SKIP_BUILD=0
INSTALL_ATTEMPTS=3
RETRY_DELAY_SECONDS=15

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --phone) PHONE_ID="$2"; shift ;;
    --ipad) IPAD_ID="$2"; shift ;;
    --watch) WATCH_ID="$2"; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { echo "[$(date '+%H:%M:%S')] $*"; }

notify() {
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

# $1 = label, $2 = device id. Retries because devicectl tunnels to sleeping devices often time out.
install_app() {
  local label="$1" device="$2" attempt
  for attempt in $(seq 1 "$INSTALL_ATTEMPTS"); do
    log "Installing on $label (attempt $attempt/$INSTALL_ATTEMPTS)..."
    if xcrun devicectl device install app --device "$device" --timeout 300 "$APP_PATH"; then
      log "$label: installed."
      return 0
    fi
    (( attempt < INSTALL_ATTEMPTS )) && sleep "$RETRY_DELAY_SECONDS"
  done
  log "$label: install failed. Unlock it and keep it connected, then rerun with --skip-build."
  return 1
}

if [[ $SKIP_BUILD -eq 0 ]]; then
  log "Building OutfitSuggestor (Debug, generic iOS device)..."
  if ! xcodebuild -project "$IOS_DIR/OutfitSuggestor.xcodeproj" -scheme OutfitSuggestor \
      -configuration Debug -destination 'generic/platform=iOS' \
      -derivedDataPath "$DERIVED_DATA" -allowProvisioningUpdates -quiet build; then
    log "Build failed."
    notify "Outfit Suggestor" "Device build failed."
    exit 1
  fi
fi

if [[ ! -d "$APP_PATH/Watch/OutfitSuggestorWatch.app" ]]; then
  log "No device build with an embedded watch app at $APP_PATH."
  exit 1
fi
log "App: $APP_PATH (built $(stat -f '%Sm' "$APP_PATH"))"

phone_status="failed"; ipad_status="failed"; watch_status="skipped (iPhone install failed)"

install_app "iPhone" "$PHONE_ID" && phone_status="ok"
install_app "iPad" "$IPAD_ID" && ipad_status="ok"

if [[ $phone_status == "ok" ]]; then
  if "$SCRIPT_DIR/install-watch-companion.sh" --app "$APP_PATH" --watch "$WATCH_ID"; then
    watch_status="ok"
  else
    watch_status="failed"
  fi
  xcrun devicectl device process launch --device "$PHONE_ID" "$PHONE_BUNDLE_ID" >/dev/null 2>&1 || true
fi

log "Summary: iPhone=$phone_status  iPad=$ipad_status  Watch=$watch_status"
if [[ $phone_status == "ok" && $ipad_status == "ok" && $watch_status == "ok" ]]; then
  notify "Outfit Suggestor" "Installed on iPhone, iPad, and Apple Watch."
  exit 0
fi
notify "Outfit Suggestor" "Install incomplete: iPhone=$phone_status iPad=$ipad_status Watch=$watch_status"
exit 1
