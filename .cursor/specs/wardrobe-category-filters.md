# Feature Spec: Wardrobe Category Filters

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `wardrobe-category-filters`  
**Status:** done

---

## User story

As a user browsing my wardrobe, I want filter chips that reflect real clothing types (polo, T-shirt, jeans, etc.) so I can find items quickly, while outfit completion still uses the same five core slots.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe list filters | `frontend/src/views/components/Wardrobe.tsx` | `ios-client/OutfitSuggestor/Views/WardrobeListView.swift` | Expand filter chips; no API changes |
| Category display helpers | `frontend/src/utils/wardrobeCategory.ts` (new) or extend `insightsHelpers.ts` | `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` or new `WardrobeCategoryDisplay.swift` | Shared label maps + badge text |
| Wardrobe item cards | `Wardrobe.tsx` card badge | `WardrobeListView.swift` row badge | Show human-readable category for all stored types |

### Flow

1. User opens Wardrobe.
2. Filter chip row shows **All** plus core chips (always): Shirt, Trousers, Blazer, Shoes, Belt.
3. Additional chips appear **only when the user has items** in that exact stored category: Polo, T-shirt, Jeans, Shorts, Sweater, Jacket, Tie, Other (fallback for unrecognized types).
4. Tapping a chip filters the wardrobe list to matching items.
5. Item cards show a clean category badge (e.g. `Polo`, `T-shirt`, `Jeans`) instead of raw snake_case.
6. Outfit completion multi-select is **unchanged** — still five slots with existing aliases.

---

## Filter chip rules

### Core chips (always visible)

| Chip key | Label | Matches stored categories |
|----------|-------|---------------------------|
| `all` | All | everything |
| `shirt` | Shirt | `shirt`, `t_shirt`, `t-shirt`, `polo`, `tshirt`, `tee` |
| `trouser` | Trousers | `trouser`, `trousers`, `pants`, `jeans`, `shorts` |
| `blazer` | Blazer | `blazer`, `jacket`, `jackets`, `suit` |
| `shoes` | Shoes | `shoe`, `shoes` |
| `belt` | Belt | `belt`, `belts` |

### Extended chips (visible only when count > 0)

| Chip key | Label | Matches (exact normalized) |
|----------|-------|----------------------------|
| `polo` | Polo | `polo` |
| `t_shirt` | T-shirt | `t_shirt`, `t-shirt`, `tshirt` |
| `jeans` | Jeans | `jeans` |
| `shorts` | Shorts | `shorts` |
| `sweater` | Sweater | `sweater`, `sweaters` |
| `jacket` | Jacket | `jacket`, `jackets` |
| `tie` | Tie | `tie`, `ties` |
| `other` | Other | items not matching any core group **and** not matching any extended explicit type above |

**Count rules**

- Core chip counts: grouped totals (e.g. Shirt count includes polo + t_shirt + shirt).
- Extended chip counts: exact stored category counts from wardrobe summary / item list.
- `Other` count: remainder per rule above.
- Extended chips with count 0 are **hidden** (except `Other` — show only when count > 0).

**Filter behavior**

- Selecting an extended chip filters to that exact type only (e.g. Polo shows only `polo` items, not all shirts).
- Selecting a core chip uses grouped matching (e.g. Shirt shows shirt + polo + t_shirt).
- iOS: keep client-side filtering on loaded items (limit 100).
- Web: use `summary.by_category` for chip visibility/counts; for grouped core filters that API cannot express in one `category=` param, filter client-side on loaded items (load without category or use exact API param only for extended chips). Do not change backend.

---

## Category display (badges)

Human-readable labels for all stored types:

| Stored (normalized) | Badge label |
|---------------------|-------------|
| `shirt` | Shirt |
| `polo` | Polo |
| `t_shirt`, `t-shirt`, `tshirt` | T-shirt |
| `trouser`, `trousers`, `pants` | Trousers |
| `jeans` | Jeans |
| `shorts` | Shorts |
| `blazer` | Blazer |
| `jacket`, `jackets` | Jacket |
| `shoes`, `shoe` | Shoes |
| `belt`, `belts` | Belt |
| `sweater`, `sweaters` | Sweater |
| `tie`, `ties` | Tie |
| anything else | `prettyLabel(category)` or "Other" |

Export a single helper on each platform, e.g. `wardrobeCategoryLabel(category: string)`.

---

## Outfit completion — unchanged

Do **not** add new completion slots. Keep existing aliases:

- `polo`, `t_shirt`, `t-shirt` → shirt slot
- `jeans`, `shorts` → trouser slot
- `jacket` → blazer slot

Web: `COMPLETE_OUTFIT_SLOT_ALIASES` in `Wardrobe.tsx` — leave as-is.  
iOS: `WardrobeCompletionSlot.normalized(from:)` — leave as-is.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No items in extended category | Hide that extended chip | — |
| Empty wardrobe | Existing empty state | Unchanged |
| Zero-count chip tap (iOS) | Reset to All + toast | Existing `showCategoryInfoToast` pattern |
| Filter active | Highlight active chip | Unchanged chip styling |

---

## Visual / UX

- Chip row wraps on narrow screens; same chip styling as today.
- Extended chips appear after core chips, before Other (when visible).
- Card category badge uses display helper — no raw `t_shirt` or `capitalize()` on snake_case.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical chips, labels, filter behavior.
- **Layout-only** adjustments via `horizontalSizeClass` / adaptive width only.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only (client-side filter logic and display maps)

### Client contract files to update

**Web**

- [ ] `frontend/src/utils/wardrobeCategory.ts` (new — preferred) or `insightsHelpers.ts`
- [ ] `frontend/src/views/components/Wardrobe.tsx`

**iOS**

- [ ] `ios-client/OutfitSuggestor/Models/WardrobeModels.swift` or `Utils/WardrobeCategoryDisplay.swift`
- [ ] `ios-client/OutfitSuggestor/Views/WardrobeListView.swift`

---

## User-facing docs (About & Guide)

- [x] **Yes** — describe expanded wardrobe filters; clarify outfit completion still uses 5 core slots.

| Platform | Update |
|----------|--------|
| Web About | Mention expanded filters (polo, T-shirt, jeans, etc.) in wardrobe section |
| Web Guide | Wardrobe step: note category filters include specific clothing types |
| iOS About | Same copy intent as web |
| iOS Guide | Same copy intent as web |

---

## Tests (required)

### Backend (orchestrator)

- N/A — no backend changes

### Web (web agent)

- [ ] Unit: `frontend/src/utils/wardrobeCategory.test.ts` (if new util file)
- [ ] Update: `frontend/src/views/components/Wardrobe.test.tsx`
- [ ] Update: `frontend/src/views/components/WardrobeMultiSelect.integration.test.tsx`
- [ ] Cases:
  - Extended chips render when `summary.by_category` has matching counts; hidden when 0
  - Core chips always render (All, Shirt, Trousers, Blazer, Shoes, Belt)
  - Chip labels: Polo, T-shirt, Jeans, Shorts, Sweater, Jacket, Tie, Other
  - Card badge shows `T-shirt` for `t_shirt` category
  - Outfit completion aliases still work (polo → shirt slot) — no regression
  - Guide/About mention expanded filters (if tests exist)

### iOS (iOS agent)

- [ ] `ios-client/OutfitSuggestorTests/WardrobeCategoryFilterTests.swift` (new) or extend `WardrobeCardUxTests.swift`
- [ ] Cases:
  - `wardrobeCategoryLabel` / display helper returns correct labels
  - Filter option list includes extended types when items exist
  - `matchesCategoryFilter` / count logic: grouped core vs exact extended
  - `other` bucket only for unrecognized types
  - Completion slot normalization unchanged for polo/jeans/jacket

---

## Parity checklist

- [x] Same chip labels and filter behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Card badges use display helpers on both platforms
- [x] Outfit completion unchanged (5 slots, same aliases)
- [x] Insights and main outfit result cards untouched
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend / API category filter changes
- Insights screens (`WardrobeInsights*`, shopping list category labels in insights context)
- Main outfit suggestion result cards
- New outfit completion slots
- Wardrobe add/edit form category dropdown changes (unless needed for badge consistency only)
