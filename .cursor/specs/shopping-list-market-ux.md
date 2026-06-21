# Feature Spec: Shopping List Market UX

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `shopping-list-market-ux`  
**Status:** in-progress

---

## User story

As a user who has completed Wardrobe Insights, I want a market-ready shopping list with human-readable "Look for" guidance, per style+color Google Shopping links, a bought checklist with notes, and improved WhatsApp/PDF export so I can shop in person and share the list easily.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Shopping list panel | `frontend/src/views/components/insights/ShoppingListPanel.tsx` | `ios-client/OutfitSuggestor/Views/Insights/ShoppingListView.swift` | Expand by default; market checklist |
| Helpers | `frontend/src/utils/insightsHelpers.ts` | `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift` | Labels, look-for text, URLs, export |
| Checklist persistence | `frontend/src/utils/shoppingListStorage.ts` (new) | `ios-client/OutfitSuggestor/Utils/ShoppingListStorage.swift` (new) | localStorage / UserDefaults |

### Flow

1. User completes Wardrobe Insights and opens **Shopping list** (web panel expanded by default; iOS sheet).
2. User sees rows with: **Buy** (clean label + priority badge), **Look for** (human text), **Search online** (per-combo chips + Search all).
3. User checks off items bought and adds optional notes; progress shows `2 / 5 bought`.
4. User exports via **Export to WhatsApp**, **Copy list**, or **Export as PDF**.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No items | Empty state | `No shopping list items for this analysis.` |
| List with items | Expanded list, progress footer | `Progress: {n} / {total} bought` |
| See all options | Expandable tuple detail per row | `See all options` / `Hide options` |
| Export error | Alert/toast | `Could not export shopping list.` |
| Copy success | Brief feedback | `Copied to clipboard` (web toast or alert; iOS optional haptic) |

---

## Visual / UX

### Column renames

| Old | New |
|-----|-----|
| Item | **Buy** |
| Style & color tuples | **Look for** |
| Google Shopping | **Search online** |

### Row content

- **Buy:** Clean category label (Belt, Blazer, Shoes, Shirt, Trousers) with deduped words; priority badge (High / Medium / Low).
- **Look for:** Human-readable summary, e.g. `Black or brown leather; braided black OK`. Expandable full tuple list for power users.
- **Search online:** Chips per (style, color) pair, e.g. `Leather · Black`. Row-level **Search all** using top 2–3 combos only.
- **Checklist:** Checkbox per row + optional notes input. Progress bar or text at bottom.

### Label cleanup rules (both platforms)

- Dedupe repeated words: `White Trouser Trouser` → `Trousers`.
- Prefer category label over raw AI `name` when cleaner.
- Sentence case for "or": `black or brown`, not `Black Or Brown`.
- Implement in shared helper logic (`cleanShoppingItemLabel`, `formatLookForText`).

### Google Shopping URLs

- Per-combo: use existing `buildShoppingSearchUrl(category, [style], [color])` pattern.
- Search all: top 2–3 tuples only (limit constant, e.g. `SHOPPING_LIST_SEARCH_ALL_LIMIT = 3`).
- External open only — no iframe, no product API.

### WhatsApp export

```text
🛍 ClosIQ Shopping List
For: Business · Winter · Smart casual

1. Belt (High)
   → Black or brown leather; braided black OK
   🔗 {one focused Google Shopping URL}

2. Blazer (High)
   → Unstructured black or white
   🔗 {url}
```

- No raw `(Style, Color)` tuples in default export.
- One link per item (Search all URL or first combo URL).

### PDF export

- Same structure as WhatsApp: numbered list, priority, look-for, checkboxes.
- Web: dedicated print stylesheet or hidden print-only DOM (title, context, checklist) — improve beyond bare `window.print()` on empty page.
- iOS: update `pdfData` to match WhatsApp structure.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad.
- Layout-only tweaks via `horizontalSizeClass` / `adaptiveContent`.

---

## API and contract

### Backend changes needed?

- [x] No — client-only UI and local persistence

### Client contract files to update

**Web**

- [x] `frontend/src/utils/insightsHelpers.ts` — extend with label/look-for/URL helpers
- [x] `frontend/src/utils/shoppingListStorage.ts` — new
- [x] `frontend/src/views/components/insights/ShoppingListPanel.tsx`

**iOS**

- [x] `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift` — extend
- [x] `ios-client/OutfitSuggestor/Utils/ShoppingListStorage.swift` — new
- [x] `ios-client/OutfitSuggestor/Utils/InsightsCopy.swift` — new copy strings
- [x] `ios-client/OutfitSuggestor/Views/Insights/ShoppingListView.swift`

### Shared constants

| Name | Value | Web file | iOS file |
|------|-------|----------|----------|
| Search all combo limit | 3 | `insightsHelpers.ts` | `WardrobeInsightShoppingList.swift` |
| Storage key prefix | `shopping-list-checklist:` | `shoppingListStorage.ts` | `ShoppingListStorage.swift` |

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - **Guide:** Market checklist (checkbox + notes), per style/color Google Shopping chips, Copy list, improved WhatsApp/PDF export.
  - **About:** Mention market-ready shopping list with checklist and focused Google Shopping searches.

---

## Platform-specific notes

### Web only

- Checklist: `localStorage`, key = `shopping-list-checklist:{contextHash}` where hash = occasion|season|style + sorted item ids.
- Copy list: `navigator.clipboard.writeText`.
- Print/PDF: `@media print` block or print-only section with checklist layout.

### iOS only

- Checklist: `UserDefaults`, same key scheme.
- Copy list: `UIPasteboard.general.string`.
- WhatsApp: `whatsapp://send?text=...` with fallback share sheet.

---

## Tests (required)

### Backend

- N/A — no backend changes

### Web

- [x] Unit: `frontend/src/utils/insightsHelpers.test.ts`
- [x] Unit: `frontend/src/utils/shoppingListStorage.test.ts` (new)
- [x] Component: `frontend/src/views/components/insights/WardrobeInsightsComponents.test.tsx` or `ShoppingListPanel.test.tsx`
- Cases:
  - `cleanShoppingItemLabel` dedupes repeated words and prefers category
  - `formatLookForText` produces human-readable summary
  - Per-combo URLs use focused query (category + style + color)
  - Search all URL uses max 3 combos
  - WhatsApp text: numbered, no raw tuples, one link per item
  - Panel: expanded by default, priority badges, combo chips, checklist toggles progress
  - Copy list writes expected text

### iOS

- [x] `ios-client/OutfitSuggestorTests/WardrobeInsightShoppingListTests.swift`
- [x] `ios-client/OutfitSuggestorTests/WardrobeInsightsViewTests.swift`
- [x] `ios-client/OutfitSuggestorTests/ShoppingListStorageTests.swift` (new, optional)
- Cases:
  - Label cleanup and look-for formatting match web
  - Per-combo and search-all URLs
  - WhatsApp share text format
  - Copy strings in InsightsCopy for new column names and actions

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Same copy and error messages
- [x] Equivalent checklist + export UX
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend endpoints
- Product image APIs (SerpAPI, etc.)
- Affiliate integration
- In-app Google Shopping gallery / iframe
