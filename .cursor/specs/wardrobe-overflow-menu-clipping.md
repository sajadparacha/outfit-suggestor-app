# Feature Spec: Wardrobe overflow menu fully visible

**Branch:** `main`  
**Slug:** `wardrobe-overflow-menu-clipping`  
**Status:** done

---

## User story

As a wardrobe user, when I tap the ⋮ overflow button on an item card, I want to see all menu options (View image, Edit, Delete) without them being cut off.

---

## Problem

On web, the wardrobe card wrapper uses `overflow-hidden`. The overflow menu is `position: absolute` and opens downward (`top-full`), so Edit and Delete are clipped by the card boundary (especially with the **Past Suggestions** button directly below the menu trigger).

---

## Screens and flows

| Screen / area | Web location | iOS location |
|---------------|--------------|--------------|
| Wardrobe item card overflow menu | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` (`WardrobeCardView`) |

### Expected behavior

1. User taps ⋮ on any wardrobe card.
2. Menu shows **all three items** fully visible and tappable: View image, Edit, Delete.
3. Menu does not overlap or hide behind the Past Suggestions button.
4. Menu closes on outside click, after selection, or Escape (web).

---

## Fix approach

### Web (required)

1. **Remove clipping** on the card container: replace `overflow-hidden` with `overflow-visible` on the wardrobe item card wrapper (keep `overflow-hidden` only on the thumbnail image block).
2. **Open menu upward** from the ⋮ trigger: use `bottom-full mb-1` instead of `top-full mt-1` so the menu expands above the trigger (away from Past Suggestions below).
3. Raise menu stacking: `z-50` (or higher) so it appears above adjacent cards.
4. Do not change menu items, copy, or actions.

### iOS (verify / harden)

- SwiftUI `Menu` uses native presentation and should not clip. Verify no parent applies `.clipped()` that would affect menu popover.
- If card `clipShape` could affect presentation on some OS versions, ensure menu popover is unaffected (native Menu presents outside card bounds).
- Add/update unit test documenting expected menu actions remain accessible.

---

## States

| State | Behavior |
|-------|----------|
| Menu open | All 3 items visible |
| Last card in list | Menu still fully visible (not clipped by list or viewport) |
| Scroll while open | Web: close menu on scroll (optional improvement) or keep open — prefer close on outside click only |

---

## API and contract

- [x] No backend changes

---

## Tests (required)

### Web (web agent)

- [ ] `frontend/src/views/components/Wardrobe.test.tsx`
- Cases:
  - Opening menu exposes all three menuitems (View image, Edit, Delete) — existing tests should still pass
  - Card wrapper does not use `overflow-hidden` (or menu opens upward — assert via class/structure or document menu placement class)
  - Optional: test menu has upward placement class (`bottom-full`)

### iOS (iOS agent)

- [ ] `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift`
- Cases:
  - Menu actions order unchanged (viewImage, edit, delete)
  - Build succeeds

### Commands

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build` + run WardrobeCardUxTests |

---

## Parity checklist

- [x] Web overflow menu fully visible on all cards
- [x] iOS menu verified accessible (native Menu)
- [x] No change to menu items or actions
- [x] Tests updated (web + iOS)

---

## Out of scope

- Changing menu items or Past Suggestions button
- Backend changes
- Portal-based menu (only if upward + overflow-visible insufficient)
