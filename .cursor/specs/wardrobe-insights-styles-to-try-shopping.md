# Feature Spec: Top Items — Styles To Try + Color Shopping

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-styles-to-try-shopping`  
**Status:** in-progress

---

## User story

As a user viewing **Top items to add**, I want the style chips labeled **Styles To Try** (not "Works with"), and when I tap a best color I want Google Shopping to search for that **category + color + those styles**.

---

## Screens and flows

| Screen / area | Web | iOS |
|---------------|-----|-----|
| Top items card | `MissingItemCard.tsx` | `MissingItemCardView.swift` |
| Color chip | `InsightColorChip.tsx` | `InsightsColorSwatchRow` |
| Shopping helper | `insightsHelpers.ts` | `InsightsShoppingSearch` |
| Normalizer (iOS parity) | `normalizeWardrobeInsight.ts` (already uses `recommendedStyles`) | `NormalizeWardrobeInsight.swift` — align `worksWith` to use `recommendedStyles` like web |

### Label change

- Replace section label **Works with** → **Styles To Try** on Top items cards only
- Web: use copy constant or inline "Styles To Try"
- iOS: update `InsightsCopy.worksWithLabel` → `"Styles To Try"` OR use/rename to `stylesToTryLabel` with value `"Styles To Try"` for missing item cards
- Update `data-testid` on web from `works-with` to `styles-to-try` if tests reference it

### Color chip shopping query

When user taps a **Best colors** chip on a Top items card, open Google Shopping with:

- **Category:** item category mapped via existing helper (`shirt` → `shirts`, `trouser` → `trousers`, etc.)
- **Color:** tapped color
- **Styles:** all chips from **Styles To Try** (`item.worksWith` / `recommendedStyles`); fallback to analysis style context if empty

Reuse existing query pattern:
`Show me men {category} in {stylePhrase} style and {color} color`

**Web:** extend `openColorShoppingSearch(category, color, styles: string[], fallbackStyle?: string)`

**iOS:** extend `InsightsShoppingSearch.openColor` to accept `styles: [String]` and pass through to `open`/`buildSearchURL`

Pass `item.worksWith` from `MissingItemCard` into color chips.

### iOS data parity

Fix `NormalizeWardrobeInsight.buildMissingItems` so `worksWith` uses `item.recommendedStyles` (pretty-printed, max 4) like web — **not** `worksWithCategories()`.

---

## User-facing docs

- [x] **No** — label + shopping query refinement only

---

## Tests (required)

### Web
- Label shows "Styles To Try" (not "Works with")
- Color chip click URL includes category, color, AND style from worksWith (e.g. linen, short-sleeve)
- Update `WardrobeInsightsComponents.test.tsx`

### iOS
- `InsightsCopy` / view tests: label is "Styles To Try"
- Color shopping URL includes styles from worksWith
- Normalizer: worksWith equals recommendedStyles (not other category names)
- Update `WardrobeInsightsViewTests.swift`, `NormalizeWardrobeInsightTests.swift`

---

## Parity checklist

- [ ] Same label "Styles To Try" on both platforms
- [ ] Color tap includes category + color + styles on both platforms
- [ ] iOS worksWith data matches web (recommendedStyles)

---

## Out of scope

- Renaming model field `worksWith` in TypeScript/Swift (UI label only)
- Category accordion sections (keep "Owned styles" / "Missing styles" labels there)
