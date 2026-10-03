# Feature Spec: Expandable images in the wardrobe fit panel (Cost Twin UI)

**Branch:** `feature/wardrobe-fit-improvements`  
**Slug:** `wardrobe-fit-expandable-images`  
**Status:** done

## Goal

On the **How this fits** and **Check before you buy** result panel/sheet, every picture can be
tapped/clicked to open a full-screen image viewer, then dismissed back to the panel (panel stays open,
same scroll/result state).

Pictures in scope:

1. Candidate thumbnail at the top (owned item image, or uploaded photo for Check before you buy)
2. Every thumbnail under **Works with what you own** (all categories)

Images with no `image_data` stay non-interactive (no button, no viewer).

## Files (narrow scope)

| Platform | Implement | Reuse | Test |
|---|---|---|---|
| Web | `frontend/src/views/components/wardrobe/WardrobeFitPanel.tsx` | Existing full-screen viewer used by `Wardrobe.tsx` "View image" (alt text `Full size view`) — reuse or extract a tiny shared component; do not invent a different look | `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/WardrobeFitResultSheet.swift` | `FullScreenImageView` (defined in `OutfitSuggestionView.swift`) via `.fullScreenCover`, same pattern as `WardrobeListView.swift` | `ios-client/OutfitSuggestorTests/WardrobeFitEvaluateTests.swift` |

## UX

- Thumbnails get a pointer cursor + visible focus ring (web) and are buttons with accessibility labels:
  - Candidate: `View full image`
  - Pair thumbnail: `View full image of <item label>`
- Viewer: dark full-screen backdrop, image scaled to fit, close control; web also closes on Escape and
  backdrop click. Closing returns to the panel unchanged.
- iOS: identical on iPhone and iPad (fullScreenCover on both).
- No backend/API changes. No About/Guide changes (Guide already says "tap images to view them full screen").
- `IOS_WEB_FEATURE_PARITY.md`: orchestrator adds one phrase to the fit row.

## Tests (required — one file per platform)

### Web — `WardrobeFitEvaluate.integration.test.tsx`

- [x] Clicking the candidate thumbnail opens the viewer (`Full size view` image visible); closing it leaves the fit panel visible
- [x] Clicking a "Works with what you own" thumbnail opens the viewer with that item's image src
- [x] Escape closes the viewer
- [x] A pair item without `image_data` renders no `View full image of …` button

### iOS — `WardrobeFitEvaluateTests`

- [x] Testable selection state (e.g. a small helper/enum in the sheet) — selecting candidate image sets the full-screen image; dismiss clears it
- [x] Selecting a pair item with image data sets it; item without image data does not open
- [x] Accessibility label helper returns `View full image of <label>`

## Out of scope

- Pinch-zoom/swipe gallery between images
- Showing `reason` / `weak_match` from the API
