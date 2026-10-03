# Wardrobe fit — "View all (N)" expands pair category in place (Cost Twin UI)

**Branch:** `feature/wardrobe-fit-improvements` (no commits)

## Goal
In the "How this fits" / "Check before you buy" panel, each "Works with what you own" category shows the first 3 thumbnails. If `count > 3`, a "View all (N)" button follows them; tapping expands the category in place (wrapping grid of all items) and the button becomes "Show less". Each category toggles independently. No sheet/page.

## Backend (done)
`_build_rows` in `backend/services/wardrobe_fit_service.py` now returns ALL paired items per category, best-first. `count == len(items)`. Response shape unchanged.

## UX (web = iOS; iPhone = iPad)
- Collapsed: first 3 thumbnails; if `count > 3` show "View all (N)" (N = `count`).
- Expanded: all thumbnails (wrapping), button "Show less".
- `count <= 3`: no button.
- Every thumbnail (incl. revealed) opens the existing full-screen viewer; items without `image_data` stay non-tappable.
- Copy exactly: `View all (N)`, `Show less`. No About/Guide or summary_text changes.

## Files
- Web: `frontend/src/views/components/wardrobe/WardrobeFitPanel.tsx`, `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx`
- iOS: `ios-client/OutfitSuggestor/Views/WardrobeFitResultSheet.swift`, `ios-client/OutfitSuggestor/Utils/WardrobeFitEvaluateCopy.swift`, `ios-client/OutfitSuggestorTests/WardrobeFitEvaluateTests.swift`

## Tests (one file per platform)
- [x] Backend: >3 pairs returns all, best-first, len(items) == count
- [x] Category with >3 items shows 3 thumbnails + "View all (N)"
- [x] Tap → all items + "Show less"; tap again → back to 3
- [x] Category with <=3 items has no toggle
- [x] Revealed (4th+) thumbnail opens full-screen viewer
