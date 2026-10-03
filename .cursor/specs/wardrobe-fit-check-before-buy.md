# Spec (short): Check before you buy — Phase 2 of wardrobe fit

**Branch:** `feature/wardrobe-fit-improvements`
**Slug:** `wardrobe-fit-check-before-buy`
**Builds on:** `.cursor/specs/wardrobe-fit-evaluate.md` (Phase 1 — fit panel/sheet, copy helpers, API client method)
**Mode:** Cost Twin UI

## Goal

On the main upload screen, a logged-in user can evaluate an uploaded/taken photo against their wardrobe **without saving it**.

## Flow

1. User uploads/takes a photo on the main screen.
2. Secondary action **Check before you buy** shown next to **Get suggestion** (only when an image is present).
   - Guest → existing login gate (same as other wardrobe AI actions).
3. Loading: `Checking how this would fit your wardrobe…`
4. Call existing `POST /api/wardrobe/analyze-image` (same multipart as Add-to-wardrobe analyze) → `category`, `color`, `description`.
5. Call existing `POST /api/wardrobe/evaluate-fit` with attribute-only candidate:
   `{ "category", "color", "description", "dress_code": "smart-casual", "lifestyle_mix": ["work","everyday"], "primary_lifestyle": "work", "style_primary": "classic" }` — **no `wardrobe_item_id`**.
   - `color` may be empty/null (backend now accepts category-only; 400 only if category missing).
6. Reuse Phase 1 fit result panel/sheet. Candidate thumb = **the uploaded local image** (response `candidate.image_data` is null and `candidate.id` is null).
   - Hide/disable actions that require an owned item id (e.g. "Get outfit with this item").
7. Secondary action in result: **Add to wardrobe** → opens existing add-to-wardrobe flow prefilled with the image + analyzed category/color/description (do not auto-save). Item is NOT saved unless user completes that flow.
8. Errors (analyze or evaluate failure): existing `Couldn’t evaluate this piece. Try again.` + Retry.

## Backend

No new endpoint. Gap fixed by orchestrator: attribute candidate no longer requires `color`. Tests in `backend/tests/test_wardrobe_evaluate_fit.py` (`TestWardrobeEvaluateFitAttributeCandidate`). **22 passed.**

## Copy (shared)

| Key | Copy |
|-----|------|
| Action | `Check before you buy` |
| Loading | `Checking how this would fit your wardrobe…` |
| Result secondary | `Add to wardrobe` |
| Error | `Couldn’t evaluate this piece. Try again.` (existing) |

## Files

**Web:** `frontend/src/views/components/ImageUpload.tsx` (+ main flow host), `wardrobe/WardrobeFitPanel.tsx` (accept attribute candidate + local image + onAddToWardrobe), `services/ApiService.ts`, `utils/wardrobeFitCopy.ts`, `UserGuide.tsx`, `About.tsx`. MSW handler if needed.

**iOS:** `Views/ImageUploadView.swift` / `MainFlowView.swift`, `Views/WardrobeFitResultSheet.swift`, `ViewModels/WardrobeFitEvaluateViewModel.swift`, `Services/APIService.swift`, `Utils/WardrobeFitEvaluateCopy.swift`, `UserGuideView.swift`, `AboutView.swift`.
iPhone/iPad: identical UX; layout/spacing via `horizontalSizeClass` only.

## About & Guide — Yes (both platforms)

- Guide: main screen — "Check before you buy": upload a photo of a piece you're considering to see what it pairs with and what's missing; it's not saved unless you tap Add to wardrobe.
- About: one capability line. **iOS AboutView must also gain the Phase 1 "How this fits" line** (Phase 0/1 gap).

## Tests (required — one file per platform)

### Backend (orchestrator) — done
- [x] Attribute candidate: id null, pairs counted vs full wardrobe, not saved, redundant, strong_fit, no-color accepted, missing category 400.

### Web — `frontend/src/views/components/WardrobeFitEvaluate.integration.test.tsx`
- [x] Authed + image → "Check before you buy" visible; guest → login gate
- [x] Click → analyze-image then evaluate-fit called with attribute body (no `wardrobe_item_id`); loading copy shown
- [x] Result panel shows counts + uploaded image thumb; "Add to wardrobe" shown; "Get outfit with this item" hidden
- [x] Error → error copy + Retry

### iOS — `OutfitSuggestorTests/WardrobeFitEvaluateTests`
- [x] Copy constants (action, loading)
- [x] ViewModel check-before-buy: analyze → evaluate request has no `wardrobe_item_id`, success sets result + local image
- [x] ViewModel error path (analyze failure and evaluate failure)
- [x] Request encoding omits `wardrobe_item_id` for attribute candidate

## Out of scope
Auto-saving, shopping links changes, Week Planner, batch evaluate.

## Results (targeted)
- Backend: `pytest tests/test_wardrobe_evaluate_fit.py -q` — 22 passed
- Web: `npm test -- --watchAll=false WardrobeFitEvaluate` — 14 passed (button lives in `Sidebar.tsx`; `ImageUpload.tsx` is not rendered in the main flow)
- iOS: `-only-testing:OutfitSuggestorTests/WardrobeFitEvaluateTests` — 22 passed
- Parity: `IOS_WEB_FEATURE_PARITY.md` updated; About + Guide updated both platforms (iOS About now includes How this fits)
