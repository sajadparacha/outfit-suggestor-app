# Feature Spec: Week Plan Named Configurations (Presets)

**Branch:** `feature/week-plan-presets`  
**Slug:** `week-plan-presets`  
**Status:** done  
**Mode:** Cost Twin UI (short spec)

---

## Goal

Users save/load/rename/update/delete up to **N** week **configurations** (config only, not outfits), then Generate week. Admins can set a per-user limit override. **N is always resolved on the server.** No billing/checkout.

---

## Limit resolution (contract)

```
effective_limit(user) =
  1. user.week_plan_preset_limit_override if not null
  2. else tier default from user.subscription_plan if set and mapped
  3. else WEEK_PLAN_PRESET_LIMIT_DEFAULT (4)
```

- GET returns `{ items, count, limit, limit_source? }` where `limit_source` is `override` | `tier` | `default`.
- POST create → **409** when `count >= limit`.
- Lowering limit below count: **do not** auto-delete; block new creates until user deletes.
- Clients use API `limit` / `count` for “X of N” and Save disabled — **no hardcoded 4** in UI logic.

---

## Files (narrow scope)

| Layer | Paths |
|-------|--------|
| Backend | `models/week_plan.py`, `models/user.py`, `services/week_plan_service.py` (+ resolver), `routes/week_plan_routes.py`, admin route, `utils/ensure_week_plan_schema.py`, `main.py`, `tests/test_week_plan.py` (+ preset tests) |
| Web | WeekPlanner + presets UI, `useWeekPlanController`, models, `ApiService`, MSW; admin override on existing admin user UI if present; **one** planner test file; About/Guide one line |
| iOS | WeekPlanner View/VM/Models/APIService; **one** test file; Guide/About one line; admin override UI only if admin screens exist |

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/week-plan/presets` | `{ items, count, limit, limit_source? }` |
| POST | `/api/week-plan/presets` | Create — 400/409 |
| PUT | `/api/week-plan/presets/{id}` | Rename / replace config |
| DELETE | `/api/week-plan/presets/{id}` | Delete |
| POST | `/api/week-plan/presets/{id}/apply` | Apply to current plan; clear outfits |
| PATCH | `/api/admin/users/{id}/week-plan-preset-limit` | `{ limit: number \| null }` admin override (1–20 or null) |

Distinct from week-plan **history** snapshots.

### Configuration payload

- Reminder + shared season
- Per day: `enabled`, `occasion`, `style`, `use_wardrobe_only`
- Names: free text; max ~40; reject empty

### Stub (backend only)

- Nullable `subscription_plan` on user
- Tier map e.g. `{ "free": 2, "plus": 4, "pro": 8 }` — only default path active until plans exist
- No product UI for plans

---

## User behavior

List / Save as… / Update / Rename / Delete (confirm) / Load (apply config, clear outfits, confirm if wiping generated days). No auto-generate on load. Auth required. Empty + at-limit states.

## Admin behavior

- Admin-only PATCH override; null clears → tier/default. Bounds 1–20.
- Smallest existing admin user surface; iOS may be web-admin-only.
- Non-admin → 403.

---

## About / Guide

| Doc | Update? |
|-----|---------|
| About | **Yes** — one line that named week configs can be saved (up to server limit) |
| Guide | **Yes** — one line: save/load week configurations; generate after load |

---

## Tests (required)

### Backend

- [x] Resolver: default 4; override wins; tier map when plan set and no override
- [x] Create up to limit; 409 over; apply clears outfits; CRUD; 401/403
- [x] Admin override changes subsequent GET `limit`

### Web (one test file max)

- [x] List uses `count`/`limit` from API; load/save/delete; at-limit copy

### iOS (one test file max)

- [x] List uses `count`/`limit` from API; load/save/delete; at-limit copy

---

## Notes (future hooks)

- Billing, Stripe, paywalls, plan picker, automated tier jobs: **out of scope**.
- Future job/admin can set `subscription_plan` and/or override; both flow through the same resolver — no client rewrite needed when tiers go live.
- Out of scope: auto-delete on downgrade, merge with Previous plans history, auto-generate on load.

---

## Parity checklist

- [x] Same flows / copy intent on web + iOS
- [x] Clients use server `limit`/`count` only
- [x] About + Guide one-liners on both platforms
- [x] Targeted tests pass (skip full suites)
