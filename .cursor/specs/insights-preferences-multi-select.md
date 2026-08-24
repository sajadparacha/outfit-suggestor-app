# Feature Spec: Insights preferences multi-select

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-preferences-multi-select`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

On Insights **Analysis Preferences only** (not Suggest filters), every chip group allows multiple selections. Lifestyle mix stays as today (max 3 + Primary). Dress code, climate, primary style, and accent become multi-select. Backend `analyze-gaps` accepts lists (string still works).

## User story

As a user running Wardrobe Insights, I want to pick more than one dress code, climate, style, and accent so gap analysis covers how I actually dress.

## Insights form (web + iOS — identical)

Do **not** change Suggest / Wardrobe filters. Extra notes and Audit for a specific event stay text.

| Control | Rules | Default |
|---------|-------|---------|
| **Lifestyle mix** | Unchanged: max 3, at least 1, one **Primary** badge | Work (primary) + Everyday |
| **Dress code** | Multi chips. At least 1. Tap selected deselects only if another remains. | Smart casual |
| **Season** | Year-round always on (cannot turn off). Climate chips Hot / Temperate / Cold: multi, tap selected to deselect. | Year-round, no climate |
| **Primary style** | Multi chips, at least 1. One **Primary** badge. Same tap rules as lifestyle mix (no max). | Classic as primary |
| **Accent** | Multi. **None** clears all accents. Selecting any accent deselects None. | None |

Context bar (API display strings): show **all** selected values, e.g. `Smart casual + Casual · Year-round / Hot + Cold` and `Classic + Preppy with Vintage accent`.

### iPhone / iPad

Same UX. Layout/spacing only via `horizontalSizeClass`.

## File paths (agents — only these + their one test file)

**Web**

- `frontend/src/utils/insightsLifestyle.ts`
- `frontend/src/models/WardrobeModels.ts`
- `frontend/src/views/components/AnalysisPreferences.tsx` (`variant="insights"` only)
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- **One test file:** `frontend/src/views/components/InsightsFlow.integration.test.tsx`

**iOS**

- `ios-client/OutfitSuggestor/Utils/InsightsLifestyle.swift`
- `ios-client/OutfitSuggestor/Models/WardrobeModels.swift`
- `ios-client/OutfitSuggestor/Views/Insights/AnalysisPreferencesView.swift`
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift`
- **One test file:** `ios-client/OutfitSuggestorTests/InsightsLifestylePreferencesTests.swift`
- Do **not** change Suggest/Wardrobe filters

**Backend (orchestrator)**

- `backend/models/wardrobe_schemas.py`
- `backend/services/wardrobe_gap_context.py`
- `backend/controllers/wardrobe_controller.py`
- `backend/services/wardrobe_service.py` (ranking uses combined dress codes)
- **One pytest file:** `backend/tests/test_wardrobe_gap_context.py`

## API and contract

`POST /api/wardrobe/analyze-gaps`

Lifestyle fields become lists (clients send arrays). **String still accepted** (coerced to a one-item list):

```json
{
  "lifestyle_mix": ["work", "everyday"],
  "primary_lifestyle": "work",
  "dress_code": ["smart-casual", "casual"],
  "climate": ["hot", "cold"],
  "style_primary": ["classic", "preppy"],
  "style_accent": ["vintage"],
  "event_focus": null
}
```

- `style_primary[0]` is the Primary style (same as mix[0] for lifestyle).
- Canonical occasion: work + any dress code in `business-professional` / `formal` → `business`.
- Canonical season: only `hot` → `summer`; only `cold` → `winter`; else `all-season` (year-round core / mixed climates).
- Canonical style: primary style (`style_primary[0]`).
- Gap ranking: combined dress-code set (best rank across selected codes). Primary lifestyle and primary style still weight the core.
- Response `occasion` / `season` / `style` remain **display** strings listing all selected values.

**Web** `WardrobeGapAnalysisRequest`: `dress_code`, `climate`, `style_primary`, `style_accent` are `string[]` (accent/climate may be empty).

**iOS** same: encode arrays (empty climate/accent as `[]` or `null`).

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide: Insights preferences allow more than one dress code, climate, style, and accent (lifestyle mix still max 3 + Primary). Year-round stays on.
  - About: Insights preferences can include multiple dress codes, climates, styles, and accents.

## Tests (required)

### Backend (orchestrator)

- [x] `tests/test_wardrobe_gap_context.py`
  - String still works (backward compatible)
  - Lists join in display / prompt
  - Mixed climates → `all-season`; work + any formal/business code → `business`
  - Schema accepts string or list
  - Combined dress codes: best rank across the set

### Web (one file)

- [ ] `InsightsFlow.integration.test.tsx`
  - Dress code: default Smart casual; add Casual; cannot deselect last code
  - Season: Year-round stays on; Hot + Cold both selected
  - Primary style: Classic primary; add another; Primary badge moves on tap
  - Accent: None clears; selecting an accent deselects None
  - Analyze POST sends arrays for `dress_code`, `climate`, `style_primary`, `style_accent`

### iOS (one file)

- [ ] `InsightsLifestylePreferencesTests.swift`
  - Same chip rules as web (dress code, climate, style primary, accent)
  - Request encodes those fields as arrays
  - Keep existing mix max-3 tests

## Out of scope

- Suggest / Wardrobe preference dropdowns
- Extra notes / event-focus becoming chips
- Full test suites (Cost Twin UI — targeted tests only)
