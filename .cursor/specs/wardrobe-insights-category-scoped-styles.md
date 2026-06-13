# Feature Spec: Category-Scoped Missing Styles

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-category-scoped-styles`  
**Status:** in-progress

---

## Problem

Missing styles in **Detailed category analysis** show cross-category tags (e.g. **Clean Sneakers** under **Shirts**) because `_target_styles()` adds occasion modifiers globally without category filtering.

---

## Fix

### Backend (orchestrator)

In `wardrobe_service.py`:
1. Add `_filter_styles_for_category(category, styles)` — only keep tags in `STYLE_LIBRARY[category]`
2. Apply filter at end of `_target_styles()`
3. Filter `owned_styles` and `missing_styles` in `analyze_wardrobe_gaps()` per category
4. In `ai_service.py` premium parse loop, sanitize `owned_styles` / `missing_styles` per category (use WardrobeService helper or shared constant)

Add `backend/tests/test_wardrobe_service.py` cases:
- Casual shirt targets must NOT include `clean sneakers`
- Casual shoes targets MUST include `clean sneakers`
- Shirt missing styles only from shirt STYLE_LIBRARY

Run pytest before spawning UI agents.

### Web + iOS normalizers (defense in depth)

Mirror `STYLE_LIBRARY` allowlist in:
- `frontend/src/utils/normalizeWardrobeInsight.ts` (or `insightsHelpers.ts`)
- `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift`

Filter `ownedStyles`, `missingStyles` when building category health; filter `worksWith` / `recommendedStyles` on missing items.

---

## User-facing docs

- [x] **No**

---

## Tests

### Backend
- `test_wardrobe_service.py` — category style filtering

### Web
- `normalizeWardrobeInsight.test.ts` — shirt health excludes shoe-only styles

### iOS
- `NormalizeWardrobeInsightTests.swift` — same

---

## Parity

- Same allowlist and filtering on backend + both clients
