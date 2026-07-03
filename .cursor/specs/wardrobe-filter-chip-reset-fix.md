# Feature Spec: Wardrobe Filter Chip Reset Fix

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-filter-chip-reset-fix`  
**Status:** in-progress

---

## User story

As a user filtering my wardrobe, when I tap a category chip (Shirt, Trousers, Polo, etc.) the list and active chip should stay on that filter — not snap back to **All**.

---

## Bug

**Web:** `handleCategoryFilter` calls `setSelectedCategory(chip)` then `loadWardrobe(apiCategoryParamForFilter(chip), ...)`. For client-side filters (all core chips + several extended), `apiCategoryParamForFilter` returns `undefined`. `loadWardrobe` then runs `setSelectedCategory(category || null)` and clears the selection → UI shows **All** active while filtering may be inconsistent.

**iOS:** Verify no equivalent reset; add regression tests if logic is already correct.

---

## Fix (web)

1. Decouple **UI filter key** from **API category param** in `useWardrobeController.loadWardrobe`:
   - Option A: add optional `filterCategory` argument; set `selectedCategory` from `filterCategory` when provided, never from API `category` alone.
   - Option B: remove `setSelectedCategory` from `loadWardrobe`; callers always set filter via `setSelectedCategory`.
2. All `loadWardrobe` call sites must preserve active filter key; internal reloads (`addItem`, `updateItem`, `deleteItem`) use `apiCategoryParamForFilter(selectedCategory)` for API, not `selectedCategory` raw.
3. `visibleWardrobeItems` client-side filter continues to use `selectedCategory` + `matchesWardrobeCategoryFilter`.

---

## Fix (iOS)

- Audit `categoryFilter` chip tap + `load()` reset path (`countForCategory == 0` → All).
- Ensure chip tap sets `categoryFilter` and list filters without spurious reset.
- Add/adjust unit tests in `WardrobeCategoryFilterTests`.

---

## Tests (required)

### Web
- `Wardrobe.test.tsx`: clicking Shirt/Trousers/Blazer keeps chip active (not All)
- `wardrobeCategory.test.ts` or controller test if added: loadWardrobe preserves filter key for client-side filters

### iOS
- `WardrobeCategoryFilterTests`: filter selection does not reset to All when count > 0

---

## Out of scope

- Backend changes
- Insights
- New filter types

---

## User-facing docs

- [ ] No — bug fix only
