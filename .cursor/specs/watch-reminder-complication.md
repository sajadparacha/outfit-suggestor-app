# Spec: Watch morning reminder + complication / Smart Stack

**Branch:** current branch (no commit) · **Platforms:** iOS + watchOS only · **Backend / frontend:** untouched
**Base architecture:** `.cursor/specs/watchos-companion-app.md` (v1 — read-only watch, no network, no token)

## 1. Goal

- **A — Reminder on the watch:** the existing iPhone "Today’s outfit" local notification, when shown on
  the watch, uses a custom view showing today's outfit with garment thumbnails, built from the synced snapshot.
- **B — Complication + Smart Stack widget:** a watchOS WidgetKit extension shows today's outfit on watch
  faces and in the Smart Stack, built from the same snapshot (shared through an App Group).

Unchanged: iPhone Week Planner UX, iPhone notification look, sync design, backend.

## 2. UX and copy

### 2.1 Reminder (A)

- iPhone scheduler adds `categoryIdentifier = "WEEK_PLAN_TODAY"`. Identifier (`week-plan.day.N`), title
  ("Today’s outfit"), body (outfit summary), sound and userInfo (`week_plan_day_of_week`) stay **unchanged**.
- Category (no actions) registered on iPhone (in `reschedule`, before adding requests) and on the watch (app delegate at launch).
- iOS forwards the notification to the watch when the iPhone is locked and the watch is worn. The watch
  app's `WKNotificationScene(category: "WEEK_PLAN_TODAY")` renders:

| Case | Content |
|---|---|
| Snapshot has the day with an outfit | Header: day name ("Friday") + `WatchCopy.contextLine` ("Business Casual · Classic"); then **up to 4** garment rows: 40 pt rounded thumbnail (if present), LABEL (uppercase caption2), short name (body). Items empty but summary present → summary text (same as the app). |
| No snapshot / no matching day / day not an outfit | Plain fallback: notification title + body (as delivered) |

- Day lookup: `userInfo["week_plan_day_of_week"]` (0–6), else parsed from identifier `week-plan.day.N` (same rule as today's iPhone helper).
- **Tap** → watch app opens on that day's page (overrides the "always open on Today" reset for that launch only).

### 2.2 Complication / Smart Stack (B)

The complication always describes **today**. Rectangular uses the existing full `WatchCopy` titles; families
with very little space use **short labels** (proposed new `WatchCopy` constants, flagged for your approval):

| State | Rectangular (3 lines) | Inline | Circular | Corner |
|---|---|---|---|---|
| Outfit | `Friday` / garment 1 / garment 2 (summary if no items) | `Today: Navy blazer · Charcoal trousers` | Outfit app logo (all states) | first garment name |
| Not generated | `Friday` / "Not generated yet" | `Today: Generate` | logo | `Generate` |
| Nothing planned | `Friday` / "No outfit planned" | `Today: No plan` | logo | `No plan` |
| Signed out | `Today` / "Signed out" | `Today: Signed out` | logo | `Signed out` |
| Waiting | `Today` / "Open your iPhone" | `Today: Open iPhone` | logo | `Open iPhone` |

- **New short strings (approval needed):** `Generate`, `No plan`, `Open iPhone` (`Signed out` reuses the existing title).
  Symbols match the in-app state icons.
- **Truncation (pure, tested):** garment names > 18 chars → first 17 + "…" (rectangular, inline);
  corner text > 12 chars → first 11 + "…". Beyond that the system clips.
- **Tap** → opens the watch app on Today (existing scene-phase reset; `widgetURL` not required).

### 2.3 Timeline and relevance

- Pure `WatchComplicationTimeline.entries(snapshot:now:calendar:)` in `Shared/` (no WidgetKit types):
  - Entry at `now`; then for today … today+6: **morning start**, **morning end** (skipped if ≤ now); midnight
    entries at the start of today+1 … today+7 (**7 midnights**). Policy `.atEnd` → WidgetKit asks again after 7 days.
  - Each entry: `date`, `dayOfWeek` (Sunday → 6, Monday → 0), `state: WatchTodayState`, `relevance: Double`.
- **Relevance:** morning window = `snapshot.morningRefreshMinutes ?? 05:00` for 4 h. Outfit day inside the window → `1.0`;
  everything else → `0.1`. Mapped to `TimelineEntryRelevance(score:)` in the widget.
- Watch store calls `WidgetCenter.shared.reloadAllTimelines()` only when it saves a **changed** snapshot.

## 3. Storage (App Group)

- App Group `group.com.sajad.outfitsuggestor` on the **watch app** and **widget extension** only (iPhone entitlements unchanged).
- `Shared/WatchSnapshotStorage` (defaults-injected, testable): `load()`, `save(_:)`, `migrateIfNeeded(from: .standard)` —
  copies `watch.weekSnapshot` from standard defaults to the suite once, then removes the old value.
- `WatchSnapshotStore` uses it; the notification controller and widget read through it.

## 4. Files

**New**
- `ios-client/Shared/WatchComplication.swift` — timeline, per-family text, relevance (iOS app for tests, watch, widget)
- `ios-client/Shared/WatchReminder.swift` — category id, userInfo key, day lookup, notification content model (iOS, watch)
- `ios-client/Shared/WatchSnapshotStorage.swift` — App Group read/write + one-time migration (iOS, watch, widget)
- `ios-client/OutfitSuggestorWatch/WatchNotificationView.swift` — `WKUserNotificationHostingController` + SwiftUI view
- `ios-client/OutfitSuggestorWatch/WatchAppDelegate.swift` — register category, handle tap → focus day
- `ios-client/OutfitSuggestorWatch/OutfitSuggestorWatch.entitlements` — App Group
- `ios-client/OutfitSuggestorWatchWidgets/` — `OutfitSuggestorWatchWidgets.swift` (bundle, provider, family views), `Info.plist`, `.entitlements`
- `ios-client/OutfitSuggestorTests/WatchReminderComplicationTests.swift`
- `ios-client/WatchTestPayloads/week-plan-today.apns` — simulator push payload (not in any target)

**Modified**
- `Shared/WatchWeekSnapshot.swift` — 3 short `WatchCopy` labels
- `OutfitSuggestorWatch/WatchSnapshotStore.swift` — App Group storage, timeline reload, `focusDay`
- `OutfitSuggestorWatch/OutfitSuggestorWatchApp.swift` — notification scene, delegate adaptor, `#if DEBUG` sample-snapshot launch arg for simulator
- `OutfitSuggestorWatch/TodayOutfitView.swift` — honour `focusDay` from a tapped notification
- `OutfitSuggestor/Utils/WeekPlanNotificationScheduler.swift` — category on content + `setNotificationCategories` in protocol/reschedule
- `OutfitSuggestorTests/WeekPlanNotificationSchedulerTests.swift` — mock records categories + new test
- `OutfitSuggestor.xcodeproj/project.pbxproj` — widget target `OutfitSuggestorWatchWidgets`
  (`com.sajad.outfitsuggestor.watchkitapp.widgets`, watchOS 10.0), "Embed Foundation Extensions" in the watch app,
  entitlements, Shared files membership. iOS 16.0 / watchOS 10.0 kept; no "recommended settings".
- `.cursor/specs/watchos-companion-app.md` — sections 2, 3, 4.2, 8, 11, 12

About/Guide: **no change** (no iPhone copy changes).

## 5. Risks

1. **Personal Team + App Groups (blocking check).** Apple docs say App Groups are allowed for free teams, but that isn't
   proven for this account. **First implementation step:** add the App Group to the watch app and run a device-signing build
   (`-allowProvisioningUpdates`, generic watchOS). If provisioning rejects it → **stop and report** before choosing an alternative
   (options: ship A only; paid program; deprecated ClockKit in-app complication).
2. Free team limits: the widget adds a new App ID (free limit 10 per 7 days); all builds expire after 7 days.
3. Forwarding: iPhone notifications only appear on the watch when the iPhone is locked/asleep and the watch is worn and unlocked.
4. Notification content comes from the watch's last snapshot; if it's stale or missing the day, the fallback shows title/body.
5. Midnight entries use the calendar at build time; time-zone travel is corrected on the next snapshot save (reload).
6. Watch widget memory is small; the snapshot (≤ ~600 KB with pictures) is decoded once per timeline request — the widget uses text only.

## 6. Tests (targeted)

`WatchReminderComplicationTests` (new):
- Timeline: exactly 7 midnight entries at startOfDay(today+1…+7); first entry at `now`; morning entries skipped when past
- Timeline state per day: outfit / notGenerated / nothingPlanned on the right days; signedOut and waiting for all entries
- Day mapping in entries: Sunday → 6, Monday → 0
- Complication text per family × state (outfit, notGenerated, nothingPlanned, signedOut, waiting), incl. 18/12-char truncation and summary fallback
- Relevance: 1.0 for outfit inside the morning window (default 05:00 and custom `morningRefreshMinutes`), 0.1 outside and for non-outfit states
- Reminder: day lookup from userInfo, from identifier, invalid → nil; content = outfit (≤ 4 items) when the day has one, fallback otherwise
- Storage: migration copies the standard-defaults snapshot to the suite once and removes the old key; save/load round-trip

`WeekPlanNotificationSchedulerTests` (extend):
- `reschedule` sets `categoryIdentifier == "WEEK_PLAN_TODAY"` and registers the category; identifier/title/body/userInfo unchanged

Run only:
```
xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:OutfitSuggestorTests/WatchWeekSnapshotTests \
  -only-testing:OutfitSuggestorTests/WeekPlanNotificationSchedulerTests \
  -only-testing:OutfitSuggestorTests/WatchReminderComplicationTests
```
Build: `OutfitSuggestor` (iOS sim) and `OutfitSuggestorWatch` (Apple Watch Ultra 3 sim).

- [x] Signing probe (App Group) passed — watch app and widget, Personal Team 7UVB6XM3R7, generic watchOS device build
- [x] Targeted tests green — 52/52 (WatchReminderComplicationTests 15, WatchWeekSnapshotTests 26, WeekPlanNotificationSchedulerTests 11)
- [x] Both schemes build — OutfitSuggestor (iPhone 17 sim), OutfitSuggestorWatch (Apple Watch Ultra 3 sim)
- [x] Docs updated
- [ ] Manual: complication families on a watch face (simulator / device)
- [ ] Manual: custom notification via `simctl push`
