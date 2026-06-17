# Feature Spec: Insights — restore Top items + on-demand full shopping table

**Branch:** `fix/gui-minor-issues`  
**Slug:** `wardrobe-insights-shopping-table-v2`  
**Status:** done

---

## User story

As a user viewing wardrobe insights, I want to keep the **Top items to add** cards AND open a **full shopping table** from the analysis summary when I need a take-along list — with **every** missing style and color, not just one per category.

---

## Changes from v1 shopping table

| Before (v1) | After (v2) |
|-------------|------------|
| Table always visible | Table **hidden** until user requests it from summary |
| Top items cards removed | **Restore** Top items to add section |
| One row per category (first style + first color) | **All** missing style × color combinations per category |

---

## Layout order (after analysis)

1. Analysis context bar / preferences
2. **Insight summary card** (score + top 3 priorities) — add CTA here
3. **Top items to add** (card grid — `TopMissingItemsSection` / `TopMissingItemsView`)
4. Wardrobe coverage dashboard
5. Category detail accordion
6. Quick tip
7. Admin debug (admin only)

**Shopping table** is NOT in the default scroll. Shown when user taps summary CTA.

---

## On-demand shopping table trigger

On **Insight summary card**, add secondary action:

- **Label:** `View shopping list` (web + iOS)
- **Accessibility:** `insights.viewShoppingList` / `data-testid="view-shopping-list"`
- **Behavior:** toggles visibility of shopping table section (or sheet on iOS — prefer inline expand below summary for parity)
- When shown, scroll/focus table if possible (web: `scrollIntoView` optional)
- Tapping again or **Hide shopping list** collapses it

Copy when table visible (unchanged intro):
> After analyzing your wardrobe, below is the list of items you need to buy.

---

## Full shopping table rows (all missing styles & colors)

Update `buildShoppingListRows` (web) / `BuildShoppingListRows` (iOS):

For each clothing category (`shirt`, `trouser`, `blazer`, `jacket`, `shoes`, `belt`, `sweater`) with gaps:

1. Pretty-print all `missingStyles` and `missingColors`
2. **If both non-empty:** one row per **cartesian product** (each style × each color)
3. **If only styles:** one row per style, color `—`
4. **If only colors:** one row per color, style `—`
5. **If Missing/Weak with empty arrays:** single row `—` / `—`
6. Skip `colors` and `styles` aggregate pseudo-categories

Display labels unchanged: Shirt, Pant, Jacket, Shoes, Belt, Sweater.

**Row key:** `${categoryKey}-${style}-${color}-${index}` for stable React/SwiftUI keys when duplicates possible.

Export CSV + WhatsApp use **all** expanded rows.

---

## API

- [x] No backend changes

---

## User-facing docs

- [x] **Yes** — Guide/About: Top items cards remain; full shopping list opens from summary **View shopping list**

---

## Tests (required)

### Web

- [ ] Update `buildShoppingListRows.test.ts` — cartesian product, style-only, color-only rows
- [ ] `ShoppingListTable.test.tsx` — still renders all rows
- [ ] `WardrobeInsightsComponents.test.tsx` — top-missing section present; table hidden by default; visible after CTA
- [ ] `InsightsFlow.integration.test.tsx` — adjust assertions
- [ ] Run full `npm test -- --watchAll=false`

### iOS

- [ ] Update `BuildShoppingListRowsTests.swift` — expanded rows
- [ ] `WardrobeInsightsViewTests.swift` — top items present, on-demand table
- [ ] Run `BuildShoppingListRowsTests` + `WardrobeInsightsViewTests`

---

## Parity checklist

- [ ] Top items to add restored both platforms
- [ ] View shopping list CTA on summary card both platforms
- [ ] Table hidden by default; shows on CTA
- [ ] All missing style × color rows
- [ ] Export + WhatsApp unchanged
- [ ] Guide + About updated
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated
