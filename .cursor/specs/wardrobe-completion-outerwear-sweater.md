# Wardrobe completion: jacket, coat, sweater

**Branch:** `feature/wardrobe-jacket-blazer-season-fix`

## Goal

Allow jacket, coat, and sweater in wardrobe outfit completion (multi-select → Complete outfit with AI).

## Slots

| Wardrobe category | Completion slot | Also wear label |
|---|---|---|
| jacket / coat | outerwear | Outerwear |
| sweater | sweater | Layer |
| shirt, trouser, blazer, shoes, belt | unchanged | — |

- Max **5** selected items total (cap unchanged)
- Upper-body exclusivity: only one of **blazer**, **outerwear**, **sweater**
- One item per slot otherwise

## Backend (orchestrator)

- `_validate_selected_wardrobe_items` — allow `outerwear` + `sweater`; enforce upper-body exclusivity
- `_pin_selected_items_to_suggestion` — pin `outerwear_id`, `sweater_id`
- `_group_items_by_outfit_slot` — include outerwear/sweater groups for AI
- `suggest_outfit_from_wardrobe_only` — missing-slot prompt respects upper-body exclusivity
- Tests: `backend/tests/test_outfit_endpoints.py` (targeted)

## Web (agent)

Files only: `wardrobeCategory.ts`, `Wardrobe.tsx`, `UserGuide.tsx`, `About.tsx`, one test file.

## iOS (agent)

Files only: `WardrobeModels.swift`, `WardrobeListView.swift`, `WardrobeCardUx.swift`, `UserGuideView.swift`, `AboutView.swift`, `WardrobeCategoryFilterTests.swift`.

iPhone/iPad UX identical.

## About + Guide

Update both platforms — user-visible flow changed.

## Tests (required)

### Backend
- [x] Jacket pins `outerwear_id`
- [x] Sweater pins `sweater_id`
- [x] Rejects blazer + jacket together
- [x] Tie still rejected

### Web
- [x] Slot mapping jacket→outerwear, sweater→sweater
- [x] Upper-body exclusivity in toggle
- [x] Max 5 unchanged

### iOS
- [x] Same slot mapping + exclusivity in `WardrobeMultiSelectState`

## Parity

Brief `IOS_WEB_FEATURE_PARITY.md` update.
