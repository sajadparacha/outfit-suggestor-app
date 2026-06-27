# Feature Spec: Wardrobe Selected-Item Complete Outfit

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-multi-item-complete-outfit`  
**Status:** in-progress

---

## User story

As a logged-in user, I want to select one or more wardrobe items, such as one shirt, a shirt and trouser, or a blazer and shirt, and ask AI to complete the rest of the outfit so that the result keeps my chosen pieces and fills missing slots.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe list / item cards | `frontend/src/views/components/Wardrobe.tsx` and related wardrobe components/controllers | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` and related view models/services | Add multi-select mode and "Complete outfit" action. |
| Suggest result | Existing result components | Existing result views | Reuse existing outfit result shape and `matching_wardrobe_items`. |

### Flow

1. User opens Wardrobe while logged in.
2. User selects 1 to 5 eligible outfit-slot items.
3. User taps/clicks **Complete outfit with AI**.
4. Client posts selected wardrobe IDs plus preferences to `/api/suggest-outfit-from-wardrobe`.
5. AI must keep the selected items in their slots and generate recommendations for missing slots.
6. Result opens in the existing suggestion/result UI with selected items shown in `matching_wardrobe_items`.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Empty | No wardrobe items: show existing empty wardrobe state | Unchanged |
| Selection disabled | Auth required or unsupported item category | Existing auth behavior; unsupported items are not selectable for completion |
| No items selected | Disable action until at least one eligible item is selected | `Select at least 1 item` |
| Duplicate slot | Do not allow two selected items for the same outfit slot | `Choose one item per outfit slot` |
| Loading | Existing AI loading UI | `Completing your outfit...` |
| Success | Existing result UI displays completed outfit | `Complete outfit with AI` action returns full outfit |
| Error | Existing error surface | Backend error copy where applicable |

---

## Visual / UX

- Add an explicit multi-select affordance in Wardrobe, not hidden behind the existing single-item overflow action.
- Selected items should show a clear checked/selected state.
- The action should be available when 1 or more valid, unique-slot items are selected.
- Keep existing single-item **Style this item** behavior.
- The result should reuse the existing suggestion/result layout; do not create a separate result screen.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class are allowed.
- **No** iPad-specific navigation, screens, or feature differences.

---

## API and contract

### Backend changes needed?

- [ ] No — UI-only
- [x] Yes — extend existing wardrobe-only suggestion request

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/suggest-outfit-from-wardrobe` | Existing wardrobe-only suggestion endpoint. Add support for `selected_wardrobe_item_ids`. |

### Request body

```json
{
  "occasion": "work",
  "season": "all-season",
  "style": "smart-casual",
  "text_input": "Optional notes",
  "selected_wardrobe_item_ids": [12, 34]
}
```

### Backend behavior

- Requires authenticated user.
- `selected_wardrobe_item_ids` is optional for backwards compatibility.
- When present:
  - Must contain at least 1 ID.
  - Must contain no more than 5 IDs.
  - Every ID must belong to the current user.
  - Every selected item must map to one supported outfit slot: `shirt`, `trouser`, `blazer`, `shoes`, `belt`.
  - Slot aliases must be accepted:
    - `shirt`: `shirt`, `shirts`, `polo`, `t_shirt`, `t-shirt`, `tshirt`, `tee`
    - `trouser`: `trouser`, `trousers`, `pant`, `pants`, `jeans`, `shorts`
    - `blazer`: `blazer`, `blazers`, `jacket`, `jackets`
    - `shoes`: `shoes`, `shoe`
    - `belt`: `belt`, `belts`
  - Only one selected item is allowed per outfit slot.
  - AI prompt must instruct the model to keep selected pieces exactly and complete missing slots.
  - Response must preserve selected item IDs in the matching outfit slot ID fields (`shirt_id`, `trouser_id`, etc.) and include the selected items in `matching_wardrobe_items`.

### Client contract files to update

**Web**

- [x] `frontend/src/services/ApiService.ts`
- [x] `frontend/src/controllers/...`
- [x] `frontend/src/views/components/...`
- [x] `frontend/src/models/...` if request typing requires it

**iOS**

- [x] `ios-client/OutfitSuggestor/Services/APIService.swift`
- [x] `ios-client/OutfitSuggestor/ViewModels/...`
- [x] `ios-client/OutfitSuggestor/Views/...`
- [x] `ios-client/OutfitSuggestor/Models/...` if request typing requires it

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [ ] **No** — layout/styling only; no change to flows or copy users read in Guide/About
- [x] **Yes** — describe what to update:
  - Guide: explain selecting one or more wardrobe items and completing the outfit with AI.
  - About: mention AI can complete outfits around selected wardrobe pieces if feature lists wardrobe capabilities.

---

## Platform-specific notes

### Web only

- Preserve existing single-card actions and wardrobe filters.
- Add tests for selecting one item and multiple items and sending `selected_wardrobe_item_ids` to the API.

### iOS only

- Keep iPhone and iPad behavior identical.
- Do not use iPad-only navigation for multi-select.

---

## Tests (required)

### Backend (orchestrator — API/business logic changes)

- [x] Test file: `backend/tests/test_outfit_endpoints.py`
- [x] Cases:
  - Authenticated request with one selected item returns 200, pins the selected ID to the correct response slot, and includes the selected item in `matching_wardrobe_items`.
  - Authenticated request with two selected items returns 200, pins selected IDs to the correct response slots, and includes selected items in `matching_wardrobe_items`.
  - Alias categories like `polo` and `t_shirt` pin to `shirt`; `pants` and `jeans` pin to `trouser`.
  - Unauthenticated selected-item request returns 401.
  - Selected item not owned by current user returns 404.
  - Duplicate selected outfit slot returns 400.

### Web (web agent)

- [x] Unit/integration tests for wardrobe multi-select.
- [x] Cases:
  - Complete action is disabled until at least one valid item is selected.
  - Alias categories like polo/T-shirt are eligible as shirts and pants/jeans are eligible as trousers.
  - Selecting one item calls `/api/suggest-outfit-from-wardrobe` with `selected_wardrobe_item_ids`.
  - Selecting two unique-slot items calls `/api/suggest-outfit-from-wardrobe` with `selected_wardrobe_item_ids`.
  - Duplicate slot selection is prevented or clearly surfaced.
  - Result flow reuses existing suggestion/result display.
  - Guide/About updates are covered when copy tests exist.

### iOS (iOS agent)

- [x] Unit/integration tests for API request encoding and wardrobe multi-select state.
- [x] Cases:
  - Multi-select state tracks selected IDs and unique slots.
  - Alias categories like polo/T-shirt are eligible as shirts and pants/jeans are eligible as trousers.
  - Request body includes `selected_wardrobe_item_ids`.
  - Action is disabled until at least one valid item is selected.
  - Guide/About updates are covered when copy tests exist.

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Backend | `cd backend && DATABASE_URL='sqlite:///:memory:' . venv/bin/activate && DATABASE_URL='sqlite:///:memory:' pytest tests/test_outfit_endpoints.py -q` |
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `cd ios-client && xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`; run new `OutfitSuggestorTests` classes |

### End of Twin UI — confirm, then full suites + report (orchestrator)

Orchestrator **asks user to confirm** before running these (full suites take several minutes):

| Layer | Command |
|-------|---------|
| Backend | `cd backend && DATABASE_URL='sqlite:///:memory:' . venv/bin/activate && DATABASE_URL='sqlite:///:memory:' pytest -q` |
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `cd ios-client && xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

After user confirms, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Same copy and error messages
- [x] Equivalent loading / empty / error UI
- [x] API client methods match on both platforms
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (backend + web + iOS)
- [ ] Full web suite pass (`npm test -- --watchAll=false`) — orchestrator end gate
- [ ] Full iOS suite pass (`xcodebuild test` OutfitSuggestorTests + UITests) — orchestrator end gate
- [ ] Full backend pytest pass

Targeted verification so far:
- Backend: `DATABASE_URL='sqlite:///:memory:' pytest tests/test_outfit_controller_ai_selected_ids_injection.py tests/test_outfit_endpoints.py -q` passed, 33 tests.
- Web: `npm test -- --watchAll=false --passWithNoTests` passed, 53 suites / 319 tests.
- iOS: alias support already present for `polo`, `t_shirt`, `t-shirt`, `pants`, `jeans`, and `shorts`; `git diff --check -- ios-client` passed; `xcodebuild` is unavailable in this Linux environment.

---

## Out of scope

- Combining uploaded image and selected wardrobe items in the same request.
- Selecting unsupported categories like tie/suit/sweater for this completion flow.
- Persisting a new selected-item ID list column in history; selected slot IDs already persist where applicable.
