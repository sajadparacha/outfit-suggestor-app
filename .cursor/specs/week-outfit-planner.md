# Feature Spec: Week Outfit Planner

**Branch:** `feature/enhancements`  
**Slug:** `week-outfit-planner`  
**Status:** in-progress

---

## User story

As a logged-in user, I want to plan outfits for selected days of the week with occasions and a daily reminder time, so that I wake up knowing what to wear without re-calling AI each morning.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Week Planner | `frontend/src/views/WeekPlanner.tsx` (route `/week`) | `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift` | Auth-gated like Wardrobe/History |
| Nav entry | NavBar link “Week” → `/week` | Settings or clear tab/stack entry → `.week` route | Route parity: `/week` |
| Today section | Top of Week Planner | Top of Week Planner | Today’s occasion + outfit summary (+ preview if available) |
| About / Guide | `About.tsx`, `UserGuide.tsx` | `AboutView.swift`, `UserGuideView.swift` | New capability |

### Flow

1. Guest opens `/week` → auth gate (same pattern as Wardrobe/History).
2. Authenticated user sees planner: shared style, reminder time (+ timezone from device), Mon–Sun day rows (enable toggle + occasion).
3. User enables days, sets occasions, optionally adjusts shared style / reminder time → Save (PUT) persists plan.
4. User taps **Generate week** → POST generate → one outfit per enabled day; UI updates day rows + Today.
5. User may **Regenerate** a single day.
6. **Today** shows today’s planned occasion + outfit summary (and preview thumbnails when wardrobe matches exist).
7. iOS: after generate/save, schedule local notifications for upcoming enabled days at reminder time; cancel/reschedule on plan changes; cancel when day disabled or plan cleared.
8. Web: no OS push required; Today is prominent; document reminders as iOS-first in Guide/About.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Spinner while fetching plan / generating | “Loading your week…” / “Generating outfits…” |
| Empty (no days enabled) | Prompt to enable days | “Turn on the days you want to plan.” |
| Empty wardrobe on generate | Clear empty / error for that day or whole generate | “Add items to your wardrobe to generate outfits.” (prefer wardrobe-only; if no items, do not call AI — show empty state) |
| Error | Inline / toast error | Reuse existing error tone |
| Success | Day rows show outfit summaries; Today filled | — |
| Guest | Auth gate | Same as Wardrobe/History |

---

## Visual / UX

- Day rows: toggle + occasion picker; optional short outfit summary under each enabled day after generate.
- Reminder time control (default 07:30); timezone = device timezone (display + send to API).
- Shared style for the week (v1 — one style for all days).
- Primary: **Generate week**; secondary: **Save plan**, per-day **Regenerate**.
- Theme: dark slate background, blue-purple gradient accents (`#4facfe` → `#c471ed`).
- Match existing glass/slate cards and filter controls from Suggest/Wardrobe.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class (wider max width, spacing).
- **No** iPad-specific navigation or feature differences.

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Default full-width layout |
| iPad / regular width | Same UI; optional width caps and spacing |

---

## API and contract

### Backend changes needed?

- [x] Yes — weekly plan CRUD, generate, today

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/week-plan` | Load current user’s plan (days + outfits + reminder) |
| `PUT` | `/api/week-plan` | Upsert plan (days, occasions, shared style, reminder_time, timezone) |
| `POST` | `/api/week-plan/generate` | Generate outfits for all enabled days, or one day if `day_of_week` set |
| `GET` | `/api/week-plan/today` | Today’s planned day + outfit (timezone-aware) |
| `DELETE` | `/api/week-plan` | Clear plan and stored outfits |

All require auth (`get_current_active_user`). Unauthenticated → 401.

### Request / response (summary)

**Day of week:** `0` = Monday … `6` = Sunday.

**PUT body:**
```json
{
  "reminder_time": "07:30",
  "timezone": "America/New_York",
  "shared_style": "classic",
  "shared_season": "all-season",
  "days": [
    { "day_of_week": 0, "enabled": true, "occasion": "work" },
    { "day_of_week": 1, "enabled": false, "occasion": "everyday" }
  ]
}
```

**GET / POST generate / today response:** plan object including `days[]` with optional `outfit` (OutfitSuggestion-shaped fields + `summary` string for notifications).

**POST generate body (optional):** `{ "day_of_week": 0 }` — regenerate one day only.

**Generate behavior:**
- Prefer wardrobe-only via existing `suggest_outfit_from_wardrobe_only`.
- If user has no wardrobe items → do not call AI; return plan with empty outfits + message / flag.
- Best-effort avoid reusing wardrobe item IDs across days in the same week (`avoid_outfit_texts` / prompt notes with previously used item IDs).
- Persist outfits on plan storage; also OK to log to `outfit_history`.

### Client contract files to update

**Web**

- [x] `frontend/src/models/...` (week plan DTOs)
- [x] `frontend/src/services/ApiService.ts`
- [x] `frontend/src/controllers/...` (e.g. `useWeekPlanController`)
- [x] `frontend/src/navigation/routes.ts` — `WEEK = '/week'`
- [x] MSW handlers for new endpoints

**iOS**

- [x] `ios-client/OutfitSuggestor/Models/...`
- [x] `ios-client/OutfitSuggestor/Services/...`
- [x] `ios-client/OutfitSuggestor/ViewModels/...`
- [x] `ios-client/OutfitSuggestor/Navigation/AppRoute.swift` — `.week` / path `/week`
- [x] Local notification scheduling helper (new)

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| Occasions | existing FILTER_OPTIONS / Occasion enum | `constants.ts` | `OutfitModels.swift` |
| Styles | existing | same | same |
| Day of week | 0–6 Mon–Sun | new helper or inline | same |
| Default reminder | `07:30` | both | both |
| Route | `/week` | `routes.ts` | `AppRoute` |

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [x] **Yes** — describe what to update:
  - Guide: how to plan the week, generate outfits, Today view; note daily wake-up reminders are **iOS-first** (local notifications); web shows Today in-app.
  - About: mention Week Outfit Planner capability.

When **Yes**, both agents update their platform files before returning.

---

## Platform-specific notes

### Web only

- Navigation: add `ROUTES.WEEK = '/week'`; NavBar link; `App.tsx` view + auth gate like wardrobe/history.
- Storage: JWT only; plan lives on server.
- Reminders: no reliable OS push for v1; optional browser Notification only if already patterned — otherwise skip. Document iOS-first reminders.

### iOS only

- Navigation: `AppRoute.week`; entry from Settings and/or MainTab / RouteCoordinator deep link `/week`.
- Local notifications: schedule at `reminder_time` for each upcoming enabled day with outfit `summary` as body; reschedule on plan/reminder change; cancel when day disabled or plan cleared.
- Permission denied: still show plan UI; do not crash; unit-test scheduling with mocks.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- [x] Test file: `backend/tests/test_week_plan.py`
- [x] Cases:
  - Unauthenticated GET/PUT/generate/today → 401
  - PUT plan then GET returns same days/occasions/reminder
  - Generate with wardrobe creates N outfits for enabled days
  - Generate without wardrobe → empty / no AI crash (clear empty)
  - Today returns correct day for timezone / weekday
  - Single-day regenerate updates only that day

### Web (web agent)

- [x] Unit: week plan helpers / controller tests
- [x] Integration: `WeekPlanner.integration.test.tsx` (or similar)
- [x] Cases:
  - Guest sees auth gate
  - Enable days → set occasions → generate (mocked API) → Today/plan UI updates
  - Reminder time / shared style controls present

### iOS (iOS agent)

- [x] Unit/Integration: `WeekPlannerViewModelTests.swift` (or similar)
- [x] Notification unit test: permission denied / schedule called with expected content (mocked UNUserNotificationCenter)
- [x] Cases:
  - Same planner behavior as web (load, save, generate, today)
  - Notification reschedule/cancel logic
  - UITest only if existing pattern requires it (prefer unit tests)

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Backend | `cd backend && pytest tests/test_week_plan.py -q` |
| Web | tests colocated with changed modules |
| iOS | `OutfitSuggestorTests/<NewClass>Tests.swift` |

### End of Twin UI — confirm, then full suites + report (orchestrator)

| Layer | Command |
|-------|---------|
| Backend (if changed) | `cd backend && pytest -q` |
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test … OutfitSuggestorTests + OutfitSuggestorUITests` |

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Same copy and error messages (reasonable platform wording OK)
- [ ] Equivalent loading / empty / error UI
- [ ] API client methods match on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated
- [ ] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate
- [ ] Full backend pytest pass

---

## Out of scope

- Android
- Email reminders
- Weather-based outfits
- Shopping from the plan
- Multi-week calendar history beyond the recurring weekly template
- Hard blocker on wardrobe item reuse (best-effort only)
- Reliable web OS push notifications
