# Feature Spec: Gap shopping coverage + owned/missing exclusivity

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-gap-shopping-exclusivity`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

Fix two Insights bugs together:

1. A category with **Medium** (or Weak/Missing) coverage and remaining missing colors and/or missing styles must appear in **Shopping list** and **Top items to add** (both are driven by `priorityShoppingList`). Example: Shirts MEDIUM with missing styles/colors must not be omitted while blazer/sweater/belt are listed.
2. A color (or style) must never appear under both **Owned** and **Missing** in the same category. Example: Blazers must not list Charcoal in both. Case-insensitive; `grey`/`gray` are the same. Do **not** collapse distinct colors via fashion aliases (navy ≠ light blue).

## User story

As a user reading wardrobe analysis, I want every category that still has a real gap to show up as something to buy, and I never want the same color or style listed as both owned and missing.

## File paths

**Backend (orchestrator)**

- `backend/services/wardrobe_service.py`
- `backend/services/ai_service.py`
- **Primary tests:** `backend/tests/test_wardrobe_gap_inventory.py`

**Web (web agent — only these + one test file)**

- `frontend/src/utils/normalizeWardrobeInsight.ts`
- **One test file:** `frontend/src/utils/normalizeWardrobeInsight.test.ts`

**iOS (iOS agent — only these + one test file)**

- `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift`
- **One test file:** `ios-client/OutfitSuggestorTests/NormalizeWardrobeInsightTests.swift`

Read only listed files; no full-repo search.

---

## API and contract

No schema change. After analysis (free + premium):

1. For each category, drop missing colors whose display-key matches an owned color (trim, lower case, `grey`→`gray`). Same for styles (trim, lower case).
2. `priorityShoppingList` must include every clothing category that still has missing colors **or** actionable missing styles (Essential/Useful). Do not drop a row only because `recommendedStyles` is empty if missing colors remain.
3. Premium: if the model omits such a category, merge it in from inventory (same item shape as `_generate_priority_shopping_list`).

Clients apply the same exclusivity and list-merge as defense in depth.

---

## UI

No new controls. Accordion, Shopping list, and Top items to add just render the corrected payload.

**About / Guide:** no — bugfix, not a new flow.

**iPhone / iPad:** same UX.

---

## Tests (required)

### Backend — `test_wardrobe_gap_inventory.py`

- Blazer `owned_colors` includes `Charcoal`; `missing_colors` includes `Charcoal` and `Navy` → missing is only Navy (case-insensitive).
- Owned style is not also missing.
- Premium shopping list omits `shirt` while shirt analysis has missing colors/styles → result `priorityShoppingList` contains `shirt`.
- Shopping row with missing colors but no styles is kept (not dropped by inventory constrain).

### Web — `normalizeWardrobeInsight.test.ts`

- Category health: Charcoal owned + Charcoal/Navy missing → missing only Navy; details counts match.
- `priorityShoppingList` without shirt, shirt category Medium with missing styles → `missingItems` includes shirt (Shopping list / Top items).

### iOS — `NormalizeWardrobeInsightTests.swift`

- Same two assertions as web.

---

## Out of scope

- Accordion chip shopping / next-step removal (already shipped)
- Lifestyle preference fields
- `IOS_WEB_FEATURE_PARITY.md` (no new capability)

---

## Parity checklist

- [x] Owned color never listed as missing (web + iOS + backend)
- [x] Medium-coverage category with gaps appears in shopping list and top items
- [x] About/Guide unchanged
- [x] Tests added and run (targeted Cost Twin UI files only)
