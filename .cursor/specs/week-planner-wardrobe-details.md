# Cost Twin UI: Week Planner wardrobe toggle + outfit details

**Branch:** `feature/enhancements`  
**Slug:** `week-planner-wardrobe-details`  
**Status:** done

## Goal

1. Per-day **Use wardrobe** toggle (default on); persist; generate honors it.
2. Collapsible day/Today outfit UI like main Suggest (`OutfitPreview` patterns): thumbnails, source badges, full slots, Why this works.

## Files

| Layer | Paths |
|-------|--------|
| Backend | `models/week_plan.py`, `services/week_plan_service.py`, `controllers/week_plan_controller.py`, `tests/test_week_plan.py`, migrate script |
| Web | `WeekPlanner.tsx`, `useWeekPlanController`, `WeekPlanModels`, ApiService/MSW as needed, About/Guide one line; **one** test file |
| iOS | `WeekPlannerView`, `WeekPlannerViewModel`, `WeekPlanModels`, APIService; About/Guide one line; **one** test file |

Skip `IOS_WEB_FEATURE_PARITY.md` unless wording needs a one-line tweak.

## Tests

- Backend: PUT persists `use_wardrobe_only`; generate wardrobe-only with empty wardrobe → empty/message; generate with wardrobe fills outfit; flag off still generates (open suggest).
- Web: toggle Use wardrobe; expand day shows item details / summary collapse.
- iOS: same toggle + expand behavior (ViewModel or view helper tests).

## About / Guide

One short line each: per-day wardrobe + expandable day looks.
