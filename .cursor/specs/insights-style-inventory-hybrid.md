# Feature Spec: Insights style inventory hybrid

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-style-inventory-hybrid`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

Rules-based `STYLE_LIBRARY` is the source of truth for owned/missing styles on both Quick Check and AI Stylist. AI ranks those missing tags for the user's lifestyle mix and writes shopping-list / next-step copy from that list. AI must not invent or replace the inventory.

## User story

As a user running Insights, I want an honest catalog of owned vs missing wardrobe styles, with AI only telling me which missing tags matter most for my life — not a different invented list.

---

## File paths

**Backend (orchestrator)**

- `backend/controllers/wardrobe_controller.py`
- `backend/services/wardrobe_service.py`
- `backend/services/ai_service.py`
- `backend/models/wardrobe_schemas.py`
- `backend/tests/test_wardrobe_service.py` (extend as needed)
- `backend/tests/test_ai_service_premium_wardrobe_gaps.py` (extend as needed)
- **Primary tests:** `backend/tests/test_wardrobe_gap_inventory.py` (new)

**Web (web agent — only these + one test file)**

- `frontend/src/utils/normalizeWardrobeInsight.ts`
- `frontend/src/views/components/insights/CategoryDetailAccordion.tsx`
- `frontend/src/views/components/insights/InsightStyleChip.tsx`
- `frontend/src/utils/insightsCopy.ts`
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- Allowed contract/view-model if required: `frontend/src/models/WardrobeModels.ts`, `frontend/src/models/WardrobeInsightResult.ts`
- **One test file:** `frontend/src/utils/normalizeWardrobeInsight.test.ts`

**iOS (iOS agent — only these + one test file)**

- `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift`
- `ios-client/OutfitSuggestor/Views/Insights/CategoryDetailAccordionView.swift`
- `ios-client/OutfitSuggestor/Utils/InsightsCopy.swift`
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift`
- Allowed contract/view-model if required: `ios-client/OutfitSuggestor/Models/WardrobeModels.swift`, `ios-client/OutfitSuggestor/Models/WardrobeInsightResult.swift`
- **One test file:** `ios-client/OutfitSuggestorTests/NormalizeWardrobeInsightTests.swift`

Read only listed files; no full-repo search.

---

## API and contract

`POST /api/wardrobe/analyze-gaps`

Always compute `owned_styles` / `missing_styles` from `WardrobeService.STYLE_LIBRARY` + description aliases (same as free analysis).

- `missing_styles` = **full catalog diff** (not a truncated AI subset).
- Per category optional `style_priorities`: `{ "<library tag>": "Essential" | "Useful" | "Skip" }` covering missing tags.
- Premium: pass that inventory into the ChatGPT prompt. Model may only tag missing styles Essential / Useful / Skip. It cannot add styles outside the library.
- Shopping list `recommendedStyles` and recommended next step use ranked library tags only.
- Weak descriptions = **not evidenced**, not “you don’t own it”.
- If AI fails, keep the same inventory (today’s free fallback).
- Rank using lifestyle mix (primary is core; secondary mix is supporting, max 3) + dress code. Work / smart-casual must not treat silk tie and bomber as equal Essential peers.

Clients already consume `analysis_by_category.*.owned_styles` / `missing_styles`. Add optional `style_priorities` on each category object.

---

## UI (web + iOS — same UX)

- Styles accordion and per-category missing styles: keep the honest chips.
- Default: show **priority missing only** (about 8–12, Essential first). **Show all** reveals the full catalog (e.g. 32).
- Owned styles unchanged. Do not hide the audit behind AI copy.
- Shopping list / recommended next step use ranked library tags only.
- iPhone and iPad: same flows/copy; layout-only via `horizontalSizeClass`.

Copy:

- Show control: `Show all` / `Show priority` (or `Show fewer`).
- Do not imply AI invented the missing-style list.

### iPhone / iPad

Same UX. Layout-only width/spacing via `horizontalSizeClass`.

---

## User-facing docs (About & Guide)

- [x] **Yes**
  - Guide: Insights styles come from a wardrobe catalog; AI ranks what to buy next.
  - About: same. Do **not** say AI invents missing styles.

---

## Tests (required)

### Backend (orchestrator)

- [x] `tests/test_wardrobe_gap_inventory.py`
  - [x] Free and premium return the same owned/missing catalog for a fixture wardrobe
  - [x] Premium shopping list `recommendedStyles` only uses library tags
  - [x] Mix / dress-code ranking: work + smart-casual does not treat silk tie and bomber as equal Essential peers
  - [x] Weak description tags are “not evidenced” inventory (catalog missing), not AI-invented names

### Web (one file)

- [x] `normalizeWardrobeInsight.test.ts`
  - Default missing-style list is priority-only (Essential first, ~8–12)
  - Show-all path / helper exposes the full catalog
  - Owned styles stay intact; shopping-list styles stay on library tags

### iOS (one file)

- [x] `NormalizeWardrobeInsightTests.swift`
  - Same as web: priority preview vs full catalog; owned unchanged; shopping list library-only

---

## Out of scope

- Suggest pickers
- Lifestyle form
- Calendar seasons
- Full test suites (Cost Twin UI — targeted tests only)
- `IOS_WEB_FEATURE_PARITY.md` (no new capability; ranking of existing catalog)
