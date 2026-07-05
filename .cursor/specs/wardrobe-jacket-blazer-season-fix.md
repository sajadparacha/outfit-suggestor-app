# Feature Spec: Wardrobe jacket / blazer / coat + summer outfits

**Branch:** `feature/wardrobe-jacket-blazer-season-fix`  
**Slug:** `wardrobe-jacket-blazer-season-fix`  
**Status:** in-progress

---

## User story

As a user, I want casual jackets and coats kept separate from structured blazers, and summer outfit suggestions that skip heavy outerwear, so recommendations match real wardrobe categories and warm weather.

---

## Backend

| File | Change |
|------|--------|
| `wardrobe_ai_service_hf.py` | Blazer ≠ generic jacket; coat separate; bomber → jacket |
| `outfit_controller.py` | Jacket/coat → outerwear optional; no blazer slot fill |
| `ai_service.py` | No jacket→blazer aliases; summer wardrobe filter + prompts |
| `wardrobe_season_rules.py` | Extend summer blocklist (coat, heavy jacket) |
| `wardrobe_service.py` | Coat/jacket distinct from blazer in normalization |

---

## Web (agent)

| File | Change |
|------|--------|
| `wardrobeCategory.ts` | Blazer chip excludes jackets; jacket + coat chips/form |
| `Wardrobe.tsx` | Complete-outfit slots: jacket/coat unsupported |
| `UserGuide.tsx` / `About.tsx` | Blazer vs outerwear copy; summer note |

---

## iOS (agent)

| File | Change |
|------|--------|
| `WardrobeCategoryDisplay.swift` | Parity with web chips/labels |
| `WardrobeModels.swift` | Completion slot normalization |
| `WardrobeFormView.swift` | Form categories |
| `UserGuideView.swift` / `AboutView.swift` | Copy parity |

**About / Guide:** Yes — brief blazer vs jacket/coat + summer outerwear note.

---

## Tests (required)

### Backend (orchestrator)
- [ ] HF: "bomber jacket" → jacket; "sport coat" → blazer
- [ ] Controller: jacket/coat not blazer slot; outerwear optional
- [ ] Summer: heavy coat/parka/wool blazer excluded from AI wardrobe payload

### Web
- [ ] Blazer filter chip excludes casual jackets
- [ ] Jacket + coat in chips and form
- [ ] Complete-outfit: jacket/coat unsupported slots

### iOS
- [ ] Parity with `wardrobeCategory.ts` (WardrobeCategoryFilterTests)

**Run:** targeted only — no full suites unless user asks.

---

## Bug fix: Style from wardrobe — jacket on Blazer card (Cost Twin UI)

**Root cause:** `POST /api/suggest-outfit` with `source_wardrobe_item_id` did not pass `source_wardrobe_category` to AI; client preferred `source_slot` over wardrobe category.

### Backend (orchestrator)
- [x] `suggest_outfit`: load source item; pass category to `get_outfit_suggestion()`
- [x] Do not let AI `source_slot` overwrite `upload_matched_category` when source item known
- [x] `_apply_source_wardrobe_match_overrides`: jacket/coat → outerwear matches

### Web
- [x] `useOutfitController`: priority `sourceWardrobeItem.category` → `upload_matched_category` → `source_slot`
- [x] Upload thumbnail on Outerwear, not Blazer, for jacket source

### iOS
- [x] `OutfitViewModel`: normalize `upload_matched_category` from source wardrobe item
- [x] `OutfitItemCardSourceTag`: prefer `upload_matched_category` over text heuristics

**About / Guide:** skip (bug fix)

---

## Upper-body layer exclusivity (jacket ↔ blazer)

**Rule:** Jacket/coat upload → no blazer card, no extra sweater; blazer upload → no outerwear/sweater optional layers.

### Backend
- [x] `_apply_upper_body_layer_exclusivity` in outfit_controller (after matching)
- [x] AI constraints: blazer source clears outerwear/sweater; jacket source clears blazer text + sweater

### Web + iOS
- [x] `outfitLayerExclusivity.ts` / `OutfitLayerExclusivity.swift` — hide blazer card, filter optional layers
