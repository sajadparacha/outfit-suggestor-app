# Bugfix Spec: Wardrobe filter chip resets to All

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-filter-chip-reset`  
**Status:** in-progress

## Bug

On web Wardrobe, clicking core filter chips (Shirt, Trousers, Blazer, Shoes, Belt) or client-side extended chips (T-shirt, Sweater, Jacket, Tie, Other) immediately resets selection to **All**. Extended API-backed chips (Polo, Jeans, Shorts) may work.

## Root cause

`useWardrobeController.loadWardrobe` sets `setSelectedCategory(category || null)` using the **API** category param. Client-side filters pass `undefined` to the API, wiping UI selection.

## Fix (web only)

1. Stop `loadWardrobe` from mutating `selectedCategory` — UI owns filter state.
2. Controller CRUD reloads: use `apiCategoryParamForFilter(selectedCategory)` for API calls.
3. Client-side filters: load wardrobe without API category (use higher limit e.g. 100, parity with iOS) and filter in `visibleWardrobeItems`; paginate filtered results client-side or hide server pagination when client filter active.
4. Add regression test: click Shirt chip → `selectedCategory` stays `shirt`, filtered items shown.

## iOS

Verify no equivalent bug (likely OK — `@State categoryFilter` not reset by load).

## Tests

- Web: `Wardrobe.test.tsx` regression for chip selection persistence
- Run `npm test -- --watchAll=false`
