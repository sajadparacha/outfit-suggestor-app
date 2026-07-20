# Cost Twin UI: Week plan history / load previous

**Branch:** `feature/enhancements`  
**Slug:** `week-plan-history`  
**Status:** done

## Goal

- Snapshot weekly plans so Clear / restore does not lose prior weeks.
- List recent history → Load makes that snapshot the current plan (Today + reminders).
- Auth required; empty state when no history.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/week-plan/history` | List recent snapshots `{ id, label, created_at, enabled_day_count }` |
| POST | `/api/week-plan/history/{id}/restore` | Snapshot current (if any), then restore snapshot as current plan |
| DELETE | `/api/week-plan` | Snapshot current first, then clear (existing) |

Also snapshot current before generate when the plan already has outfits (best-effort).

## Files

Backend: `week_plan` model/service/controller/routes + tests  
Web: WeekPlanner + models + ApiService + MSW; one test file  
iOS: WeekPlannerView/ViewModel + models + APIService; one test file  
About/Guide: one line  

## Tests

- Backend: clear creates history; list returns entries; restore makes current; auth 401
- Web/iOS: history list + load updates plan UI; empty state
