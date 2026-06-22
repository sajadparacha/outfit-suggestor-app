# Feature Spec: Wardrobe Insights — Sweater, Jacket, Tie

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-insights-extended-categories`  
**Status:** done

---

## User story

As a user running Wardrobe Insights, I want sweater, jacket/outerwear, and tie (for formal occasions) analyzed as first-class categories so coverage dashboards, detailed analysis, and shopping lists reflect gaps in those pieces — without changing the main 5-card outfit result.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Coverage dashboard | `WardrobeInsightsPage.tsx` | `WardrobeInsightsView.swift` | 7–8 clothing rows + Colors + Styles |
| Detailed analysis accordion | `WardrobeInsightsComponents` | `CategoryDetailAccordionView` | Shopping chips for new categories |
| Shopping list | insights helpers | `WardrobeInsightShoppingList` | Google Shopping queries |
| Top items to add | same | same | Includes new categories |

### Flow

1. User runs Wardrobe Insights with occasion/season/style.
2. Backend returns gap analysis for shirt, trouser, blazer, sweater, jacket, shoes, belt; **tie** only when occasion is business, formal, or office.
3. Clients normalize response → coverage grid shows new categories; tie row appears only when returned.
4. Shopping searches use phrases like `men sweater`, `men jacket`, `men tie`.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Casual analysis | 7 clothing categories (no tie) | Standard coverage labels |
| Business/formal/office | 8 clothing categories (includes tie) | Tie row in dashboard |
| Jacket vs blazer | Separate gap scores | Jacket items do not count toward blazer |

---

## Visual / UX

- Insert **Sweater** and **Jacket** rows after **Blazer** in category order.
- **Tie** row only when present in API `analysis_by_category`.
- Google Shopping: `Show me men {category} …` with correct category phrase.
- Theme unchanged (dark slate, gradient accents).

### iPhone / iPad (iOS)

- Same UX on iPhone and iPad; layout-only via `horizontalSizeClass`.

---

## API and contract

### Backend changes needed?

- [x] Yes — `analyze_wardrobe_gaps`, STYLE_LIBRARY, target colors/styles, AI premium parse

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wardrobe/analyze-gaps` | Extended category keys in response |

### Client contract files to update

**Web**

- [x] `frontend/src/utils/insightsHelpers.ts` — CATEGORY_ORDER, STYLE_LIBRARY, categoryForSearch, display labels
- [x] `frontend/src/utils/normalizeWardrobeInsight.ts` — display names, ordered categories

**iOS**

- [x] `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift` — categoryOrder, STYLE_LIBRARY, ordered health rows

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| CATEGORY_ORDER | shirt, trouser, blazer, sweater, jacket, shoes, belt | insightsHelpers.ts | NormalizeWardrobeInsight.swift |
| Tie | conditional on response | — | — |
| FORMAL_OCCASIONS | business, formal, office | insightsHelpers.ts | (backend drives tie) |

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide: Wardrobe Insights analyzes sweater, jacket; tie for business/formal/office.
  - About: Extended gap categories in insights (not main outfit 5-card).

---

## Tests (required)

### Backend (orchestrator)

- [ ] `backend/tests/test_wardrobe_service.py` — gap categories
  - Casual: sweater + jacket in analysis; no tie
  - Business/formal/office: tie included
  - Jacket item not merged into blazer scoring

### Web (web agent)

- [ ] `normalizeWardrobeInsight.test.ts` — 7–8 clothing rows + Colors + Styles
- [ ] `insightsHelpers` tests — categoryForSearch for sweater, jacket, tie
- [ ] `WardrobeInsightsComponents.test.tsx` — dashboard shows new categories

### iOS (iOS agent)

- [ ] `NormalizeWardrobeInsightTests.swift` — extended categories
- [ ] `WardrobeInsightShoppingListTests.swift` — shopping queries
- [ ] `WardrobeInsightsViewTests.swift` — UI coverage

---

## Parity checklist

- [ ] Same category order and conditional tie on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Shopping search phrases aligned
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated
- [ ] Full test suites pass after user confirms

---

## Out of scope

- Main outfit 5-card result (shirt, trouser, blazer, shoes, belt)
- Wardrobe filter chips (already support sweater/jacket/tie)
