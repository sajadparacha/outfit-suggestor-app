# Feature Spec: Wardrobe completion selection thumbnails

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-completion-selection-thumbnails`  
**Status:** in-progress

---

## User story

As a user completing an outfit from selected wardrobe pieces, I want to see thumbnail images of my selected items next to the **Complete outfit with AI** action so I can confirm my picks at a glance and tap a thumbnail to view the full image.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Complete-outfit panel | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` | Thumbnails in selection summary / action row |

### Flow

1. User selects 1–5 wardrobe items for outfit completion (existing behavior).
2. Panel shows text summary (e.g. `2 selected: shirt, blazer`) **and** a horizontal row of thumbnails for each selected item that has `image_data`.
3. Thumbnails appear adjacent to the **Complete outfit with AI** button (same panel section, visible when ≥1 item selected).
4. User taps/clicks a thumbnail → full-size image viewer opens (reuse existing modal / full-screen cover).
5. User dismisses viewer and can still tap **Complete outfit with AI** or **Clear selection** (unchanged).

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No selection | No thumbnails | `No items selected` (unchanged) |
| 1+ selected, all have images | Thumbnail per selected item | Slot summary unchanged |
| Selected item missing image | Skip thumbnail for that item; show text summary only for that slot | No new error copy |
| Thumbnail tap | Open full image | Reuse existing full-image viewer |

---

## Visual / UX

- Horizontal row of small square thumbnails (~48–56px web, ~44–52pt iOS), rounded corners, subtle border (`white/10` / `AppTheme.border`).
- Order thumbnails in selection order (same order as slot summary).
- Each thumbnail: `object-cover` / aspect-fill; optional slot label under or as `aria-label` / accessibility label (e.g. `View shirt`).
- Place thumbnails **left of** (web: in action row before CTA; iOS: above or beside complete button) the **Complete outfit with AI** button when items are selected.
- On web: reuse `handleViewImage` + existing `viewingImage` modal.
- On iOS: reuse `fullScreenImage` + `FullScreenImageView` (decode base64 from `WardrobeItem.image_data`).
- Theme: dark slate, brand border accents; match existing wardrobe card thumbnail styling.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and tap-to-enlarge behavior.
- **Layout-only:** on regular width, thumbnails may use slightly larger size or more horizontal spacing; same row layout.

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Thumbnails in a scrollable horizontal row if needed |
| iPad / regular width | Same row; optional slightly larger thumbs |

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Endpoints

None.

### Client contract files to update

None.

---

## User-facing docs (About & Guide)

- [x] **No** — minor visual affordance reusing existing “view full image” pattern; no change to documented flows or capabilities in Guide/About.

---

## Platform-specific notes

### Web only

- Reuse `viewingImage` state and image viewer modal at bottom of `Wardrobe.tsx`.
- Add `data-testid` on thumbnail row (e.g. `wardrobe-selection-thumbnails`) and per-thumb (e.g. `wardrobe-selection-thumb-{id}`).

### iOS only

- Use existing `selectedCompletionItems` and `fullScreenImage` state in `WardrobeListView`.
- Add `accessibilityIdentifier` on thumbnail row (`wardrobe.multiSelect.thumbnails`) and per thumb.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

Skipped — UI-only.

### Web (web agent)

- [ ] Unit: extend `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Integration: extend `frontend/src/views/components/WardrobeMultiSelect.integration.test.tsx`
- [ ] Cases:
  - With 2 items selected, thumbnail row renders with 2 images (`data-testid` or `alt`/role).
  - Clicking a thumbnail opens full-size viewer (`viewingImage` modal visible).
  - No thumbnails when nothing selected.
  - Item without `image_data` omitted from thumbnails but selection summary still shows slot.

### iOS (iOS agent)

- [ ] Unit: extend `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift` or add `WardrobeCompletionThumbnailsTests.swift`
- [ ] Cases:
  - `selectedCompletionItems` / helper returns items in selection order for thumbnail rendering.
  - Thumbnail visibility predicate: only items with decodable `image_data`.
  - Accessibility identifiers documented for UI tests.

### End of Twin UI — confirm, then full suites + report (orchestrator)

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms (if spec required) — N/A
- [x] Thumbnails + tap-to-enlarge on both platforms
- [x] Equivalent empty / missing-image handling
- [x] `IOS_WEB_FEATURE_PARITY.md` updated (if new capability)
- [x] New-behavior tests added (web + iOS)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend or API changes
- Removing text slot summary (keep both text + thumbnails)
- New image upload or editing from thumbnail row
- Guide/About copy updates
