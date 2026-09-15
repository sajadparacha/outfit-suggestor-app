# Feature Spec: Week Planner Preset Pins

**Branch:** `feature/admin-error-center`  
**Slug:** `week-plan-preset-pins`  
**Status:** done  
**Mode:** Cost Twin UI (short)

---

## Goal

Named Planning templates (presets) persist per-day **pinned wardrobe items** with existing prefs so plans like “weekly shoes / shirts / mix” reload fully. Extend the existing preset system — no second save path, no plan-type enum.

---

## Files (narrow)

| Layer | Paths |
|-------|--------|
| Backend | `models/week_plan.py` (`WeekPlanPresetConfigDay`), `services/week_plan_service.py` (validate create/update; soft-drop on apply), `tests/test_week_plan.py` |
| Web | `models/WeekPlanModels.ts` (`planToPresetConfig` + types), `controllers/useWeekPlanController.ts` if needed; **one** test file: `WeekPlanModels.test.ts`; Guide line in `UserGuide.tsx`; UI only if Load/Save copy needs it |
| iOS | `Models/WeekPlanModels.swift`, `ViewModels/WeekPlannerViewModel.swift` (`presetConfigFromPlan`); **one** test file; Guide line in `UserGuideView.swift`; UI only if copy needs it |

---

## Behavior

### Save as… / Update

Store in preset `config`:

- Existing: `reminder_time`, `shared_season`, per-day `enabled`, `occasion`, `style`, `use_wardrobe_only`
- **New:** per-day `pinned_items` (`slot → wardrobe item id`, any mix of slots)

Backend **hard-validates** pins on create/update (owned + category/slot match); reject invalid.

### Load (apply)

- Restore prefs + pins; clear generated outfits (same as today); no auto-generate
- Hydrate pin thumbnails from wardrobe IDs (existing pin UI)
- If a pinned item was deleted (or mismatch): **drop that pin quietly**

### Generate

Unchanged: fills unpinned slots; keeps pins.

### Naming

Users name templates freely (e.g. “Weekly shoe plan”). No new enum.

---

## API / contract

Same preset endpoints. `WeekPlanPresetConfigDay` gains:

```json
"pinned_items": { "shoes": 12, "shirt": 34 }
```

Omit or `{}` = no pins. Legacy presets without the field load as empty pins.

---

## About / Guide

| Doc | Update? |
|-----|---------|
| About | **No** |
| Guide | **Yes** — templates include **pins** (prefs + pins), not full outfits |

---

## Tests (required)

### Backend (orchestrator)

- [x] Extend `backend/tests/test_week_plan.py`
- [x] Cases: create/update persist `pinned_items`; invalid pin → 400; apply restores pins + clears outfits; deleted wardrobe item → pin dropped on apply; legacy config without pins still applies

### Web (one file)

- [x] `frontend/src/models/WeekPlanModels.test.ts`
- [x] Cases: `planToPresetConfig` includes `pinned_items`; empty pins omitted or `{}` consistently with contract

### iOS (one file)

- [x] `ios-client/OutfitSuggestorTests/WeekPlanPresetPinsTests.swift` (or extend one existing WeekPlan* test file — **one file only**)
- [x] Cases: preset config from plan includes pins; decode/apply config with pins

### Commands

| Layer | Command |
|-------|---------|
| Backend | `cd backend && pytest tests/test_week_plan.py -q -k preset` |
| Web | `npm test -- --watchAll=false src/models/WeekPlanModels.test.ts` |
| iOS | `xcodebuild test … -only-testing:OutfitSuggestorTests/<Class>` |

---

## Parity checklist

- [x] Same save/load pin behavior web + iOS
- [x] Guide updated both platforms; About unchanged
- [x] Targeted tests pass
- [x] `./run_all_tests` launched in new terminal

---

## Out of scope

- New preset types / enums
- Persisting full outfits in templates
- About copy changes
- Billing / limit changes
