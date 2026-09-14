# Feature Spec: Week Planner pin slot category match

**Branch:** `feature/admin-error-center`  
**Slug:** `week-planner-pin-slot-category`  
**Status:** done  
**Mode:** Cost Twin UI

---

## Goal

When picking a wardrobe item for a Week Planner day slot, only items whose category matches that slot may be selected. Mismatched items are disabled/grayed in the Wardrobe pick UI; apply/pin handlers no-op on mismatch; backend save/generate reject or drop mismatched pins.

Reuse existing slot aliases: `normalizeCompleteOutfitSlot` (web), `WardrobeCompletionSlot.normalized` / pick session (iOS), and backend equivalents (`polo`→`shirt`, `jeans`→`trouser`, `accessory`→`belt`, etc.).

---

## Files (narrow scope)

| Layer | Paths |
|-------|--------|
| Web | `frontend/src/views/components/Wardrobe.tsx`, `frontend/src/controllers/useWeekPlanController.ts`, `frontend/src/utils/wardrobeCategory.ts` (+ one test file) |
| iOS | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift`, `ios-client/OutfitSuggestor/ViewModels/WeekPlannerViewModel.swift` (+ one test file; may touch `Utils/` / models helpers if needed for match) |
| Backend | `backend/services/week_plan_service.py` (+ tests in `backend/tests/test_week_plan.py`) |

---

## Behavior

1. **Wardrobe pick mode:** Items that do not match the active pick slot are visually disabled/grayed and not selectable.
2. **Match rule:** Normalize item category and slot key with the same aliases as complete-outfit / week pick (`polo`/`t_shirt`→`shirt`, `jeans`/`shorts`→`trouser`, `accessory`→`belt`, shoes/blazer/outerwear/sweater/tie as today).
3. **Apply/pin handlers:** Refuse to pin/apply when item does not match the slot (web `applyWardrobeItemToDaySlot`; iOS `applyWardrobeItem`).
4. **Backend:** On plan save, reject mismatched pins (400). On generate, prune category-mismatched pins (same spirit as ownership prune). Normalize `accessory` pin keys to `belt`.

---

## About / Guide

- [x] **No** — no user-facing copy/flow docs change (enforcement only)

---

## iPhone / iPad

Same UX; layout-only differences allowed.

---

## Tests (required)

### Backend (orchestrator)

- [x] `backend/tests/test_week_plan.py`
  - PUT with pin `shoes` → jeans item → 400
  - PUT with pin `shirt` → polo item → 200 and pin stored
  - Generate prunes mismatched pin (or save rejects before generate)

### Web (one test file)

- [x] `frontend/src/utils/wardrobeCategory.test.ts` (extend) **or** colocated controller/Wardrobe unit test — **one file only**
  - Helper: item matches slot (aliases)
  - Apply/pin or pick eligibility rejects mismatch; allows polo→shirt, jeans→trouser

### iOS (one test file)

- [x] Extend `WeekPlannerViewModelTests` **or** one focused unit file — **one class only**
  - `applyWardrobeItem` returns false for shoes slot + shirt item
  - Returns true / pins for polo→shirt (and jeans→trouser if covered)

### Commands

| Layer | Command |
|-------|---------|
| Backend | `cd backend && . venv/bin/activate && pytest tests/test_week_plan.py -q -k pin` (or full file if narrow) |
| Web | `cd frontend && npm test -- --watchAll=false <one-test-file>` |
| iOS | `xcodebuild test … -only-testing:OutfitSuggestorTests/<OneClass>` |

---

## Parity checklist

- [x] Same match aliases web + iOS + backend
- [x] Disabled/grayed non-matching items in pick UI both platforms
- [x] Handlers refuse mismatch
- [x] Backend enforces on save; generate does not honor bad pins
