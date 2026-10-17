# Feature Specification: Outfit Suggestor for Apple Watch

> Purpose of this document: a complete, self-contained description of the watchOS companion app for
> Outfit Suggestor — product behaviour, architecture, data flow, design decisions, the real-world
> device setup journey, and lessons learned. Written so it can be handed to a writer (or an AI) to
> produce a technical article.

---

## 1. Context

**Outfit Suggestor** is an AI-powered wardrobe assistant available on the web and as a native iOS app
(SwiftUI, iPhone + iPad). Users photograph their clothes to build a digital wardrobe, then ask the AI
to suggest outfits for an occasion and style. A **Week Planner** lets users plan an outfit for each
day of the week (Monday–Sunday): each day can be enabled, given an occasion (e.g. *Business Casual*)
and a style (e.g. *Classic*), and filled with an AI-generated outfit built from their own wardrobe.

**The gap:** the moment a user actually needs the plan is when they are getting dressed — usually
without their phone in hand. The watch is already on the wrist.

**The feature:** a native Apple Watch app that shows the outfit planned for today (and the rest of
the week), with pictures of each garment, synced automatically from the iPhone.

---

## 2. Goals and non-goals

### Goals
- Glanceable: see today's outfit in under two seconds after raising the wrist.
- Visual: show a picture of each garment, enlargeable full screen.
- Navigable: swipe between weekdays, just like the iPhone Week Planner.
- Offline: once synced, the watch works without the phone nearby.
- Zero setup: no separate login on the watch; the iPhone pushes data automatically.
- On the wrist without opening the app: morning reminder with garment pictures, and a watch-face
  complication / Smart Stack widget showing today's outfit.

### Non-goals (v1)
- Editing the plan or generating outfits on the watch (the watch is read-only).
- Talking to the backend directly from the watch (no network calls, no auth tokens on the watch).

---

## 3. User experience

### 3.1 Primary flow
1. On iPhone, the user signs in and opens **Week Planner**, enables days, and generates outfits.
2. The iPhone silently sends the week to the watch.
3. On the watch, the user opens **Outfit**. It opens on **Today**.
4. Each garment is a row: small thumbnail, category label (SHIRT, TROUSERS, SHOES…), short name
   ("Light blue oxford shirt").
5. Tapping a thumbnail opens the picture full screen. **Turning the Digital Crown zooms up to 3×**;
   dragging pans around the zoomed picture.
6. **Swiping left/right** moves between Monday … Sunday (page dots at the bottom).
7. Re-opening the app always returns to today's page.

### 3.2 Screen states and exact copy

| State | When | Title | Body |
|---|---|---|---|
| Outfit | Day enabled and has an outfit | Day name header + "Occasion · Style" | List of garments with thumbnails |
| Not generated yet | Day enabled but no outfit | "Not generated yet" | Today: "Generate today's outfit in Week Planner on your iPhone." Other day: "Generate Friday's outfit in Week Planner on your iPhone." |
| No outfit planned | Day disabled / not in plan | "No outfit planned" | Today: "Today isn't in your Week Planner. Add it on your iPhone." Other day: "Friday isn't in your Week Planner. Add it on your iPhone." |
| Signed out | User signed out on iPhone | "Signed out" | "Sign in on your iPhone to see today's outfit." |
| Waiting for phone | Nothing ever received | "Open your iPhone" | "Open Week Planner in Outfit Suggestor on your iPhone to send your outfits here." |

- Page titles: **"Today"** for the current day; three-letter weekday ("Wed") for others.
- Signed-out and waiting states show a **single page**, not seven identical pages.
- Labels like `business-casual` / `smart_casual` are humanised to "Business Casual".
- The view refreshes every minute (`TimelineView(.everyMinute)`) so "Today" rolls over at midnight.

### 3.2a Morning reminder on the watch
- The iPhone's "Today’s outfit" local notification carries the category `WEEK_PLAN_TODAY`
  (identifier, title, body and `week_plan_day_of_week` unchanged; iPhone appearance unchanged).
- iOS forwards it to the watch when the iPhone is locked and the watch is worn. The watch app's
  `WKNotificationScene` shows the day name + "Occasion · Style" and up to 4 garment rows
  (40 pt thumbnail, LABEL, short name), looked up in the stored snapshot by day of week.
- No snapshot / no outfit for that day → plain title + body.
- Tapping opens the watch app on that day's page (once; the next open returns to Today).

### 3.2b Complication and Smart Stack
Widget extension `OutfitSuggestorWatchWidgets` (families: rectangular, inline, circular, corner),
always describing **today**:

| State | Rectangular | Inline | Circular | Corner |
|---|---|---|---|---|
| Outfit | Day name / garment 1 / garment 2 (summary if no items) | "Today: Navy blazer · Charcoal trousers" | app logo | first garment name |
| Not generated | Day name / "Not generated yet" | "Today: Generate" | app logo | "Generate" |
| Nothing planned | Day name / "No outfit planned" | "Today: No plan" | app logo | "No plan" |
| Signed out | "Today" / "Signed out" | "Today: Signed out" | app logo | "Signed out" |
| Waiting | "Today" / "Open your iPhone" | "Today: Open iPhone" | app logo | "Open iPhone" |

Rectangular (also the Smart Stack card): when the day's garments have pictures, the garment lines are
replaced by up to 4 thumbnails (30 pt, wearing order); no pictures → text lines as above.

Widget images (thumbnails and the circular logo) are redrawn by `Shared/WidgetImage.swift` into sRGB
bitmaps at exactly their on-screen pixel size (points × 2). On a physical watch, an image larger than
the pixels it is drawn into makes watchOS show the grey redacted placeholder instead of the widget
(the simulator does not reproduce this).

Circular shows the Outfit logo (C + hanger + star, transparent cut-out of the app icon in the widget's
asset catalog) on the system background; VoiceOver reads the inline text.

- Garment names > 18 characters → 17 + "…"; corner text > 12 → 11 + "…".
- Timeline: an entry now, morning-window start/end for each of the next 7 days, and each of the next
  7 midnights; policy `.atEnd`. No network — the weekly plan repeats by weekday.
- Smart Stack relevance: 1.0 on outfit days during the morning window (morning refresh time, default
  05:00, for 4 hours); 0.1 otherwise.
- Tapping opens the app on Today.

### 3.3 Accessibility
- Thumbnails are buttons labelled "View <item name> full size".
- The enlarged picture carries the item name as its accessibility label.
- Text rows use Dynamic Type fonts (`.body`, `.caption2`).

---

## 4. Architecture

### 4.1 Targets
| Target | Platform | Role |
|---|---|---|
| `OutfitSuggestor` | iOS 16+ | Main app; owns auth, API, Week Planner; **sends** data to the watch |
| `OutfitSuggestorWatch` | watchOS 10+ | Single-target SwiftUI watch app; **receives** and displays |
| `Shared/` | both | Snapshot model, state resolution and copy, compiled into both targets |

The watch app is embedded in the iPhone app (`Embed Watch Content` build phase) and declares its
companion via `WKCompanionAppBundleIdentifier = com.sajad.outfitsuggestor`
(watch bundle ID `com.sajad.outfitsuggestor.watchkitapp`).

### 4.2 Key files
| File | Responsibility |
|---|---|
| `Shared/WatchWeekSnapshot.swift` | `Codable` snapshot (days → items → optional JPEG), day-of-week mapping, merge logic, `WatchTodayState` resolver, `WatchCopy` strings |
| `OutfitSuggestor/Utils/WatchWeekSnapshotBuilder.swift` | Converts the API's week plan into a compact snapshot; resizes and compresses garment pictures within a byte budget |
| `OutfitSuggestor/Services/PhoneWatchSync.swift` | `WCSession` on iPhone: sends text via application context and pictures via file transfer |
| `OutfitSuggestorWatch/WatchSnapshotStore.swift` | `WCSession` on watch: receives, merges, persists to the App Group; reloads widget timelines on change |
| `OutfitSuggestorWatch/TodayOutfitView.swift` | Paged weekday UI, garment rows, full-screen zoomable picture |
| `Shared/WatchSnapshotStorage.swift` | App Group (`group.com.sajad.outfitsuggestor`) read/write + one-time migration from standard defaults |
| `Shared/WatchReminder.swift` | Reminder category, day lookup, watch notification content |
| `Shared/WatchComplication.swift` | Pure timeline, relevance and per-family complication text (no WidgetKit) |
| `OutfitSuggestorWatch/WatchNotificationView.swift` | `WKUserNotificationHostingController` for the reminder |
| `OutfitSuggestorWatch/WatchAppDelegate.swift` | Registers the category; tapped reminder → that day's page |
| `OutfitSuggestorWatchWidgets/OutfitSuggestorWatchWidgets.swift` | WidgetKit extension (complication + Smart Stack) |
| `Shared/WidgetImage.swift` | Redraws widget pictures at exact on-screen pixel size (sRGB, 2x) |
| `Shared/WidgetImage.swift` | Redraws widget pictures at exact on-screen pixel size (sRGB, 2x) |
| `OutfitSuggestorTests/WatchWeekSnapshotTests.swift` | Unit tests (26) |
| `OutfitSuggestorTests/WatchReminderComplicationTests.swift` | Timeline, relevance, complication text, reminder lookup, storage, widget image sizing (19) |

### 4.3 Why the watch never calls the backend
The watch has no auth token, no API client and no network code. All data flows phone → watch.
This keeps credentials on one device, avoids duplicating the API layer, and makes the watch work
in airplane mode once synced. Trade-off: the watch only updates after the iPhone app has run.

---

## 5. Data model

```swift
struct WatchWeekSnapshot: Codable, Equatable {
    struct Item: Codable, Equatable {
        let label: String      // "Shirt", "Trousers", "Shoes" …
        let name: String       // short display name parsed from the AI text
        var imageData: Data?   // small JPEG, optional
    }
    struct Day: Codable, Equatable {
        let dayOfWeek: Int     // 0 = Monday … 6 = Sunday (backend convention)
        let enabled: Bool
        let occasion: String
        let style: String
        let summary: String
        let items: [Item]
    }
    let isSignedIn: Bool
    let days: [Day]
    let updatedAt: Date
}
```

**Day-of-week mapping gotcha:** Apple's `Calendar` weekday is 1 = Sunday … 7 = Saturday; the
backend uses 0 = Monday … 6 = Sunday. Conversion: `(calendarWeekday + 5) % 7`. Covered by a test
(Sunday → 6, Monday → 0).

**Garment order** follows how people dress: Shirt, Trousers, Sweater, Blazer, Outerwear, Shoes,
Belt, Tie. Empty slots and placeholder values ("none", "null", "n/a") are skipped.

**Short names:** the AI returns descriptive text ("Light blue oxford shirt — breathable cotton");
the builder reuses the iPhone's existing parser to show just "Light blue oxford shirt" on the small
screen.

---

## 6. Sync design (WatchConnectivity)

### 6.1 Two channels, one snapshot
| Channel | API | Carries | Why |
|---|---|---|---|
| Application context | `updateApplicationContext(_:)` | Text-only snapshot | Latest-state-wins, delivered fast, survives app restarts; but has a **small size limit** |
| File transfer | `transferFile(_:metadata:)` | Full snapshot incl. JPEGs (JSON file) | Background, queued, no practical size limit |

Pictures for a whole week (up to 7 days × 8 garments) do not fit in an application context, so the
design splits them: text arrives instantly, pictures follow a few seconds later.

### 6.2 When the iPhone sends
- Whenever the Week Planner loads, saves, regenerates a day, clears a day, or changes reminder
  settings (same hook that reschedules local notifications).
- On sign-out, a `signedOut` snapshot is sent so the watch stops showing a stale plan.
- On `WCSession` activation and on `sessionWatchStateDidChange` (e.g. watch app just installed),
  the latest snapshot is re-flushed.
- Guard: only sends when the session is activated, paired, and `isWatchAppInstalled == true`.

### 6.2a Fresh data without opening the iPhone app
- **Watch pull:** whenever the watch app becomes active (and when the iPhone comes back in range),
  it sends `sendMessage(["refreshWeekSnapshot": true])`. iOS wakes the iPhone app in the background;
  it fetches `GET /api/week-plan` with the stored token, replies immediately with the text snapshot,
  and queues the pictures as a file transfer. A `beginBackgroundTask` keeps the phone awake for the
  network call.
- **Morning push:** a `BGAppRefreshTask` (`com.sajad.outfitsuggestor.watchRefresh`, Info.plist
  `UIBackgroundModes = fetch`) is scheduled for the next 05:00 and re-schedules itself, so the plan
  is usually on the wrist before getting dressed. iOS decides the exact run time.
- **Refresh time is set on the watch:** gear button → *Settings* → *Morning refresh* (30-minute
  steps, default 05:00). The watch sends the choice with `sendMessage` when the iPhone is reachable,
  or queues it with `transferUserInfo` otherwise. The iPhone saves it, cancels and re-submits the
  background task, and echoes the value back in the snapshot (`morningRefreshMinutes`) so both
  devices agree; the watch shows its pending choice until that confirmation arrives.
- Signed out on the phone → the watch receives the signed-out snapshot. Server error → nothing is
  sent, so the watch keeps its last good copy.
- Picture files are only re-sent when the days/pictures actually changed, not on every refresh.

### 6.3 File transfer hygiene
- Older outstanding transfers are cancelled before a new one starts (only the newest matters).
- Identical payloads are not re-sent (byte comparison with the last transferred file).
- Temporary files are deleted in `session(_:didFinish:error:)`.
- If the **newest** transfer fails, the "last sent" marker is cleared so the next flush retries;
  failures of cancelled older transfers are ignored.

### 6.4 Watch-side merge (order-independent)
Text and pictures can arrive in either order. The store's `receive(_:)`:
- If the incoming snapshot is **older** than what's stored (`updatedAt`), keep the stored text and
  only borrow pictures from the incoming one.
- Otherwise take the incoming snapshot and borrow pictures from the stored one.
- A picture is borrowed only when the item is **unchanged** — same day, same label, same name. If the
  user swapped the shirt, the old picture is not shown next to the new name.
- The merged snapshot is persisted to `UserDefaults` for offline use.
- `didReceive file:` reads the file synchronously, because watchOS deletes it when the callback returns.

---

## 7. Pictures

- **Source:** the same thumbnails the iPhone Week Planner shows — base64 photos of the user's own
  wardrobe items matched to each slot (`matching_wardrobe_items`, selected by slot ID). Items without
  a wardrobe photo show as text only.
- **Resizing:** drawn into a 1× renderer on a white background (garment photos can have transparent
  backgrounds that would turn black as JPEG).
- **Budget:** all pictures for the week together must fit **600 KB**. The builder tries progressively
  smaller encodings — 320 px @ 55% quality → 240 px @ 45% → 160 px @ 40% — and drops pictures
  entirely if even the smallest doesn't fit, so text sync is never blocked by images.
- **Viewer:** full-screen sheet; Digital Crown zoom 1×–3× (`digitalCrownRotation`), pan via
  two-axis `ScrollView`.

---

## 8. Testing

Unit tests in `WatchWeekSnapshotTests` (26, all passing):
- Refresh: signed out → signed-out snapshot with no network call; server error → nothing sent;
  success → snapshot built from the server plan; watch request reply is text-only; next refresh is
  05:00 the same or next day.
- Builder: short names, wearing order, skipping empty/placeholder slots, day sorting, signed-in flag.
- Day mapping: Sunday → 6, Monday → 0.
- State resolution: outfit / not generated / nothing planned / signed out / waiting; by date and by
  explicit day index.
- Pictures: present for every planned day; absent when no wardrobe photo; downscaled to ≤ 320 px
  and within budget.
- Transport: application context is text-only; file payload round-trips with pictures intact.
- Merge: pictures kept for unchanged items, dropped for changed ones.
- Copy: weekday names, short titles, day-specific messages.

`WatchReminderComplicationTests` (16): rectangular thumbnails vs. text, 7 midnight entries and entry ordering, past morning entries
skipped, state per day (Sunday → 6, Monday → 0), signed-out/waiting everywhere, morning relevance
(default and custom refresh time, window past midnight), text per family and state incl. truncation and
summary fallback, reminder day lookup (user info, identifier, invalid) and ≤ 4 items vs. fallback,
App Group migration. `WeekPlanNotificationSchedulerTests` also checks the reminder carries
`WEEK_PLAN_TODAY` with identifier/title/body/user info unchanged.

UI behaviour (swiping, crown zoom) was verified manually on a physical Apple Watch Ultra 3.

---

## 9. Real-world journey: getting a dev build onto a physical watch

This was the most time-consuming part and is worth telling honestly. Setup: Xcode 27.0, iPhone on
iOS 27, Apple Watch Ultra 3, **free Apple ID (Personal Team)**.

1. **Install button does nothing.** The iPhone's Watch app listed "Outfit" under *Available Apps*,
   but tapping *Install* silently failed. Inspecting `embedded.mobileprovision` showed why: the
   development profile listed the iPhone and iPad but **not the watch** — the watch had never been
   registered because Xcode had never seen it.
2. **Watch invisible to Xcode.** Needed: Developer Mode on both iPhone and watch, all devices on the
   same Wi-Fi, Bluetooth on, iPhone cabled and unlocked. Even then, discovery only succeeded after
   **restarting both the iPhone and the watch**. Xcode 27 also renamed/moved *Devices and
   Simulators* — the device list now shows a live mirror of the phone (shortcut ⇧⌘2 still works).
3. **No UDID shortcut.** Modern iOS no longer shows the watch UDID in the Watch app, so manual
   registration on the developer portal wasn't possible.
4. **TestFlight not available.** Archiving worked, but upload failed with "No provider associated
   with App Store Connect user" — a free Personal Team has no App Store Connect access. TestFlight
   requires the paid Apple Developer Program.
5. **Installed, but no data.** Once the watch connected, the app installed — but the watch showed
   "Open your iPhone". Temporary logging revealed `isWatchAppInstalled == false` on the iPhone:
   WatchConnectivity refuses to deliver unless the phone considers its companion installed.
   Root cause: the watch app had been installed directly, then the iPhone app was reinstalled.
   **Fix: install the iPhone app first, then the watch app.** After that, `isWatchAppInstalled`
   became `true` and the snapshot arrived.
6. **Free-account caveat:** apps signed by a Personal Team expire after **7 days** and must be
   reinstalled from Xcode.
7. **Watch app not installed with the iPhone app.** watchOS only auto-installs companion apps for
   App Store / TestFlight builds; a Run from Xcode leaves the watch app under *Available Apps*.
   **Fix:** the `OutfitSuggestor` scheme's Run pre-action starts
   `ios-client/scripts/install-watch-companion.sh --wait-for-phone-launch` in the background on
   device runs. It waits until Xcode has (re)launched the iPhone app (new PID), then pushes
   `OutfitSuggestor.app/Watch/OutfitSuggestorWatch.app` to the paired watch with
   `devicectl device install app` (6 attempts, 20 s apart) and posts a macOS notification.
   Log: `/tmp/outfit-watch-install.log`. Disable with `SKIP_WATCH_INSTALL=1`.
   CLI without Xcode: `ios-client/scripts/install-watch-companion.sh --install-phone --phone "Sajjad iphone"`
   (installs iPhone app, then watch app, then launches the iPhone app).
   The watch must be awake, unlocked and on Wi-Fi, otherwise `devicectl` fails with
   "Timed out while attempting to establish tunnel".

Useful command-line tools along the way: `xcrun devicectl list devices`, `devicectl device install
app`, `devicectl device process launch --console` (stream `print` output from a device app),
`security cms -D -i embedded.mobileprovision` (inspect which devices a profile covers).

---

## 10. Lessons learned

- **Split by payload size, not by feature.** Application context for small, latest-state data;
  file transfer for heavy assets. Design the merge so arrival order doesn't matter.
- **Read-only companions are cheap and robust.** No auth, no network, works offline.
- **Budget images explicitly.** Progressive downscaling with a hard cap keeps sync reliable.
- **Provisioning is the real boss level.** Most "it won't install" problems are a profile that
  doesn't include the device. Check `ProvisionedDevices` before anything else.
- **Install order matters for WatchConnectivity** during development.
- **Watch out for silent project-setting drift.** Accepting Xcode's "recommended settings" raised the
  iOS deployment target from 16.0 to 27.0, which broke simulator tests; it was reverted.

---

## 11. Known limitations

- Fresh data needs the iPhone nearby (Bluetooth/Wi-Fi); otherwise the watch shows its last saved
  copy (usually from the 05:00 background refresh).
- Background refresh timing is decided by iOS and is skipped if the user disables Background App
  Refresh or force-quits the app.
- Items without a wardrobe photo show text only.
- Free-account builds expire after 7 days.
- The reminder only reaches the watch when iOS forwards it (iPhone locked, watch worn); its pictures
  come from the watch's last snapshot, so a stale snapshot falls back to plain text.
- Complication text is built from the last snapshot; after time-zone travel the midnight entries are
  corrected on the next snapshot save.

## 12. Future work

- Mark an outfit as "worn" from the watch.
- Direct watch → backend fetch (cellular Ultra) for when the iPhone is far away.
- Show the AI-generated model image (full look) as the first page of each day.

---

## 13. Tech stack summary

SwiftUI (iOS 16+, watchOS 10+) · WatchConnectivity (`WCSession`: application context + file
transfer) · `UIGraphicsImageRenderer` JPEG downscaling · `UserDefaults` offline cache ·
`TimelineView`, paged `TabView`, `digitalCrownRotation` · XCTest · Xcode 27 / `devicectl` ·
Backend: Python API with AI outfit generation (unchanged for this feature).
