# Cost Twin UI: Week Planner UX hierarchy

**Branch:** `feature/week-planner-redesign`  
**Slug:** `week-planner-ux-hierarchy`  
**Status:** done

## Goal

Make the Week Outfit Planner primary journey obvious: select days/prefs → generate → review/edit day → save. One visually primary action at a time. De-emphasize templates and history. Preserve all APIs and data contracts.

## Hierarchy (both platforms)

1. **Page header** — title, week date range, short description, document state (Saved / Unsaved changes / Generating… / Last saved [time]), single primary CTA (`Generate outfits` before generated; `Save plan` when dirty after generate)
2. **Compact planning controls** — Season, Reminder (+ timezone), advanced prefs behind disclosure if needed; no duplicate Generate CTA
3. **Week overview** — cleaner day cards: day name, calendar date, occasion, outfit preview, exceptional status only (Needs outfit / Not planned / Generating / Edited). No “Ready” spam. Clear planned/unplanned control (not checkbox row). Selected = border + background + marker (not color alone)
4. **Selected-day editor** — desktop: outfit grid left, explanation + day actions right; stack on small screens. Four slots (top, bottom, shoes, optional accessory) aligned. Empty accessory = “Add accessory” placeholder. Concise summary + expandable “Why this outfit works”. “Regenerate this day” wording; warn if overwrite. Occasion / Style / Use wardrobe near day content
5. **Collapsed secondary** — “Planning templates” (prefs only, no outfits) and “Plan history” (past weekly outfits); recent subset + View all; human-readable dates; overflow menus for row actions

## Feedback

Toast/compact notification for save success/fail, loaded plan (replace permanent banner), unsaved awareness. Confirm before generate/load/clear/leave only when data would be lost.

## Files (agents — read only these + their tests)

**Web:** `frontend/src/views/WeekPlanner.tsx`, `frontend/src/views/components/weekPlan/**`, `frontend/src/controllers/useWeekPlanController.ts`, `frontend/src/models/WeekPlanModels.ts` (helpers only), `frontend/src/views/WeekPlanner.integration.test.tsx`, optional About/UserGuide one-liners + `GuideAndFooter.integration.test.tsx` if copy changes

**iOS:** `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift`, `ios-client/OutfitSuggestor/ViewModels/WeekPlannerViewModel.swift`, `ios-client/OutfitSuggestor/Models/WeekPlanModels.swift` (helpers only), `ios-client/OutfitSuggestorTests/WeekPlannerViewModelTests.swift`, UserGuide (+ About if present)

**Backend:** none

## About / Guide

Yes — short updates: primary CTA states, Planning templates vs Plan history naming, exceptional day status (no Ready spam).

## Tests (3–5)

- Primary CTA switches Generate outfits ↔ Save plan based on generated/dirty state
- Day select updates detail; planned toggle does not fight card selection
- Exceptional status shown; Ready not shown on all-ready planned days
- Templates/history collapsed by default; human-readable dates
- Toast/status for loaded or saved (not permanent banner)

**Cost mode:** one test file per platform; targeted run only. No full suites unless asked.

## Out of scope

New APIs; item-level wardrobe replace endpoints (Change → wardrobe/regenerate stubs OK); design-system rewrite; full History route migration.
