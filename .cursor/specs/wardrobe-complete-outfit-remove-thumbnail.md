# Feature Spec: Wardrobe complete-outfit — remove one selected thumbnail

**Branch:** `feature/gui-enhancements`  
**Slug:** `wardrobe-complete-outfit-remove-thumbnail`  
**Status:** done  
**Mode:** Cost Twin UI (abbreviated)

---

## Goal

On Wardrobe “Complete an outfit from selected wardrobe pieces,” let the user remove **one** selected item from the selection thumbnail row via a distinct ✕ control (not only “Clear selection”).

## Allowed files

**Web**
- `frontend/src/views/components/Wardrobe.tsx`
- `frontend/src/views/components/Wardrobe.test.tsx`
- (+ `WardrobeMultiSelect.integration.test.tsx` only if unit file isn’t enough)

**iOS**
- `ios-client/OutfitSuggestor/Views/WardrobeListView.swift`
- `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` (reuse existing `remove` / `toggle` if present)
- `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift` (or one existing wardrobe multi-select test file)

## Behavior (both platforms)

1. Thumbnail image/tap still opens full-size preview (unchanged).
2. Each selection thumbnail has a distinct ✕ / remove control (separate hit target from preview tap).
3. ✕ removes that one item from the completion selection; status text and “Complete outfit with AI” update from what’s left.
4. “Clear selection” still clears all.
5. Reuse existing select/deselect logic; **no backend/API changes**.

## About / Guide / parity

- **About:** no  
- **Guide:** no  
- **IOS_WEB_FEATURE_PARITY.md:** skip (no new capability copy)

## Tests (required)

One test file per platform max:

- [x] Web: select 2 → remove 1 via ✕ → one remains; preview still works
- [x] iOS: select 2 → remove 1 via ✕ → one remains; preview still works

No full suites.

## API

- [x] No — UI-only
