# Feature Spec: Wardrobe completion preferences + one-per-slot selection

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-completion-preferences`  
**Status:** done

---

## User story

As a logged-in user completing an outfit from wardrobe pieces, I want to pick occasion, season, style, and notes (and wardrobe-only mode) directly on the Wardrobe screen — and select at most one item per outfit slot — so I can tailor the AI completion without switching to Suggest first.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe multi-select panel | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` | Selection + preferences + complete CTA |
| Shared preferences component | `frontend/src/views/components/AnalysisPreferences.tsx` (`variant="sidebar"`) | `ios-client/OutfitSuggestor/Views/FiltersView.swift` | Reuse existing Suggest/Insights prefs UI |
| Outfit controller / VM | `frontend/src/controllers/useOutfitController.ts` | `ios-client/OutfitSuggestor/ViewModels/OutfitViewModel.swift` | Prefs state already exists; wire into completion |

### Flow

1. User opens **Wardrobe** (logged in).
2. User sees **Complete an outfit from selected wardrobe pieces** panel with:
   - Instructions: select 1–5 items across different slots (shirt, trousers, blazer, shoes, belt).
   - Live status: e.g. `2 selected: shirt, trousers` or `No items selected`.
   - **Preferences** section (matches attached screenshot / Suggest sidebar):
     - Collapsible header **Preferences** (expanded by default when user has items selected or is in selection mode).
     - Shared hint: `Shared with Suggest — occasion, season, style, and notes stay in sync across outfit suggestions and wardrobe insights.`
     - Grid: **Occasion**, **Season**, **Style**, **Notes** (Notes shows `Has notes` when non-empty).
     - **Use my wardrobe only** checkbox (auth only) with helper `Only recommend items from your saved wardrobe.`
   - **Complete outfit with AI** (enabled when ≥1 item selected) and **Clear selection**.
3. User taps item cards to toggle selection. **Only one item per slot** — selecting a second shirt shows `Choose one item per outfit slot` and does not replace the first unless user deselects first.
4. User adjusts preferences (optional); values sync with global Suggest preferences (`localStorage` / persisted filters on web; `OutfitViewModel` on iOS).
5. User taps **Complete outfit with AI** → API `POST /api/suggest-outfit-from-wardrobe` with `occasion`, `season`, `style`, `text_input`, `selected_wardrobe_item_ids`.
6. Result shown on Suggest / main flow (existing behavior); selection cleared.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No selection | Complete CTA disabled | `Select at least 1 item` (button label) / `No items selected` (status) |
| 1+ selected | CTA enabled | `Complete outfit with AI` |
| Duplicate slot tap | Reject second item in same slot | `Choose one item per outfit slot` |
| Max 5 slots filled | Reject 6th | `Choose up to 5 items` (web) / `Select up to 5 items` (iOS) |
| Ineligible category | No toggle | `This item is not eligible for outfit completion.` (web) / `This item cannot be used to complete an outfit.` (iOS) |
| Loading | Disable CTA | `Completing your outfit...` |
| Preferences | Shared with Suggest | Same labels/options as Suggest sidebar |

---

## Visual / UX

- Place **Preferences** card **between** search bar and completion action panel (or integrated above Complete CTA inside the completion card — match web screenshot layout: completion header + prefs + actions).
- Match Suggest **Preferences** styling: dark card, 4-column filter grid on wide screens, checkbox last.
- Selection summary lists slot names (trouser → `trousers` in copy).
- Theme: dark slate, blue-purple gradient accents.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad.
- Layout-only: adaptive grid / width caps via `horizontalSizeClass`.

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Stacked prefs grid (2 cols) |
| iPad / regular width | 4-column prefs grid; same flows |

---

## API and contract

### Backend changes needed?

- [x] No — UI-only; endpoint already accepts preference fields + `selected_wardrobe_item_ids`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/suggest-outfit-from-wardrobe` | Complete outfit from selected wardrobe IDs + prefs |

### Client contract files to update

**Web**

- [ ] `frontend/src/views/components/Wardrobe.tsx` — prefs UI + props
- [ ] `frontend/src/App.tsx` — pass filters/preferenceText/useWardrobeOnly into Wardrobe `outfitController`

**iOS**

- [ ] `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` — prefs UI in completion panel
- [ ] `ios-client/OutfitSuggestor/Views/MainTabView.swift` — pass VM bindings to WardrobeListView

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| Duplicate slot error | `Choose one item per outfit slot` | `Wardrobe.tsx` | `WardrobeModels.swift` |
| Shared prefs hint | `Shared with Suggest — occasion, season, style, and notes stay in sync...` | `AnalysisPreferences.tsx` | `InsightsCopy.swift` / `FiltersView` |

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [x] **Yes** — describe prefs on Wardrobe completion:
  - Guide: Step for multi-select — mention setting occasion/season/style/notes on Wardrobe before **Complete outfit with AI**; one item per slot.
  - About: Wardrobe bullet — prefs available inline when completing outfit from multiple pieces.

---

## Platform-specific notes

### Web only

- Reuse `AnalysisPreferences` with `variant="sidebar"`, `showSharedHint`, `showWardrobeOnly` when authenticated.
- Persist prefs via existing `useOutfitController` / `persistOutfitPreferences`.

### iOS only

- Reuse `FiltersView` inside completion panel when `isCompletionSelectionMode` (or always visible when completion feature enabled).
- Bind `$viewModel.filters`, `$viewModel.preferenceText`, `$viewModel.useWardrobeOnly`.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- N/A — no backend changes.

### Web (web agent)

- [ ] Unit: `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Integration: `frontend/src/views/components/WardrobeMultiSelect.integration.test.tsx`
- [ ] Cases:
  - Preferences section renders on Wardrobe when items exist (Occasion, Season, Style, Notes labels).
  - Changing occasion before complete sends updated `occasion` in API body.
  - Duplicate slot still blocked with `Choose one item per outfit slot`.
  - Selection summary shows slot names (`2 selected: shirt, trousers`).
  - `Use my wardrobe only` checkbox visible when authenticated.

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeCardUxTests.swift` and/or new `WardrobeCompletionPreferencesTests.swift`
- [ ] Cases:
  - `WardrobeMultiSelectState` duplicate slot returns `.duplicateSlot` with correct message.
  - `WardrobeListView` / presentation helper exposes preferences in completion panel (accessibility ids or copy contract).
  - Completion API call includes filters from ViewModel (extend `OutfitViewModelIntegrationTests` if needed).

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Same copy and error messages
- [x] Equivalent loading / empty / error UI
- [x] API client methods match on both platforms
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend API changes
- Changing Suggest-page preferences layout
- iPad-only navigation or features
