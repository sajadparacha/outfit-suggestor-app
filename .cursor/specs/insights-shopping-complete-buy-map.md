# Feature Spec: Insights shopping list = complete category buy map

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-shopping-complete-buy-map`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

Shopping list and Top items to add are a **complete buy map of wardrobe gaps**: one row per gapped clothing category (including empty `item_count == 0` categories). Row title is the category label (Belts, Shirts, Shoes) — never a fake SKU like "black leather belt". Look for / Best colors / Styles to try list **all** missing colors and all Essential+Useful missing styles (Skip stays off). Reason says own-none when empty, then buy-first vs also-missing.

Do **not** emit one shopping-list row per color×style combo. Top 3 summary stays highest-impact categories only. Suggest filters and Insights Analysis Preference chips are unchanged.

---

## File paths (read only listed files; no full-repo search)

**Backend (orchestrator)**

- `backend/services/wardrobe_service.py` (`_format_item_name`, `_generate_why_this_matters`, `ensure_shopping_list_covers_gaps`, `_generate_priority_shopping_list`, `constrain_shopping_list_to_inventory`, `_shopping_row_for_category`)
- **Primary tests:** `backend/tests/test_wardrobe_gap_inventory.py`

**Web (web agent — only these + one test file)**

- `frontend/src/utils/insightsHelpers.ts`
- `frontend/src/utils/normalizeWardrobeInsight.ts`
- `frontend/src/views/components/insights/MissingItemCard.tsx`
- `frontend/src/views/components/insights/TopMissingItemsSection.tsx`
- `frontend/src/views/components/insights/ShoppingListPanel.tsx`
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- **One test file:** `frontend/src/utils/insightsHelpers.test.ts`

**iOS (iOS agent — only these + one test file)**

- `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift`
- `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift`
- `ios-client/OutfitSuggestor/Views/Insights/ShoppingListView.swift`
- `ios-client/OutfitSuggestor/Views/Insights/TopMissingItemsView.swift` (and `MissingItemCardView.swift` if that is the missing-item card)
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift`
- **One test file:** `ios-client/OutfitSuggestorTests/WardrobeInsightShoppingListTests.swift`

---

## Behavior

1. **One row per gapped category.** A category is gapped if it has missing colors OR Essential/Useful missing styles. Empty categories (`item_count == 0`) always get a row when they have a buyable gap (typical: missing colors + styles).
2. **No combo rows.** Internal search tuples/chips may still exist; the table/list itself is one row per category.
3. **Title = category label** (plural, same as coverage dashboard): Belts, Shirts, Shoes, Blazers, Sweaters, Jackets, Ties, Trousers. Never `{firstColor} {firstStyle} {category}`. Client `cleanShoppingItemLabel` always returns that label even if the API still sends a SKU name.
4. **Look for / Best colors / Styles to try:** all missing colors; all Essential+Useful styles (Skip off). Look for example empty belts: `Black or brown leather; braided or reversible optional` (all colors with the first/highest style; remaining styles as optional — do not repeat colors on every style).
5. **Reason:** if `item_count == 0`, say they own none; then buy-first (highest-ranked style + first color) vs what else is still missing. Example: `You own no belts. Buy first black leather.` (also-missing clause when more colors/styles remain).
6. **Top 3 summary** = first 3 highest-impact categories only. **Shopping list + Top items to add** = the full category-gap list (same `missingItems` data). Cards must not slice styles to 4.
7. **Unchanged:** Suggest filters; Insights Analysis Preference chips.

### About / Guide

**Yes — update both platforms.** Shopping list is every category that still has a gap, with colors and styles to buy — not one starter SKU. Empty categories appear.

### iPhone / iPad

Same UX. Layout/spacing only via `horizontalSizeClass`.

---

## Backend / contract

No schema change. After free + premium:

- `itemName` = category display label (Belts), not a product SKU.
- `recommendedColors` = all remaining missing colors.
- `recommendedStyles` = all Essential+Useful missing styles (not a `[:2]` slice; Skip off).
- `reason` = own-none when `item_count == 0`; buy-first vs also-missing.
- `constrain_shopping_list_to_inventory` must **rewrite** model SKU titles, fill all colors/styles from inventory, and not collapse empty belts to one SKU.
- `ensure_shopping_list_covers_gaps` still **appends** omitted gapped categories (including empty ones). One item per category (dedupe).

---

## Tests (required)

### Backend — `test_wardrobe_gap_inventory.py`

- Empty belt (`item_count` 0, missing black/brown, styles leather Essential + braided/reversible Useful + a Skip): shopping row `itemName` is `Belts`; all missing colors; Essential+Useful styles only; reason mentions own none and buy first black leather.
- Premium constrain: model item `itemName` `black leather belt` with only black/leather → rewritten to `Belts` with all colors and Essential+Useful styles.
- Ensure: shopping list omits belt while analysis has empty belt gap → result includes belt with category-label name.
- One row per gapped category (not one per color×style). Color-only row still kept.

### Web — `insightsHelpers.test.ts`

- `cleanShoppingItemLabel('black leather belt', 'belt')` → `Belts` (never keep SKU). Same for shirts.
- Empty-belt Look for: all colors + first style; remaining styles optional (`Black or brown leather; braided or reversible optional`).
- One shopping row per missing item/category (row count == items, not color×style product).
- Title/clean label is category plural, not `Oxford Shirt`.

### iOS — `WardrobeInsightShoppingListTests.swift`

- Same as web: clean label Belts not `black leather belt`; Look for lists all colors and optional extra styles; one row per category; empty-category copy path covered via label/reason assumptions on row build.

---

## Parity

- [x] Web and iOS titles, Look for, reason, and full vs top-3 lists match this spec
- [x] About/Guide updated on both
- [x] Suggest filters / Analysis Preference chips untouched
