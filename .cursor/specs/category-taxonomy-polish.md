# Feature Spec: Category Taxonomy Polish

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `category-taxonomy-polish`  
**Status:** done

---

## User story

As a user browsing wardrobe insights and shopping lists, I want category labels, Google Shopping queries, and wardrobe→insights category mapping to be consistent so jacket items count as jackets (not blazers), sweater gaps show correctly, and shopping search uses clear men's category phrases with clean display labels.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Shopping list labels | `frontend/src/utils/insightsHelpers.ts` | `ios-client/OutfitSuggestor/Utils/WardrobeInsightShoppingList.swift` | `cleanShoppingItemLabel` |
| Google Shopping URLs | `insightsHelpers.ts` (`buildShoppingSearchUrl`, `buildSearchAllUrl`, `buildComboSearchUrl`) | `WardrobeInsightShoppingList.swift` (`buildShoppingSearchURL`, `searchAllURL`, `comboSearchURL`) | Category-specific possessive phrases |
| Wardrobe filter counts | `frontend/src/utils/wardrobeCategory.ts` | `ios-client/OutfitSuggestor/Utils/WardrobeCategoryDisplay.swift` | Jacket not grouped under blazer chip |
| Insights normalization | `frontend/src/utils/normalizeWardrobeInsight.ts` | `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift` | No client remap jacket→blazer |
| Docs | `IOS_WEB_FEATURE_PARITY.md`, `docs/main-flow-ux-contract.md` | — | Orchestrator updates |

### Flow

1. User runs Wardrobe Insights → coverage dashboard shows jacket and blazer as separate rows with correct `item_count` from API.
2. Shopping list rows show canonical category labels (e.g. "Sweater" not "Merino Sweater Sweater").
3. Tap Search online / combo chips → Google Shopping query uses `men's sweater`, `men's jacket`, `men's tie`, etc.
4. Wardrobe list: blazer filter chip counts only blazer/suit; jacket chip counts jacket items only.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| AI junk item name | Prefer category display label when name is duplicate, single-word category echo, or non-taxonomy term (e.g. dress, gown) | Category label from iteration-2 set |
| Valid descriptive name | Keep deduped pretty name when it adds info beyond category | e.g. "Oxford Shirt" when category is shirt |
| Shopping search | Query template uses possessive `men's` + category phrase | `Show me men's sweater in …` |

---

## Visual / UX

- No layout changes; label and URL behavior only.
- iPhone / iPad: identical UX (no size-class behavior change).

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad.

---

## API and contract

### Backend changes needed?

- [x] No — client-only (backend `wardrobe_service._normalize_category` already keeps jacket distinct from blazer; gap analysis counts are correct).
- [ ] Yes — only if implementation discovers a backend alias bug (orchestrator handles + pytest).

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| Gap / insights categories (iteration 2) | shirt, trouser, blazer, sweater, jacket, shoes, belt (+ tie formal) | `insightsHelpers.ts` `CATEGORY_ORDER` | `NormalizeWardrobeInsight.swift` `categoryOrder` |
| Shopping gender prefix | `men's` (hardcoded this iteration) | `insightsHelpers.ts` | `WardrobeInsightShoppingList.swift` |
| Future flag | `REACT_APP_SHOPPING_GENDER` / `AppConfig.shoppingGenderPrefix` — document only; do not implement preference UI this iteration | — | — |

### Label normalization rules (`cleanShoppingItemLabel`)

Implement consistently on web + iOS:

1. **Dedupe words** (existing): collapse repeated tokens case-insensitively.
2. **Category echo**: if raw name is only category word(s) or repeats category ≥2 times → return `CATEGORY_DISPLAY_LABELS[category]`.
3. **Non-taxonomy junk**: if name matches known non-clothing terms (`dress`, `gown`, `skirt`, `gown`, etc.) OR normalized name has zero overlap with iteration-2 category vocabulary → return category display label (fallback `prettyLabel(category)`).
4. **Short generic names**: single non-category word with ≤3 total words where that word is a color/material only → prefer category label.
5. **Prefer category over raw AI `itemName`** in shopping list row `cleanLabel` / `item` when name fails taxonomy match (rules 3–4).

### Google Shopping query template

Replace bare `men` with possessive **`men's`** and use `categoryForSearch` phrases:

| Category | Search phrase fragment |
|----------|------------------------|
| sweater | `men's sweater` |
| jacket | `men's jacket` |
| tie | `men's tie` |
| shirt | `men's shirts` |
| trouser | `men's trousers` |
| blazer | `men's blazers` |
| shoes | `men's shoes` |
| belt | `men's belts` |

**Combo URL:** `Show me men's {categoryPhrase} in {style} style and {color} color`  
**Search-all URL:** `Show me men's {categoryPhrase} {comboPhrase}` — **no redundant item label** (align iOS with web; remove extra `itemLabel` in iOS `searchAllURL` if present).

Document in spec comments: gender prefix stays `men's` unless product owner adds `REACT_APP_SHOPPING_GENDER` / `AppConfig` later.

### Wardrobe → Insights alignment

- **Remove** `jacket`, `jackets` from blazer **filter chip** matchers (`CORE_GROUP_MATCHERS` / `coreGroupMatchers`). Blazer chip counts `blazer`, `blazers`, `suit` only.
- **Keep** jacket in extended matchers and `WardrobeCompletionSlot` / outfit-completion aliases (jacket → blazer slot for 5-slot completion unchanged).
- Do **not** add new categories beyond iteration-2 set.
- Insights rows consume API `analysis_by_category` keys as-is; no client remap of jacket→blazer.

---

## User-facing docs (About & Guide)

- [x] **No** — internal label/search normalization; no new user-facing flows or capability copy.

---

## Platform-specific notes

### Web only

- `categoryForSearch`, `cleanShoppingItemLabel`, `buildShoppingSearchUrl` in `insightsHelpers.ts`
- `wardrobeCategory.ts` blazer matcher trim

### iOS only

- Mirror helpers in `WardrobeInsightShoppingList.swift`
- `WardrobeCategoryDisplay.swift` blazer matcher trim

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- [ ] Skipped unless backend touched
- [ ] Cases: jacket `item_count` separate from blazer in gap analysis (already covered in `test_wardrobe_service.py`)

### Web (web agent)

- [ ] Unit: `frontend/src/utils/insightsHelpers.test.ts`
- [ ] Unit: `frontend/src/utils/wardrobeCategory.test.ts`
- [ ] Unit: `frontend/src/utils/normalizeWardrobeInsight.test.ts` (if category mapping assertions added)
- [ ] Cases:
  - `cleanShoppingItemLabel('Merino Sweater Sweater', 'sweater')` → `Sweater`
  - `cleanShoppingItemLabel('Summer Dress', 'shirt')` → `Shirt` (category preferred over junk)
  - `cleanShoppingItemLabel('field jacket', 'jacket')` → `Jacket` or deduped sensible label per rules
  - `buildShoppingSearchUrl('sweater', …)` decoded query contains `men's sweater`
  - `buildShoppingSearchUrl('jacket', …)` contains `men's jacket`
  - `buildShoppingSearchUrl('tie', …)` contains `men's tie`
  - Blazer filter count excludes jacket items; jacket filter count includes jacket items (`wardrobeCategory.test.ts`)
  - Shopping list rows use `cleanLabel` from category when AI name is junk

### iOS (iOS agent)

- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeInsightShoppingListTests.swift`
- [ ] Unit: `ios-client/OutfitSuggestorTests/WardrobeCategoryFilterTests.swift`
- [ ] Unit: `ios-client/OutfitSuggestorTests/NormalizeWardrobeInsightTests.swift` (if needed)
- [ ] Cases:
  - Mirror web `cleanShoppingItemLabel` cases
  - Combo/search-all URLs contain `men's sweater` / `men's jacket` / `men's tie`
  - `searchAllURL` parity with web (no duplicate item label in query)
  - Blazer chip count excludes jacket; jacket chip includes jacket
  - `WardrobeCompletionSlot.normalized(from: "jacket")` still `.blazer` (completion unchanged)

### End of Twin UI — confirm, then full suites + report (orchestrator)

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

---

## Parity checklist

- [x] Same `cleanShoppingItemLabel` behavior on web and iOS
- [x] Same Google Shopping query templates (`men's` + category phrase)
- [x] Wardrobe blazer chip does not count jackets on either platform
- [x] Outfit completion jacket→blazer slot unchanged
- [x] `IOS_WEB_FEATURE_PARITY.md` updated (taxonomy / shopping query notes)
- [x] `docs/main-flow-ux-contract.md` updated (category taxonomy cross-ref if needed)
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- New wardrobe categories beyond iteration-2 set
- User preference / `REACT_APP` flag implementation (document only)
- About / Guide copy updates
- Backend API changes (unless bug found)
- iPad-specific UX differences
