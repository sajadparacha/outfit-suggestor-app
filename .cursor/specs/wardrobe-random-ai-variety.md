# Feature Spec: AI Random from Wardrobe + Session Variety

**Branch:** `feature/random-history-diverse-selection`  
**Slug:** `wardrobe-random-ai-variety`  
**Status:** done

---

## User story

As a logged-in user, I want **Random from Wardrobe** to use AI (not DB random picks) on both web and iOS, with session variety so repeated clicks suggest different outfits — so styling respects occasion/season/style and feels fresh within a session.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Random from Wardrobe button | `Sidebar.tsx` | `MainFlowView.swift` | Auth required |
| Result + Generate Another | `OutfitPreview.tsx` / controller | `OutfitSuggestionView` / `OutfitViewModel` | Same as today |
| Loading | controller | `OutfitViewModel` | **"Scanning your wardrobe…"** |

### Flow

1. User taps **Random from Wardrobe** (logged in).
2. Client calls **`POST /api/suggest-outfit-from-wardrobe`** with occasion, season, style, notes from Preferences; empty `selected_wardrobe_item_ids`.
3. If user already has a wardrobe-random result showing, pass **`previous_outfit_text`** (formatted prior outfit). Optionally pass **`avoid_outfit_texts`** for other recent session fingerprints.
4. On duplicate fingerprint vs recent session list → retry up to **3** attempts with stronger “must be different” context.
5. Show result: thumbnails, caption **"Random from wardrobe"**, Generate Another, Refine, etc.
6. **Generate Another** on wardrobe-random result repeats step 2–5 with `previous_outfit_text`.
7. Reset session fingerprint list on: logout, main-flow reset, **filter change** (occasion/season/style).

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | AI wardrobe call | `Scanning your wardrobe...` |
| Error | Show message | Existing auth/API errors |
| Success | Outfit cards + preview | Caption: `Random from wardrobe` |

---

## Visual / UX

- No layout changes — behavior/copy alignment only.
- **Stop using** `GET /api/wardrobe/random-outfit` for user-facing Random from Wardrobe on iOS (endpoint may remain for tests/admin).

### iPhone / iPad (iOS)

- Same UX on all devices; layout-only tweaks via `horizontalSizeClass` if needed.

---

## API and contract

### Backend changes needed?

- [x] Yes — extend wardrobe-only request with variety fields

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/suggest-outfit-from-wardrobe` | AI wardrobe outfit (both platforms) |
| GET | `/api/wardrobe/random-outfit` | **Deprecated for user flows** — keep for tests |

### Request body (`WardrobeOnlyOutfitRequest`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `occasion` | string | yes | From preferences |
| `season` | string | yes | From preferences |
| `style` | string | yes | From preferences |
| `text_input` | string | no | Notes |
| `selected_wardrobe_item_ids` | int[] | no | Empty for random |
| `previous_outfit_text` | string | no | Prior outfit for “different” prompt |
| `avoid_outfit_texts` | string[] | no | Short list of recent outfits to avoid |

### Client contract files to update

**Web**

- [x] `frontend/src/services/ApiService.ts` — pass new fields
- [x] `frontend/src/controllers/useOutfitController.ts` — session variety + AI path (already AI; add variety)
- [x] New util: `frontend/src/utils/wardrobeRandomSession.ts` (fingerprints, retry) — keep in sync with iOS

**iOS**

- [x] `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` — request fields
- [x] `ios-client/OutfitSuggestor/Services/APIService.swift` — `getWardrobeOnlySuggestion` or extend POST helper
- [x] `ios-client/OutfitSuggestor/ViewModels/OutfitViewModel.swift` — replace `getRandomOutfit` with AI call + session
- [x] New util: `ios-client/OutfitSuggestor/Utils/WardrobeRandomSession.swift` — mirror web

### Shared constants

| Name | Value | Web file | iOS file |
|------|-------|----------|----------|
| `RECENT_WARDROBE_RANDOM_COUNT` | 5 | `wardrobeRandomSession.ts` | `WardrobeRandomSession.swift` |
| `WARDROBE_RANDOM_MAX_RETRIES` | 3 | same | same |

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide: one line — Random from Wardrobe uses **AI** to combine items from your wardrobe (not random DB picks).
  - About: align if it implies non-AI random selection.

---

## Platform-specific notes

### Web only

- Session state in `useOutfitController` ref (in-memory; reset on logout via existing reset hooks).
- Reuse `formatPreviousOutfitForPrompt` from `outfitPromptUtils.ts`.
- Reuse fingerprint logic pattern from `randomHistorySelection.ts` — add `suggestionFingerprint(s: OutfitSuggestion)` or share helper.

### iOS only

- `WardrobeRandomSession` on `OutfitViewModel`; reset in `resetSessionState` and on filter changes.
- Reuse `RandomHistorySelection.outfitFingerprint` pattern for suggestions (may add `suggestionFingerprint` on `OutfitSuggestion`).

---

## Tests (required)

### Backend (orchestrator)

- [x] Test file: `backend/tests/test_outfit_endpoints.py`, `backend/tests/test_ai_prompt_wardrobe_contract.py`
- [x] Cases:
  - `previous_outfit_text` accepted on POST `/api/suggest-outfit-from-wardrobe`
  - Mock AI receives `previous_outfit_text` in text-only path
  - `avoid_outfit_texts` included in prompt when set
  - Wardrobe-only + `previous_outfit_text` includes alternative block in prompt

### Web (web agent)

- [ ] Unit: `frontend/src/utils/wardrobeRandomSession.test.ts`
- [ ] Unit: `frontend/src/services/ApiService.test.ts` — wardrobe-only sends `previous_outfit_text`
- [ ] Integration: `frontend/src/views/components/RandomFromWardrobe.integration.test.tsx` — passes previous on Generate Another; retry on duplicate fingerprint (mock)
- [ ] Cases:
  - Session tracks fingerprints; resets on filter change
  - `getRandomSuggestion` passes `previous_outfit_text` when current result is wardrobe-random
  - Generate Another passes previous outfit

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeRandomSessionTests.swift`
- [ ] Update: `OutfitViewModelIntegrationTests.swift` — expects AI POST not GET random-outfit
- [ ] Update: `APIServiceIntegrationTests.swift` — random wardrobe uses POST suggest-outfit-from-wardrobe
- [ ] Cases:
  - `getRandomFromWardrobe` calls wardrobe-only AI endpoint
  - Session retry on duplicate fingerprint
  - Generate Another uses previous outfit text

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Same loading copy
- [ ] API client methods match on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate
- [x] Full backend pytest pass

---

## Out of scope

- Removing `GET /api/wardrobe/random-outfit` endpoint entirely
- History deck algorithm changes
- Guest/unauthenticated Random from Wardrobe (stays auth-only)
