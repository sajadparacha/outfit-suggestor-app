# Feature Spec: Wardrobe Insights Shopping Table

**Branch:** `fix/gui-minor-issues`  
**Slug:** `wardrobe-insights-shopping-table`  
**Status:** done

---

## User story

As a user who just ran wardrobe insights, I want one clear shopping table (Category | Style | Color) with export and WhatsApp share — so I can take the list when I go shopping.

---

## Screens and flows

| Screen / area | Web | iOS |
|---------------|-----|-----|
| Shopping table | `frontend/src/views/components/insights/ShoppingListTable.tsx` | `ios-client/OutfitSuggestor/Views/Insights/ShoppingListTableView.swift` |
| Row builder | `frontend/src/utils/buildShoppingListRows.ts` | `ios-client/OutfitSuggestor/Utils/BuildShoppingListRows.swift` |
| Insights page | `WardrobeInsightsPage.tsx` | `WardrobeInsightsView.swift` |

### Flow

1. User completes wardrobe gap analysis.
2. Below summary card, show intro: **"After analyzing your wardrobe, below is the list of items you need to buy."**
3. Single table with columns **Category | Style | Color**.
4. Rows derived from `analysis_by_category` (via normalizer `categoryHealth` for clothing categories only — shirt, trouser, blazer, shoes, belt, sweater/jacket if present). One row per category with gaps.
5. **Export** — download CSV (`Category,Style,Color` header + rows).
6. **Send to WhatsApp** — open `https://wa.me/?text=` with bullet list built from same rows.
7. **Replace** `TopMissingItemsSection` / `TopMissingItemsView` on insights result screen (remove card grid as primary shopping answer).

### Row derivation (no new AI call)

For each clothing category in `CATEGORY_ORDER` (shirt, trouser, blazer, shoes, belt):

- **Category** — display label map:
  - `shirt` → Shirt
  - `trouser` → Pant
  - `blazer` → Jacket
  - `jacket` → Jacket
  - `shoes` → Shoes
  - `belt` → Belt
  - `sweater` → Sweater
- **Style** — first `missingStyles[0]` pretty-printed; fallback `—` if empty
- **Color** — first `missingColors[0]` pretty-printed; fallback `—` if empty
- **Include row** if at least one of style or color is non-empty OR category status is Missing/Weak (item_count 0)

Skip aggregate pseudo-categories `colors` and `styles` rows.

Empty table copy: **"Your wardrobe looks complete for this analysis — nothing urgent to buy."**

### WhatsApp message format

```
Shopping list (wardrobe analysis)

• Shirt — Oxford, Navy
• Pant — Chino, Charcoal
```

Use em dash or comma between style and color per platform convention; keep readable.

---

## Visual / UX

- Table: dark card, bordered rows, header row with column labels
- Actions row below table: **Export CSV** (secondary), **Send to WhatsApp** (primary or equal weight)
- `data-testid="shopping-list-table"` on web
- iOS accessibility identifiers via new `InsightsCopy` / helper constants
- iPhone / iPad: same UX; table may horizontal-scroll on narrow width

---

## API and contract

- [x] No backend changes
- Extend `WardrobeInsightResult` optionally with `shoppingListRows: ShoppingListRow[]` in normalizer (web + iOS) OR build in view from `categoryHealth`

```typescript
interface ShoppingListRow {
  categoryKey: string;
  category: string;  // display label
  style: string;
  color: string;
}
```

---

## User-facing docs (About & Guide)

- [x] **Yes** — brief mention of shopping table + export/WhatsApp on insights screen
- Guide: one step under Wardrobe Insights
- About: one bullet

---

## Tests (required)

### Web

- [ ] `frontend/src/utils/buildShoppingListRows.test.ts` — row derivation, labels, skips empty
- [ ] `frontend/src/views/components/insights/ShoppingListTable.test.tsx` — renders table, export triggers download, WhatsApp opens with encoded text (mock window.open)
- [ ] Update `WardrobeInsightsComponents.test.tsx` — table present, top-missing section removed
- [ ] Update `InsightsFlow.integration.test.tsx` if it asserts top-missing section

### iOS

- [ ] `ios-client/OutfitSuggestorTests/BuildShoppingListRowsTests.swift`
- [ ] Extend `WardrobeInsightsViewTests.swift` — shopping table copy/identifiers
- [ ] Run `BuildShoppingListRowsTests` + `WardrobeInsightsViewTests`

---

## Parity checklist

- [x] Same intro copy
- [x] Same column headers: Category | Style | Color
- [x] Same category display labels (Pant, Jacket, etc.)
- [x] Export + WhatsApp on both platforms
- [x] Top items cards removed from insights result
- [x] About + Guide updated
- [x] `IOS_WEB_FEATURE_PARITY.md` updated

---

## Out of scope

- New AI endpoint
- Google Shopping product links in table cells
- PDF export
