# Feature Spec: Week Planner — hydrate pinned slots after Load template

**Branch:** `feature/admin-error-center`  
**Slug:** `week-planner-hydrate-pins-on-load`  
**Status:** done  
**Mode:** Cost Twin UI (abbreviated)

---

## Goal

After **Load template** (`applyPreset`), restore pin UI so pinned slots show wardrobe **label + thumbnail**, not “Pinned item” / “No photo”. Pins are already restored as IDs; outfits stay cleared except hydrated pin slots.

## Files (read/edit only these + listed tests)

| Platform | Primary | Optional |
|----------|---------|----------|
| Web | `frontend/src/controllers/useWeekPlanController.ts` | `OutfitPreview` only if render needs a tweak |
| Web tests | `frontend/src/controllers/useWeekPlanController.test.ts` | — |
| iOS | `ios-client/OutfitSuggestor/ViewModels/WeekPlannerViewModel.swift` | helpers colocated |
| iOS tests | `ios-client/OutfitSuggestorTests/WeekPlannerViewModelTests.swift` | — |

## Behavior

1. Extend existing **apply/load** path only — no new API. Use client wardrobe fetch already available (`getWardrobe` / `getWardrobeItem` or in-memory list if already loaded).
2. After successful Load (`applyPreset` → plan applied): for each day’s `pinned_items`, resolve wardrobe items by ID.
3. For each resolved pin, fill the same fields as interactive pin-from-wardrobe:
   - slot label text
   - slot `*_id`
   - `matching_wardrobe_items` entry (id, category, color, description, image_data)
   - keep `pinned_items` for that slot
4. Do **not** invent a full generated outfit / summary / unpinned slots.
5. If a pinned ID is missing from wardrobe: **drop that pin quietly** (same soft-drop idea as backend).
6. Generate / regenerate unchanged (keeps pins, fills unpinned slots).

## About / Guide

- **About:** no
- **Guide:** skip (no change)

## Backend

- None (client hydrate). Do not edit `backend/**`.

## Tests (required) — one file per platform

### Web — `useWeekPlanController.test.ts`

- [x] `applyPreset` with pinned_items + mocked wardrobe item → slot text, slot id, and matching_wardrobe_items image/label populated
- [x] missing wardrobe ID → pin dropped; no crash; no fake “Pinned item” shell for that slot
- [x] existing applyPreset “loads without generating” still passes

Command:
```bash
cd frontend && npm test -- --watchAll=false src/controllers/useWeekPlanController.test.ts
```

### iOS — `WeekPlannerViewModelTests`

- [x] `applyPreset` with pinned_items + mocked wardrobe → slot label, id, matching thumbnail fields populated
- [x] missing wardrobe ID → pin dropped quietly
- [x] generate path not required to change; do not break existing applyPreset tests

Command:
```bash
xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/WeekPlannerViewModelTests
```

## Parity checklist (orchestrator)

- [x] Web + iOS hydrate after Load the same way
- [x] Missing pins soft-dropped on both
- [x] About/Guide skipped
- [x] Targeted tests green; `./run_all_tests` launched in new terminal
- [x] `IOS_WEB_FEATURE_PARITY.md` skipped (bugfix; no new capability)
