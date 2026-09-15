# Feature Spec: Week Planner — New plan CTA

**Branch:** `feature/admin-error-center`  
**Slug:** `week-planner-new-plan-cta`  
**Status:** done  
**Mode:** Cost Twin UI (abbreviated)

---

## Goal

Promote a discoverable **New plan** action that uses the **existing Clear plan** path (same API / archive-to-Plan-history / empty week). Copy + placement only — no new backend or controller API.

## Behavior

1. Button / menu label: **New plan** (replace user-facing “Clear plan” as the start-fresh CTA).
2. Confirmation still explains: a copy is saved under Plan history; then empty week for days + generate.
3. Confirm destructive button can say **New plan** (or keep short confirm action aligned with New plan).
4. Empty Plan history hint / Guide lines that say “Clear plan” for this flow → **New plan**.
5. Internal method names may stay `clearPlan` / `onClearPlan`.

## Files (narrow)

| Platform | Touch |
|----------|--------|
| Web | `PlannerActionBar.tsx`; `WeekPlanner.tsx`; `UserGuide.tsx` |
| Web tests | `WeekPlanner.integration.test.tsx` |
| iOS | `WeekPlanModels.swift` (`WeekPlanCopy`); `UserGuideView.swift` |
| iOS tests | `WeekPlannerViewModelTests.swift` |

## About / Guide

- **About:** no
- **Guide:** yes — Clear plan → New plan

## Backend

- None

## Tests (required)

### Web — `WeekPlanner.integration.test.tsx`

- [x] Visible **New plan** CTA
- [x] Confirm / empty history copy updated

### iOS — `WeekPlannerViewModelTests`

- [x] `WeekPlanCopy` exposes **New plan**
- [x] Related copy assertions updated

## Parity checklist (orchestrator)

- [x] Web + iOS both show New plan, same archive behavior
- [x] Guide updated both platforms
- [x] About skipped
- [x] `IOS_WEB_FEATURE_PARITY.md` skipped (label rename only)
- [x] Targeted tests green; `./run_all_tests` launched in new terminal
