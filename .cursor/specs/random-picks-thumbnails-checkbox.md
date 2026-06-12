# Feature Spec: Random Picks Input Sync + Item Thumbnails + Wardrobe Checkbox

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `random-picks-thumbnails-checkbox`  
**Status:** done (agent tests pass; full-suite gate pending user confirm)

---

## User story

As a logged-in user, when I tap **Random from Wardrobe** or **Random from History**, I want item thumbnails in the result cards, the left input panel to reflect the newly loaded look (not a stale upload), and a clear **checkbox** for wardrobe-only vs AI-suggested items.

---

## Bugs to fix

### 1. Item card thumbnails missing after Random picks

**Root cause (web):** `OutfitPreview` only resolves wardrobe images when `shirt_id` / etc. match; random-outfit payloads include `matching_wardrobe_items` but often omit `*_id` fields.

**Fix:** Use shared thumbnail resolver — prefer selected id, **fallback to first match** in category.

**Orchestrator already created:**
- `frontend/src/utils/outfitItemThumbnail.ts` + tests
- `ios-client/OutfitSuggestor/Utils/OutfitItemThumbnail.swift` (add to Xcode target)
- Backend: `get_random_outfit` now sets `{category}_id` for each chosen item

### 2. Left panel shows stale upload / wardrobe chip

When Random from History or Random from Wardrobe loads a new result:
- **Clear** previous `File` upload and old `sourceWardrobeItem`
- **Set** preview from loaded suggestion:
  - History: use `entry.image_data` / suggestion `imageUrl`
  - Random wardrobe: optional preview from first wardrobe match (e.g. shirt) or show "Random from wardrobe" label
  - History with `source_wardrobe_item_id`: restore wardrobe chip from matching item data
- Compact summary and "From your wardrobe" chip must update immediately

### 3. Wardrobe-only control → checkbox

Replace toggle/switch with **checkbox** (both platforms):
- **Checked** = `useWardrobeOnly === true` (same API behavior as today)
- **Unchecked** = AI may suggest items outside wardrobe
- Label: **Use my wardrobe only** (keep existing copy / `MICRO_HELP.WARDROBE_ONLY`)
- Web: replace `ModernSwitch` in `Sidebar.tsx` wardrobe section with styled `<input type="checkbox">`
- iOS: replace `Toggle` in `MainFlowView` with `Toggle` styled as checkbox OR `Toggle(isOn:)` with `.toggleStyle(.checkbox)` (iOS 17+) — use native checkbox appearance

---

## Screens and flows

| Action | Web | iOS |
|--------|-----|-----|
| Random from Wardrobe | `getRandomSuggestion` / consider parity with `getRandomOutfit` | `getRandomFromWardrobe` |
| Random from History | `handleGetRandomFromHistory` in `App.tsx` | `getRandomFromHistory` |
| Thumbnails | `OutfitPreview.tsx` via `resolveOutfitItemThumbnail` | `OutfitItemCardView` / `OutfitSuggestionView` via `OutfitItemThumbnail` |
| Input sync | `useOutfitController` + `App.tsx` + `Sidebar.tsx` | `OutfitViewModel` + `MainFlowView` |
| Checkbox | `Sidebar.tsx` | `MainFlowView.swift` |

---

## API and contract

### Backend changes (orchestrator — done)

- [x] `backend/services/wardrobe_service.py` — `{category}_id` on random outfit
- [ ] Optional test: `backend/tests/test_wardrobe_random_outfit.py` (web/iOS agent or orchestrator)

### Client utils (use, do not duplicate)

| Web | iOS |
|-----|-----|
| `outfitItemThumbnail.ts` | `OutfitItemThumbnail.swift` |

---

## Tests (required)

### Web

- [x] `outfitItemThumbnail.test.ts` (orchestrator — keep green)
- [x] `OutfitPreview.test.tsx` — wardrobe thumbnails when ids absent but matching items present
- [x] `RandomFromHistory.integration.test.tsx` — left preview updates; item cards show wardrobe tags/thumbs
- [ ] New or extend: random from wardrobe integration — thumbnails not placeholder
- [x] `Sidebar.test.tsx` — checkbox for wardrobe-only (not switch role)

### iOS

- [ ] `MainFlowUxContractTests` or new `OutfitItemThumbnailTests` — fallback to first match
- [ ] `OutfitViewModelIntegrationTests` — random history/wardrobe clears `selectedImage`, sets preview state
- [ ] Add `OutfitItemThumbnail.swift` to `project.pbxproj`
- [ ] UITest: after random pick, result cards not all placeholder (if feasible)

---

## Parity checklist

- [x] Thumbnails show for random wardrobe + history on web
- [x] Left input preview replaces stale upload on web
- [x] Checkbox (not switch) for wardrobe-only on web
- [ ] Same labels and behavior
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated if needed

---

## Out of scope

- Changing Random from Wardrobe web endpoint (still wardrobe-only AI vs iOS random pick) — note as existing parity gap unless trivial to align
