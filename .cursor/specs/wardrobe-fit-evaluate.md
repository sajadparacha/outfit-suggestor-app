# Feature Spec: Wardrobe fit evaluate (“How this fits my wardrobe”)

**Branch:** `feature/wardrobe-fit-evaluate`  
**Slug:** `wardrobe-fit-evaluate`  
**Status:** done

---

## User story

As a logged-in user, I want to evaluate a clothing piece against what I already own and the wardrobe I’m building (e.g. business-casual), so I know how many of my items it pairs with and whether something else is the real gap (e.g. shoes).

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe list / item actions | `frontend/src/views/components/Wardrobe.tsx` (+ small subcomponents as needed) | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` (+ sheet/panel) | Primary entry |
| Fit result panel | `frontend/src/views/components/wardrobe/WardrobeFitPanel.tsx` (or equivalent) | new Views under Wardrobe | Sheet / modal / inline panel |
| Guide / About | `UserGuide.tsx`, `About.tsx` | `UserGuideView.swift`, `AboutView.swift` | Required |

### Flow

1. User is logged in. From a wardrobe item: tap **How this fits**.
2. Optional goal strip uses Insights-style defaults: dress code `smart-casual`, lifestyle mix `work` + `everyday`, style `classic`. Compact “Change goal” may adjust dress code / primary lifestyle / notes (v1 — no full Insights form).
3. Loading: `Checking how this works with your wardrobe…`
4. Success panel:
   - Headline from `summary_text`
   - **Works with what you own:** per-category rows with count + up to 3 thumbs
   - Verdict chip: `Strong fit` / `Weak fit` / `Already covered`
   - **Missing for your goal:** category + reason; Shop similar / open Insights when useful
5. Secondary: **Get outfit with this item** (existing suggest-from-wardrobe-item) where already available; **Close**
6. Guest: hide CTA or auth gate (same as other wardrobe AI actions)

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Spinner | `Checking how this works with your wardrobe…` |
| Empty wardrobe | Gap for goal; pairs_with empty/zero | `Add items to see what this pairs with.` |
| Error | Inline + Retry | `Couldn’t evaluate this piece. Try again.` |
| Success | Panel | Use `summary_text` + structured fields |
| Auth required | Login gate | Match existing wardrobe AI auth |

---

## Visual / UX

- Candidate thumb + summary first; then pair rows; then missing-for-goal card
- Reuse Wardrobe / Insights card language (dark slate, brand blue accents)
- iPhone / iPad: **same UX**; layout-only width via `horizontalSizeClass` / `adaptiveContent`

---

## API and contract

### Backend changes needed?

- [x] Yes

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wardrobe/evaluate-fit` | Evaluate candidate vs owned wardrobe + goal |

**Auth:** required

**Request (JSON):**

```json
{
  "wardrobe_item_id": 42,
  "category": null,
  "color": null,
  "description": null,
  "dress_code": "smart-casual",
  "lifestyle_mix": ["work", "everyday"],
  "primary_lifestyle": "work",
  "style_primary": "classic",
  "text_input": ""
}
```

Rules:
- Prefer `wardrobe_item_id` for v1 (owned item). Optional attribute-only candidate (`category`+`color`+`description`) when no id.
- Exclude candidate id from pair counts.
- Goal fields mirror Insights lifestyle; server builds `goal.label`.

**Response:** see schemas `WardrobeFitEvaluateResponse` in `backend/models/wardrobe_schemas.py`.

`verdict`: `strong_fit` | `weak_fit` | `redundant`

### Implementation rules (backend)

1. Deterministic pairing (counts from code — never LLM).
2. Gap verdict from free gap / inventory rules for goal.
3. `summary_text` from template using only factual counts/labels.

### Client contract files

**Web**
- [ ] Models + `ApiService.evaluateWardrobeFit`
- [ ] Wardrobe UI + fit panel
- [ ] MSW handler
- [ ] Guide + About

**iOS**
- [ ] Codable models + `APIService` method
- [ ] ViewModel + result sheet
- [ ] Guide + About

### Shared copy

| Key | Copy |
|-----|------|
| Action | `How this fits` |
| Loading | `Checking how this works with your wardrobe…` |
| Section pairs | `Works with what you own` |
| Section gap | `Missing for your goal` |
| Verdict strong_fit | `Strong fit` |
| Verdict weak_fit | `Weak fit` |
| Verdict redundant | `Already covered` |
| Empty pairs | `Add items to see what this pairs with.` |
| Error | `Couldn’t evaluate this piece. Try again.` |

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide: Wardrobe — evaluate a piece for pair counts + what’s missing for your goal
  - About: short capability line

---

## Tests (required)

### Backend (orchestrator)

- [x] `backend/tests/test_wardrobe_evaluate_fit.py`
- Cases: 401; 404; happy path counts; exclude candidate; empty wardrobe; gap fills; summary count consistency

**Run:** `cd backend && pytest tests/test_wardrobe_evaluate_fit.py -q` — **8 passed**

### Web (web agent)

- [ ] Unit + integration for fit panel / Wardrobe action
- Cases: How this fits when authed; result counts; missing-for-goal; error; Guide/About if asserted

**Run:** `npm test -- --watchAll=false` on the new/updated test file(s) only  
Preferred: `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx` and/or unit next to helpers

### iOS (iOS agent)

- [ ] `OutfitSuggestorTests/WardrobeFitEvaluateTests.swift`
- Cases: parse response; verdict labels; ViewModel success/error

**Run:** `-only-testing:OutfitSuggestorTests/WardrobeFitEvaluateTests`

### End of Twin UI

1. Targeted Test Report  
2. New terminal `./run_all_tests` (no log ingest)  
3. `estimate-workflow-cost.py end`

---

## Parity checklist

- [x] Same behavior web + iOS
- [x] About & Guide both platforms
- [x] Same copy / errors / loading
- [x] API clients match
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] Targeted tests green; `./run_all_tests` launched

---

## Out of scope

- Full e-commerce checkout
- Week Planner integration
- Multi-candidate batch evaluate
- Android
- Changing Insights shopping-list algorithm (beyond optional later reuse of multiplier)
