# Feature Spec: Wardrobe thumbnail opens full image

**Branch:** `fix/gui-minor-issues`  
**Slug:** `wardrobe-thumbnail-full-image`  
**Status:** done

---

## User story

As a wardrobe user, I want to tap/click an item thumbnail to see the full photo in a large viewer, so I can inspect clothing details without hunting through the overflow menu.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe item card thumbnail | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` (`WardrobeCardView.imageBlock`) | Primary change |

### Flow

1. User is on **My Wardrobe** with at least one item that has `image_data`.
2. User taps/clicks the **thumbnail** on the item card (not the ⋮ menu).
3. Platform opens the **existing** full-screen image viewer (already used by “View image” in overflow menu).
4. User dismisses via **Close** button, backdrop tap (web), or swipe-down / close control (iOS `FullScreenImageView`).
5. User returns to the wardrobe list unchanged.

Items **without** an image keep the placeholder; thumbnail is not interactive.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Has image | Thumbnail is tappable; opens full viewer | Close button `aria-label`: “Close full image” (web); reuse iOS `FullScreenImageView` close |
| No image | Placeholder only; no open action | — |
| Viewer open | Full image `object-contain` / `scaledToFit`; dark backdrop | Alt text web: “Full size view” (existing) |

---

## Visual / UX

- Thumbnail gets **pointer cursor** and subtle **hover/focus** affordance on web (`hover:opacity-90`, `cursor-pointer`, `title="Click to view full size"` — match `OutfitHistory.tsx` pattern).
- Thumbnail wrapped in `<button type="button">` on web (or clickable div with keyboard support) — must not trigger card actions.
- iOS: wrap thumbnail `Image` in `Button` with `.buttonStyle(.plain)`; call existing `onShowImage(image)`.
- Reuse existing modal/full-screen implementations — **do not** duplicate viewer UI.
- “View image” overflow menu item **remains**; thumbnail is an additional entry point.
- Theme: dark backdrop `bg-black/90`, close control top-right (match `OutfitPreview` / existing wardrobe viewer).

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: tap thumbnail → full screen → dismiss.
- Layout-only: thumbnail size unchanged (130×130).

---

## API and contract

### Backend changes needed?

- [x] No — UI-only
- [ ] Yes

---

## User-facing docs (About & Guide)

- [x] **No** — minor affordance; “View image” already documented via overflow menu; no new capability name needed.
- [ ] **Yes**

---

## Platform-specific notes

### Web only

- Reuse `handleViewImage` + `viewingImage` state in `Wardrobe.tsx`.
- Add `data-testid={`wardrobe-thumbnail-${item.id}`}` and `aria-label="View full size image"`.

### iOS only

- Reuse `onShowImage` → `fullScreenImage` → `FullScreenImageView` in `WardrobeListView`.
- Add accessibility identifier: `wardrobe.thumbnail.{itemId}` via `WardrobeCardUx` helper (new constant function).
- Optional: add copy helper `thumbnailAccessibilityLabel` = “View full size image” in `WardrobeCardUx.swift`.

---

## Tests (required)

### Backend (orchestrator)

- N/A

### Web (web agent)

- [ ] Extend `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Cases:
  - Clicking thumbnail when `image_data` present opens full-screen viewer (`getByAltText('Full size view')`).
  - Clicking placeholder when no `image_data` does not open viewer.
  - Thumbnail has `data-testid` and is a button with accessible name.

### iOS (iOS agent)

- [ ] Extend `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift`
- [ ] Cases:
  - `thumbnailIdentifier(itemId:)` returns `wardrobe.thumbnail.{id}`.
  - `thumbnailAccessibilityLabel` matches web (“View full size image”).
- [ ] Optional UITest: not required for this minor affordance.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide — N/A
- [x] Same dismiss patterns (close + backdrop where applicable)
- [x] Overflow “View image” still works
- [x] New-behavior tests added (web + iOS)
- [x] `IOS_WEB_FEATURE_PARITY.md` updated

---

## Out of scope

- Editing image from full-screen viewer
- Pinch-to-zoom enhancements
- History or outfit-result thumbnails (already supported elsewhere)
- Backend or API changes
