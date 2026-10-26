# Feature Spec: Admin-only AI cost on "How this fits" (Cost Twin UI)

**Branch:** `feature/api-response-size`
**Slug:** `wardrobe-fit-admin-cost`
**Status:** done

## Goal

Admins see what the "How this fits" AI pairing ranking cost for the shown result. Non-admins see nothing new.
Applies to both entry points that render the fit result: wardrobe **How this fits** and **Check before you buy**.

## API (done by orchestrator)

`POST /api/wardrobe/evaluate-fit` response gains optional `cost` (object or `null`):

```json
"cost": {
  "model": "gpt-4o-mini",      // string | null (null = no AI call, rules only)
  "input_tokens": 1000,
  "output_tokens": 200,
  "gpt4_cost": 0.00027,
  "total_cost": 0.00027,       // USD
  "cached": false              // true = served from cache, no charge
}
```

- Admin users: `cost` is always an object (zero cost when cached or rules fallback).
- Non-admin users: `cost` is `null`.
- Backend is the source of truth: render the row **only when `cost` is non-null**.

## UI (both platforms, identical copy)

In the fit result panel/sheet, add a small, muted admin row at the bottom of the result (below "Missing for your goal"):

- Label + amount: `AI cost: <formatted total_cost>`
  - Format like existing admin cost views: `< 0.01` → 4 decimals, `< 0.1` → 3 decimals, else 2 (e.g. `$0.0003`).
- Detail line (one of):
  - `cached == true` → `Cached — no charge`
  - `model == null` → `Rules only — no AI charge`
  - otherwise → `<model> · <input_tokens> in / <output_tokens> out tokens`
- Accessibility id / test id: `wardrobe-fit-admin-cost`
- Hidden entirely when `cost` is null/absent.
- iOS: same UX on iPhone and iPad.

About / Guide: **No** (admin-only diagnostic; no user-facing flow change).
`IOS_WEB_FEATURE_PARITY.md`: one short note on the Wardrobe fit evaluate row (orchestrator).

## Files (agents: read only these + their tests; no full-repo search)

**Web**
- `frontend/src/models/WardrobeModels.ts` — add optional `cost` to `WardrobeFitEvaluateResponse`
- `frontend/src/views/components/wardrobe/WardrobeFitPanel.tsx` — render row
- Test: `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx` (MSW override per test if needed)

**iOS**
- `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` — optional `cost` on `WardrobeFitEvaluateResponse` (decode absent/null as nil)
- `ios-client/OutfitSuggestor/Views/WardrobeFitResultSheet.swift` — render row
- Copy constants may go in `ios-client/OutfitSuggestor/Utils/WardrobeFitEvaluateCopy.swift`
- Reuse `formatInsightsCost` (`Views/Insights/InsightsSharedViews.swift`)
- Test class: `OutfitSuggestorTests/WardrobeFitEvaluateTests`

## Tests (required)

### Backend (orchestrator) — done
- [x] `backend/tests/test_wardrobe_fit_cost.py`: pricing, usage/cache, admin gets cost, non-admin `null`, rules fallback zero, attribute candidate

### Web
- [x] Response with `cost` (non-cached) → `wardrobe-fit-admin-cost` shows `AI cost: $0.0003` and `gpt-4o-mini · 1000 in / 200 out tokens`
- [x] `cost: null` → row absent
- [x] `cached: true` → `Cached — no charge`

### iOS
- [x] Decode response with `cost` object, with `cost: null`, and with key absent
- [x] Copy/formatter helper: non-cached detail, cached detail, rules-only detail, amount `$0.0003`

## Parity checklist
- [x] Same copy on web and iOS
- [x] Row hidden when `cost` null on both
- [x] Targeted web tests pass
- [x] Targeted iOS tests pass
- [x] Targeted backend pytest pass (51 passed)
- [x] `./run_all_tests` launched in new terminal
