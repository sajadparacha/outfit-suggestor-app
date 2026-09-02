# Feature Spec: Week Planner per-day pinned slots

**Branch:** `feature/week-plan-pinned-slots`  
**Slug:** `week-plan-pinned-slots`  
**Status:** done

---

## User story

As a user, I want to pin wardrobe items to specific week-day slots so that generating or regenerating outfits keeps my picks and only fills empty slots.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Day editor slots | `OutfitPreview.tsx`, `OutfitItem.tsx` | `WeekPlannerView.swift` | Empty Add cards before generate; Pinned badge + Unpin |
| Plan state | `useWeekPlanController.ts` | `WeekPlannerViewModel.swift` | Pin on wardrobe pick; persist via upsert |

### Flow

1. User enables a day and picks wardrobe items into slots (pins) — works before first generate.
2. User taps Generate / Regenerate — backend keeps pins, AI fills remaining slots.
3. User can Unpin a slot; save persists `pinned_items` on the day.
4. Cross-day: items pinned or used on other days are avoided when alternatives exist.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Ungenerated day with pins | Show 4 editor slots as Add cards; pinned slots show item + badge | "Pinned" badge; "Unpin" action |
| Generated day | Outfit cards as today; pinned slots show badge | Same |
| Dropped invalid pins | Banner on generate | Existing plan `message` banner |

---

## API and contract

### Backend changes

- `weekly_plan_days.pinned_items_json` TEXT default `{}` — slot → wardrobe item id
- `WeekPlanDayInput.pinned_items: dict[str, int]`
- `WeekPlanDayResponse.pinned_items: dict[str, int]`
- Generate: pass day pins as `selected_wardrobe_item_ids`; seed used-set with all days' pins before full-week loop
- `collect_used_item_ids`: outfit IDs ∪ other days' pinned IDs
- Drop pins for items user no longer owns at generate; surface via `message`

### About / Guide

- One line on both platforms: picking a wardrobe item for a week day pins it; generating fills only the remaining slots.

---

## Tests (required)

### Backend — `backend/tests/test_week_plan_no_repeat.py`

- [x] `collect_used_item_ids` includes pinned IDs from days without outfits
- [x] Full-week generate seeds used-set with later days' pins
- [x] Invalid pin dropped at generate with message
- [x] Same item pinned on two days is not scrubbed

### Web — one test file (agent picks colocated test for touched components/controller)

- [x] Ungenerated enabled day renders 4 Add cards
- [x] Pinned slot shows "Pinned" badge and Unpin
- [x] `handleChooseFromWardrobe` passes invoked slot (not `slots[0]`)

### iOS — one test file (`WeekPlannerViewModel` or view tests)

- [x] Pin/unpin updates `pinned_items` on day
- [x] Same copy as web for badge and Unpin
- [x] iPhone/iPad identical UX

---

## Out of scope (v1)

- Presets carrying pins
- Day-selector pin indicators
- Pinning AI-generated results
