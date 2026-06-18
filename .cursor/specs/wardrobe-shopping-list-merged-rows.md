# Feature Spec: Shopping list — one row per category (merged styles/colors)

**Branch:** `fix/gui-minor-issues`  
**Slug:** `wardrobe-shopping-list-merged-rows`  
**Status:** done

---

## User story

As a user viewing the on-demand shopping list, I want **one row per category** with all missing styles and colors merged (comma-separated) — so the table is compact and easy to take shopping.

**Example:**

| Category | Style | Color |
|----------|-------|-------|
| Shirt | Oxford, Linen, Overshirt | Beige |
| Jacket | Unstructured, Lightweight, Casual Blazer, Linen Blazer | Black, White, Beige |

---

## Change

Replace cartesian-product rows with **one row per clothing category**:

- **Style column:** unique `missingStyles`, `prettyLabel` each, join with `", "` (Oxford order preserved from API)
- **Color column:** unique `missingColors`, `prettyLabel` each, join with `", "`
- Empty styles → `—`; empty colors → `—`
- Row `key` = `categoryKey` (single row per category)
- Include row logic unchanged (missing style/color OR Missing/Weak status)

**CSV / WhatsApp:** use merged strings. WhatsApp bullet example:
`• Shirt — Oxford, Linen, Overshirt; Beige` (styles and colors separated clearly)

---

## Scope

- `frontend/src/utils/buildShoppingListRows.ts` + tests
- `ios-client/OutfitSuggestor/Utils/BuildShoppingListRows.swift` + tests
- Update tests only; no UI component layout changes unless test IDs break

**No backend. No About/Guide** (presentation-only).

---

## Tests

### Web
- `buildShoppingListRows.test.ts` — one row per category, comma-separated style/color
- `ShoppingListTable.test.tsx` if row keys/count change

### iOS
- `BuildShoppingListRowsTests.swift` — same cases

---

## Parity

- [ ] One row per category both platforms
- [ ] Comma-separated unique styles and colors
- [ ] CSV + WhatsApp use merged values
