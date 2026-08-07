# Feature Spec: Week Planner slot wardrobe pick

**Branch:** `fix/weekly-planner-gui`  
**Slug:** `week-planner-slot-wardrobe-pick`  
**Status:** done  
**Mode:** Cost Twin UI (short)

---

## Goal

Fix Week Planner **Change** (and Add on empty slot): picking a wardrobe item must apply it to that day’s slot and return to Week on that day. Today Change only opens Wardrobe with a category filter; selection does nothing.

## User story

As a user editing a week-plan day, I want Change/Add to open Wardrobe in pick mode so that tapping an item fills that day’s slot and returns me to that day.

## Flow (both platforms)

1. **Start session** — Change (or Add empty slot) starts a picker session `{ dayOfWeek, slotKey }` (+ category filter for that slot).
2. **Pick mode** — Wardrobe shows clear banner: `Choose [slot] for [day]`; filters to that slot’s categories; tap item = select (not Suggest / edit).
3. **Apply** — Write item into that day’s outfit slot (description + image / `wardrobe_item_ids` as existing models allow); mark plan dirty; use existing week-plan update/save path — **no new API**.
4. **Return** — Navigate back to Week on that `dayOfWeek`; clear picker session.
5. **Cancel** — Back/Cancel without pick clears session; normal Wardrobe restored.

## Allowed files (+ their tests)

**Web**

- `frontend/src/views/WeekPlanner.tsx`
- `frontend/src/views/components/weekPlan/OutfitPreview.tsx`
- `frontend/src/views/components/weekPlan/OutfitItem.tsx`
- `frontend/src/views/components/Wardrobe.tsx`
- `frontend/src/App.tsx` / `frontend/src/navigation/routes.ts` (query/state if needed)
- `frontend/src/controllers/useWeekPlanController.ts`
- One test file max (prefer extend existing WeekPlanner / Wardrobe / controller test)

**iOS**

- `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift`
- `ios-client/OutfitSuggestor/ViewModels/WeekPlannerViewModel.swift`
- `ios-client/OutfitSuggestor/Views/WardrobeListView.swift`
- `ios-client/OutfitSuggestor/Navigation/RouteCoordinator.swift` (or equivalent pick context)
- Models/copy helpers only if required for session/banner
- One test file max (prefer `WeekPlannerViewModelTests.swift`)

## API

- [x] **No** — UI-only; reuse existing plan update/dirty/save

## About / Guide

- [x] **Yes (one short line)** — mention that Change/Add on a week day opens Wardrobe to pick an item for that slot, then returns to that day.
  - Web: `UserGuide.tsx` / `About.tsx` (one line only)
  - iOS: `UserGuideView.swift` / `AboutView.swift` (one line only)

## Parity doc

- Skip `IOS_WEB_FEATURE_PARITY.md` unless capability wording needs a one-liner.

## iPhone / iPad

Same UX; layout/spacing via `horizontalSizeClass` only.

## Tests (required)

| ID | Case | Web | iOS |
|----|------|-----|-----|
| T1 | Change → pick item → that day’s slot updated + back on correct `dayOfWeek`; session cleared | ☑ | ☑ |
| T2 | Cancel/Back without pick → plan unchanged; session cleared; normal Wardrobe | ☑ | ☑ |

**Cost Twin UI:** one test file per platform; targeted runs only (no full suites unless user asks).

## Done when

- [x] Both agents implemented pick session + apply + navigate back
- [x] T1 + T2 pass on each platform (targeted)
- [x] About/Guide one-liner present on both
- [x] Orchestrator parity note + cost `end`
