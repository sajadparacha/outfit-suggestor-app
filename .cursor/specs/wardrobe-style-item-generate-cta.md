# Feature Spec: Wardrobe "Style this item" → Show Generate Outfit

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `wardrobe-style-item-generate-cta`  
**Status:** in-progress

---

## User story

As a user, when I tap **Style this item** on a wardrobe item, I land on Suggest with that item loaded and can see **Generate Outfit** to create a new look.

---

## Bug

**Root cause:** `compactMode` / result layout is tied to `hasSuggestion` (`currentSuggestion != null`). Styling a new wardrobe item does not clear the previous result on **web**, so the left column enters compact summary mode and **hides the Generate Outfit button**.

**iOS** already clears `currentSuggestion` in `applyWardrobeItemToSuggestFlow` — verify and add safeguard if needed.

---

## Required behavior (both platforms)

1. **Style this item** → navigate to Suggest tab/main
2. Load item image + wardrobe source chip
3. **Clear previous outfit result** (`currentSuggestion = null`)
4. Clear random-pick preview state (`flowPreviewUrl` / `flowPreviewImage`, `loadedFromRandomPick`)
5. Show **full creation layout** with:
   - Upload/preview area (wardrobe item image)
   - Preferences
   - **Generate Outfit** primary CTA (enabled when image present)
6. Right column: **empty preview** (not previous result)
7. Highlight/pulse Generate button optional (existing `highlightGenerateButton`)

---

## Implementation hints

### Web

- Add `prepareStyleFromWardrobeItem(item)` on `useOutfitController` OR extend `applyWardrobeItemToMainFlow` in `Wardrobe.tsx` to call:
  - `setCurrentSuggestion(null)`
  - `setFlowPreviewUrl(null)`, `setFlowPreviewCaption(null)`
  - `setSourceWardrobeItem(...)`, `setImage(file)`
- Pass `setCurrentSuggestion`, `setFlowPreviewUrl`, `setFlowPreviewCaption` via `outfitController` prop in `App.tsx` if needed
- **Safeguard:** In `Sidebar.tsx`, show Generate Outfit when `sourceWardrobeItem && image` even if `compactMode` (optional belt-and-suspenders)
- Prefer clearing suggestion so `compactMode` is false

### iOS

- Confirm `applyWardrobeItemToSuggestFlow` clears suggestion (already does)
- **Safeguard:** In `MainFlowView`, if `sourceWardrobeItem != nil && currentSuggestion == nil`, always show `creationInputColumn` (including `primaryCtaSection`) — verify iPad two-column layout
- If `sourceWardrobeItem` set but old suggestion still present, clear on load

---

## Tests (required)

### Web

- [x] `Wardrobe.test.tsx` — Style this item clears `setCurrentSuggestion(null)` when provided
- [x] `Sidebar.test.tsx` — Generate Outfit visible when `sourceWardrobeItem` + `image` + `hasSuggestion: false`
- [x] Integration: style item with existing result on main → Generate Outfit button appears

### iOS

- [ ] `OutfitViewModelIntegrationTests` — `preloadWardrobeItemForSuggestion` clears `currentSuggestion`
- [ ] Verify MainFlowView shows `main.getSuggestionButton` after wardrobe style (unit or UI test if feasible)

---

## Parity

- Same flow: wardrobe → suggest → generate
- Same copy: existing toasts / coach hints
