# Feature Spec: Outerwear upload fallback copy (Cost Twin UI)

**Branch:** `feature/api-response-size`
**Slug:** `outerwear-upload-fallback-copy`
**Status:** done

---

## Goal

When a user uploads a jacket/coat photo, the outerwear card currently reads
`Your wardrobe jacket (uploaded item)` — no colour, no material, and the
"(uploaded item)" hint makes it read like a *different* jacket the AI invented.
Replace it with a real description, and never emit "(uploaded item)".

Target copy, in priority order:

| Available info | Copy |
|----------------|------|
| Wardrobe `description` | use it verbatim (e.g. `Navy wool overcoat`) |
| Wardrobe `color` only | `Your wardrobe overcoat — Navy` |
| Nothing known (fresh photo) | `The jacket in your photo` / `The coat in your photo` |

The AI prompt must also ask for the uploaded piece's colour + material in the
`outerwear` description instead of `null`.

---

## Files

**Backend (orchestrator)**

- `backend/services/ai_service.py` — upload prompt guidance + `_apply_source_wardrobe_constraints`
- `backend/controllers/outfit_controller.py` — `_apply_upper_body_layer_exclusivity` (l.188), `_apply_similar_upload_category_override` (l.365), `_reconcile_outerwear_upload_slot` (l.426), `_apply_source_wardrobe_match_overrides` (l.79-86)

**Web (web agent only)**

- `frontend/src/utils/outfitLayerExclusivity.ts` (l.86 fallback)
- `frontend/src/controllers/useOutfitController.ts` (l.343 fallback)

**iOS (iOS agent only)**

- `ios-client/OutfitSuggestor/Utils/OutfitLayerExclusivity.swift` (l.75 fallback)
- `ios-client/OutfitSuggestor/Utils/OutfitUploadCategory.swift` (l.157)
- `ios-client/OutfitSuggestor/Views/OutfitItemCardView.swift` (l.183)

---

## Rules

- No user-visible string may contain `uploaded item` / `uploaded image` / `your upload` after this change. Those markers stay valid only for *detecting* legacy text (`UPLOAD_TEXT_MARKERS`, `outfitItemThumbnail.ts` markers, `OutfitUploadCategory.swift` markers).
- Detection helpers (`text_suggests_outerwear`, `slot_text_has_upload_marker`, `resolveUploadCategory`) must keep recognising **old stored history** strings, so do not delete the marker lists.
- Standalone photo upload with no wardrobe match must still render an outerwear card (thumbnail = the upload) — do not make it disappear.
- iPhone and iPad identical; no layout change.

---

## About / Guide

- [x] **No** — item description copy only; no flow or capability change.

---

## Tests (required — one file per platform)

**Backend**

- [x] `backend/tests/test_outerwear_upload_fallback.py`
  - [x] jacket source with description → description used, no `(uploaded item)`
  - [x] jacket source with colour but no description → `Your wardrobe jacket — <color>`
  - [x] fresh upload, nothing known → `The jacket in your photo`
  - [x] `_apply_upper_body_layer_exclusivity` on an anchored upload never emits the old placeholder
  - [x] `clean_upload_marker_text` keeps real content around a marker; rejects bare placeholders

**Web**

- [x] `frontend/src/utils/outfitLayerExclusivity.test.ts`
  - [x] fallback returns `The jacket in your photo` (not `(uploaded item)`)
  - [x] existing real outerwear text still wins
  - [x] `From your upload — navy bomber jacket` → `navy bomber jacket`

**iOS**

- [x] `ios-client/OutfitSuggestorTests/OutfitLayerExclusivityTests.swift`
  - [x] same assertions as web (18 cases)

Commands:

```bash
cd backend && pytest tests/test_outerwear_upload_fallback.py -q
cd frontend && npm test -- --watchAll=false src/utils/outfitLayerExclusivity.test.ts
xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:OutfitSuggestorTests/OutfitLayerExclusivityTests
```

---

## Out of scope

- Changing the "Also wear" card layout or the `AI Suggested` tag.
- Rewriting already-saved outfit history text.
- Random-from-wardrobe behaviour (already fixed in `db20350`).
