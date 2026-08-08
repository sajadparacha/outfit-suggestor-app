# Cost Twin UI: Remove Week Planner reminder

**Branch:** `fix/weekly-planner-gui`  
**Slug:** `remove-week-reminder`  
**Status:** done  
**Mode:** Cost Twin UI (narrow scope; targeted tests only)

---

## Goal

Remove the **Reminder** control (time picker + timezone line under it) from Week Planner settings on web and iOS. Season stays as the only shared week setting in that row. Do **not** change backend API shapes — `reminder_time` / `timezone` may still exist on the plan model and be sent with defaults on save.

---

## Files (only these + their tests)

### Web
- `frontend/src/views/components/weekPlan/PlannerSettings.tsx`
- `frontend/src/views/WeekPlanner.tsx` (drop unused reminder props if no longer needed)
- `frontend/src/App.tsx` (drop `onSetReminderTime` wiring if unused)
- `frontend/src/views/components/UserGuide.tsx` (Week Planner steps / Reminders blurb)
- Tests: `frontend/src/views/WeekPlanner.integration.test.tsx` (and any PlannerSettings unit test if present)

### iOS
- `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift` (remove `reminderControl` from shared controls; season full width)
- `ios-client/OutfitSuggestor/Utils/IosLayoutBugFixPresentation.swift` (Season-only layout contract; drop reminder a11y ids from required UI)
- `ios-client/OutfitSuggestor/Models/WeekPlanModels.swift` (`WeekPlanCopy` reminder labels unused OK)
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Utils/MicroHelpCopy.swift`
- `ios-client/OutfitSuggestor/Utils/AuthPromptCopy.swift` (week planner subheadline if it mentions morning reminders)
- `ios-client/OutfitSuggestor/Utils/AdminVisibility.swift` (About feature bullet if it mentions reminders)
- Tests: `ios-client/OutfitSuggestorTests/IosLayoutBugFixPresentationTests.swift` (+ one Guide/copy test if needed)

---

## Behavior

| Before | After |
|--------|--------|
| Season + Reminder side by side | Season only (full width of settings row) |
| Timezone shown under Reminder | Hidden from Week settings UI |
| Guide tells users to set reminder time | Guide: season + plan days only; no reminder setup steps |
| Advanced note: “Daily wake-up reminders on iOS” | Remove that sentence |

Keep ViewModel/`setReminderTime` and API fields for compatibility unless trivially unused after UI removal — do not expand into backend deletion.

**About / Guide:** Yes — update user-visible Week Planner copy that mentions Reminder / wake-up notifications.

**Parity doc:** Skip (capability removed equally; no new feature).

---

## Tests (3–5 bullets)

### Web
- [x] Week settings render Season; **no** “Reminder time” control / `week-reminder-time`
- [x] Timezone test id / Reminder assertions in `WeekPlanner.integration.test.tsx` updated or removed
- [x] Guide Week section no longer instructs setting a reminder time

### iOS
- [x] Shared controls show season id; **no** `week.reminderTime` / `week.timezone` in layout contract tests
- [x] Guide / microhelp copy no longer tells users to set Reminder time

---

## Out of scope

- Backend `reminder_time` column / validation removal
- Full web + iOS + backend suites (Cost Twin UI)
- Reworking local notification scheduler internals beyond UI/copy (scheduler may keep using default `reminder_time` silently)

---

## Parity checklist

- [x] Reminder control gone on web and iOS
- [x] Season control remains
- [x] Guide/About/microhelp updated on both platforms
- [x] Targeted tests pass
