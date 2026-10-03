# Spec (short): Wardrobe fit — Phase 1 improvements

**Branch:** `feature/wardrobe-fit-improvements`
**Parent spec:** `.cursor/specs/wardrobe-fit-evaluate.md`
**Mode:** Cost Twin UI

## Goal

Make "How this fits" results meaningful and the entry point consistent across web + iOS.

## 1. Backend (done by orchestrator)

`backend/services/wardrobe_fit_service.py` — no API/contract change.
- Pair score has no baseline; item counts only if score ≥ 2. Clashing non-neutral colors, formality gaps ≥ 3, and category clashes (tie+tee/polo/shorts, blazer+shorts) exclude items.
- Verdict: `strong_fit` only if (fills gap AND ≥2 pairs) OR (≥5 pairs across ≥2 categories). `redundant` if not filling gap and owns ≥3 same-slot, or ≥2 same-slot with <5 pairs. Otherwise `weak_fit`.
- Soft gap (category already owned ≥2) no longer counts as "fills gap".

## 2. Goal prefill + remember last goal (both platforms)

- Initial fit goal = saved Insights preferences if present (dress code(s) → first selected dress code; lifestyle mix; primary lifestyle; style primary). Fallback to current defaults (`smart-casual`, `work`+`everyday`, `classic`).
- When user changes goal in the fit panel and runs evaluate, persist it as **last-used fit goal** (separate key: web localStorage `wardrobe_fit_last_goal`; iOS UserDefaults `wardrobeFitLastGoal`). Priority: last-used fit goal > Insights prefs > defaults.
- Web: `frontend/src/utils/insightsLifestyle.ts` (`loadInsightsLifestyle`). iOS: `ios-client/OutfitSuggestor/Utils/InsightsLifestyle.swift` + its persisted store.

## 3. Entry point (both platforms)

- Moderate **secondary** control labelled `How this fits` on each wardrobe item (detail/action area): secondary chip/button style.
- Web: visible as secondary button/chip, **not only** inside an overflow menu.
- iOS: secondary bordered/capsule button, **not** a full-width prominent hero button. Same on iPhone/iPad (layout-only differences via `horizontalSizeClass`).
- iOS: add `Open Insights` link in the fit result sheet's "Missing for your goal" card (parity with web), navigating to Insights.

## 4. Panel polish

- Pair row count shows units: `Pairs with 3` (singular `Pairs with 1`) instead of a bare number. Both platforms.
- Web: `Escape` closes the panel; focus trapped inside panel while open; focus returns to trigger on close.

## About / Guide

No new capability; update only if existing Guide text mentions the overflow-only entry. Otherwise skip.

## Tests (one file per platform)

- **Backend:** `backend/tests/test_wardrobe_evaluate_fit.py` — 16 passed (calibration cases: color clash, formality clash, category clash, not-every-item pairs, weak vs strong vs redundant, soft gap).
- **Web:** `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx`
  - [x] Visible `How this fits` secondary button (not overflow-only)
  - [x] Goal prefilled from saved Insights prefs; last-used goal wins after evaluate
  - [x] Row shows `Pairs with 3`
  - [x] Escape closes panel; Tab focus stays inside panel
  - Result: 17 passed (2 suites)
- **iOS:** `ios-client/OutfitSuggestorTests/WardrobeFitEvaluateTests.swift`
  - [x] Initial goal from Insights prefs; last-used goal persisted and preferred
  - [x] Pair count label `Pairs with 3` / `Pairs with 1`
  - [x] Open Insights action available when missing-for-goal shown (ViewModel/helper level)
  - Result: 16 passed (iPhone 17 sim)

Implementation note: both platforms persist the last-used goal only when the user applies a changed goal (not on the initial auto-evaluate), so Insights edits still flow through until the user overrides. iOS now also persists Insights prefs (`insightsLifestylePrefs`) — previously it did not.

Follow-up: Guide copy on both platforms still says goal "defaults to smart-casual, work + everyday, classic" (now only the final fallback).

## End

Targeted Test Report → new terminal `./run_all_tests` → `estimate-workflow-cost.py end`.
