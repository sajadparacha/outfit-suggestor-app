# Feature Spec: Optional outfit layers on main flow result

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `optional-outfit-layers`  
**Status:** done

---

## User story

As a user viewing an outfit suggestion, I want optional layering items (sweater, outerwear/jacket, tie) shown when the AI recommends them for the occasion and season, so I get complete styling guidance without cluttering the core five-slot result when they are not needed.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Main result | `frontend/src/views/components/OutfitPreview.tsx` | `ios-client/OutfitSuggestor/Views/OutfitSuggestionView.swift` | Core 5 cards unchanged; optional section below |
| Copy | `mainFlowUxCopy.ts` | `MainFlowUxCopy.swift` | `alsoWearSection`, category labels |

### Flow

1. User generates outfit (main flow) — API may return optional `sweater`, `outerwear`, `tie` (+ optional `*_id`).
2. Result shows Shirt, Trousers, Blazer, Shoes, Belt cards as today.
3. If any optional field is non-null/non-empty, show collapsible **Also wear** section (or equivalent) with Layer / Outerwear / Tie cards using same source tags and thumbnails.
4. Refine / Generate Another preserves optional-field behavior via same API (AI may include or omit layers per occasion/season).

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Success (core only) | 5 cards only | — |
| Success (with layers) | 5 cards + expanded/collapsible **Also wear** | Section title: `Also wear` |
| Optional card labels | Layer (sweater), Outerwear (jacket), Tie | Same source tags as core items |

---

## Visual / UX

- Core 5 item cards unchanged (layout, tags, thumbnails).
- Optional items in a **collapsible** section titled **Also wear** (default expanded when any optional field present).
- Same card pattern: thumbnail, short name, one-line reason, source tag (From wardrobe / AI Suggested / From upload — upload only if ever matched; typically wardrobe or AI).
- Theme: existing dark slate + brand gradient.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class (grid spacing / width caps).

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Single-column optional cards inside disclosure |
| iPad / regular width | Same disclosure; optional grid may use 2 columns |

---

## API and contract

### Backend changes needed?

- [x] Yes — extend `OutfitSuggestion` response

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/suggest-outfit` | Returns optional sweater, outerwear, tie + ids |
| POST | `/api/suggest-outfit-from-wardrobe` | Same shape (optional fields; not required for 5-slot completion) |
| GET | `/api/outfit-history` | Includes optional fields when persisted |

### Response fields (nullable)

| Field | Description |
|-------|-------------|
| `sweater` | Optional layer (merino, cardigan, etc.) |
| `outerwear` | Optional coat/jacket **distinct from blazer** |
| `tie` | Optional tie for formal/business occasions |
| `sweater_id`, `outerwear_id`, `tie_id` | Wardrobe PK when logged in and AI selects wardrobe item |

### Wardrobe category mapping (matching)

| Wardrobe category | Outfit field |
|-------------------|--------------|
| `sweater` | `sweater` |
| `jacket` | `outerwear` |
| `tie` | `tie` |
| `blazer` | `blazer` (core slot — unchanged) |

### Client contract files to update

**Web**

- [x] `frontend/src/models/OutfitModels.ts`
- [x] `frontend/src/services/ApiService.ts` (if mapping needed)

**iOS**

- [x] `ios-client/OutfitSuggestor/Models/OutfitModels.swift`
- [x] `ios-client/OutfitSuggestor/Services/APIService.swift` (if mapping needed)

**Docs**

- [x] `docs/main-flow-ux-contract.md`

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| `alsoWearSection` | Also wear | `mainFlowUxCopy.ts` | `MainFlowUxCopy.swift` |
| Optional labels | Layer, Outerwear, Tie | same | same |

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `UserGuide.tsx`, `About.tsx` |
| iOS | `UserGuideView.swift`, `AboutView.swift` |

- [x] **Yes** — describe optional layering on result:
  - Guide: After generating, core outfit shows five pieces; AI may also suggest a sweater, coat/jacket, or tie when relevant.
  - About: Mention optional layering suggestions on results (five core slots unchanged).

---

## Platform-specific notes

### Web only

- `OutfitPreview.test.tsx` + main flow integration tests

### iOS only

- `OutfitSuggestionViewTests.swift`

---

## Tests (required)

### Backend (orchestrator)

- [x] `backend/tests/test_outfit_endpoints.py` — response schema accepts optional fields
- [x] `backend/tests/test_ai_service_optional_layers_parsing.py` — `_parse_response` optional fields + ids
- [x] `backend/tests/test_outfit_history_item_ids_persistence.py` — extend for optional fields when columns exist
- [x] Wardrobe matcher tests for sweater/jacket/tie mapping

### Web (web agent)

- [ ] `OutfitPreview.test.tsx` — optional fields render when present, hidden when null
- [ ] Main flow integration — optional section visibility

### iOS (iOS agent)

- [ ] `OutfitSuggestionViewTests.swift` — same assertions

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Same copy (`Also wear`, Layer, Outerwear, Tie)
- [ ] API client models match
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated
- [ ] New-behavior tests added (web + iOS)
- [ ] Full suite pass — orchestrator end gate

---

## Out of scope

- **Random outfit** and **wardrobe-complete-outfit** — remain 5 core slots only; optional fields not required on those endpoints (documented here).
- Changing core blazer slot semantics.
- Wardrobe completion slot count (still 5).
