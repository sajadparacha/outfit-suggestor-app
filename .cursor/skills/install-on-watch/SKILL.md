---
name: install-on-watch
description: Installs the Outfit Suggestor watch app (and optionally the iPhone app) on Sajad's physical Apple Watch Ultra 3 / iPhone with devicectl. Use when the user asks to install, reinstall, or push the app to the watch, says the watch app is missing, or the watch shows "Open your iPhone" after an install.
---

# Install on Apple Watch

watchOS only auto-installs companion apps for App Store / TestFlight builds. This is a free
Personal Team (no TestFlight), so dev builds must be pushed to the watch with `devicectl`.
Project settings are already correct — do not change `WKCompanionAppBundleIdentifier`,
`WKRunsIndependentlyOfCompanionApp`, or the `Embed Watch Content` phase to "fix" installs.

## Devices

| Device | Name | UDID |
|---|---|---|
| iPhone | `Sajjad iphone` (iPhone 18 Pro Max) | `00008160-000E082624A3400A` |
| Watch | Sajjad's Apple Watch (Ultra 3) | `00008310-000CF5C90A40E01E` |

Another iPhone (`Ayan iphone`) is paired with the Mac — always pass `--phone` in the CLI flow.

## Steps

Run from `ios-client/`. Script: `scripts/install-watch-companion.sh` (6 attempts, 20 s apart,
macOS notification on success/failure).

1. **Watch only** (iPhone app already installed, existing build is fine):

```bash
cd ios-client && ./scripts/install-watch-companion.sh --watch 00008310-000CF5C90A40E01E
```

2. **iPhone then watch** (fresh install of both from the last device build):

```bash
cd ios-client && ./scripts/install-watch-companion.sh --install-phone \
  --phone 00008160-000E082624A3400A --watch 00008310-000CF5C90A40E01E
```

3. **Latest code**: build for device first, then step 2 with the built app:

```bash
cd ios-client && xcodebuild -project OutfitSuggestor.xcodeproj -scheme OutfitSuggestor \
  -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath build-device \
  -allowProvisioningUpdates build
```

   The default `--app` is `build-device/Build/Products/Debug-iphoneos/OutfitSuggestor.app`.
   Check its date and tell the user if it is stale.

4. **All devices (iPhone + iPad + watch)** — builds, then installs iPhone → iPad → watch
   (add `--skip-build` to reuse the last build; iPad UDID `00008142-001909C222C2401C`):

```bash
cd ios-client && ./scripts/build-and-install-all.sh
```

Run the install command with a long `block_until_ms` (~300000): each failed connection takes ~40 s.

## Xcode Run (automatic)

The `OutfitSuggestor` scheme has a Run pre-action that, on `iphoneos`, starts the script with
`--wait-for-phone-launch` in the background: it waits for a new iPhone app PID (install done),
then pushes the watch app. Log: `/tmp/outfit-watch-install.log`. Disable: `SKIP_WATCH_INSTALL=1`.

## Rules

- **Order matters:** iPhone app first, then watch app. If the iPhone app is reinstalled after the
  watch app, WatchConnectivity reports `isWatchAppInstalled == false` and the watch shows
  "Open your iPhone" — reinstall the watch app (step 1).
- **"Timed out while attempting to establish tunnel"** = watch asleep/locked/off Wi-Fi. The
  script retries; if all attempts fail, ask the user to wake + unlock the watch (on Wi-Fi, near
  the iPhone) and rerun. Usually succeeds within a few attempts.
- **Install silently fails / provisioning errors:** check the watch UDID is in the profile:
  `security cms -D -i <app>/Watch/OutfitSuggestorWatch.app/embedded.mobileprovision | plutil -extract ProvisionedDevices json -o - -`
- Personal Team builds expire after **7 days** — reinstall both.
- After install, tell the user to open the iPhone app first, then "Outfit" on the watch, to sync.
- Background: `.cursor/specs/watchos-companion-app.md` §9.
