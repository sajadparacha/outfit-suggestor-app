# Feature Spec: Wardrobe Insights — Shopping Actions Refinement

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-shopping-actions`  
**Status:** agents-complete (full-suite gate pending user confirm)

---

## User story

As a user reviewing Wardrobe Insights, I want to shop for recommended colors directly and see clear owned/missing stats per category — without outfit-generation buttons cluttering the screen.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Summary card | `frontend/src/views/components/insights/InsightSummaryCard.tsx` | `ios-client/OutfitSuggestor/Views/Insights/InsightSummaryCardView.swift` | Remove "Generate outfits using these gaps" |
| Top items cards | `frontend/src/views/components/insights/MissingItemCard.tsx` | `ios-client/OutfitSuggestor/Views/Insights/MissingItemCardView.swift` | Remove "Create outfits"; make Best colors clickable |
| Category accordion | `frontend/src/views/components/insights/CategoryDetailAccordion.tsx` | `ios-client/OutfitSuggestor/Views/Insights/CategoryDetailAccordionView.swift` | Show owned/missing stats in expanded details |
| Shopping helper | `frontend/src/utils/insightsHelpers.ts` | `ios-client/OutfitSuggestor/Views/Insights/InsightsSharedViews.swift` | Reuse Google Shopping URL pattern |
| Normalizer (iOS fix) | `frontend/src/utils/normalizeWardrobeInsight.ts` (already correct) | `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift` | Align category `details` with web |

### Flow

1. User completes wardrobe analysis and views results.
2. **Summary card** shows score, diagnosis, and top 3 priorities — **no** "Generate outfits using these gaps" button.
3. **Top items to add** cards show item name, priority, reason, best colors, works-with, and **Shop similar** only — **no** "Create outfits" button.
4. **Best colors** pills/swatches are tappable buttons. Tap opens Google Shopping in a new tab (web) or in-app browser/Safari (iOS) for that item's **category + selected color**.
   - Query pattern (reuse existing helper): `Show me men {category} in {style} style and {color} color` via `https://www.google.com/search?tbm=shop&q=...`
   - Use item category + tapped color; use style context from analysis (`filters.style` / `result.style`) when no per-item style list.
5. **Detailed category analysis** — expanded row shows owned/missing line for clothing categories:
   - `Owned: {n} colors, {m} styles. Missing: {x} colors, {y} styles.`
   - Web already sets this in normalizer; ensure it renders visibly in accordion body (above recommended next step).
   - iOS must update `NormalizeWardrobeInsight.buildCategoryHealth` / `defaultDetails` to match web for shirt/trouser/shoes/blazer/belt rows.
6. **Shop similar** on item cards and category accordion remains unchanged.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Best colors present | Each color pill is a button with hover/focus (web) or button style (iOS) | Label unchanged: "Best colors" |
| Best colors empty | No color row (existing) | — |
| Category expanded | Shows owned/missing stats + recommended next step + Shop similar (clothing only) | See flow step 5 |
| No outfit CTAs | Generate/Create outfit buttons absent | — |

---

## Visual / UX

- Remove primary gradient buttons for outfit generation from summary and item cards.
- Best color pills: add `cursor-pointer`, hover ring/focus ring (web); `Button` with `.buttonStyle(.plain)` (iOS).
- Keep "Shop similar" as secondary outlined button on item cards.
- Owned/missing line: regular body text, visible between accordion header content and "Recommended next step".

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, actions.
- Layout-only tweaks via `horizontalSizeClass` if needed.

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Client contract files to update

**Web**

- [ ] `frontend/src/utils/insightsHelpers.ts` — optional `openColorShoppingSearch(category, color, styleContext?)` if cleaner than inline `openShoppingSearch` call
- [ ] Component prop cleanup (remove `onGenerateOutfits`, `onCreateOutfits` where no longer needed)

**iOS**

- [ ] `ios-client/OutfitSuggestor/Utils/NormalizeWardrobeInsight.swift` — category details format
- [ ] `InsightsColorSwatchRow` — add tap handler with category + color
- [ ] Prop cleanup on insights views

---

## User-facing docs (About & Guide)

- [x] **Yes** — remove references to Generate/Create outfit from Insights; document clickable Best colors → Google Shopping
  - Guide: Remove "Generate outfits" / "Create outfits" bullets; add "Tap a best color to search Google Shopping for that category and color."
  - About: Update Wardrobe Insights bullet — shop via color taps and Shop similar; no outfit jump from insights.

---

## Tests (required)

### Backend (orchestrator)

- N/A

### Web (web agent)

- [ ] Update `frontend/src/views/components/insights/WardrobeInsightsComponents.test.tsx`
- [ ] Update `frontend/src/views/components/InsightsFlow.integration.test.tsx`
- [ ] Update `frontend/src/views/components/WardrobeGapAnalysis.test.tsx` if still referenced
- [ ] Cases:
  1. Summary card does **not** render "Generate outfits using these gaps"
  2. Missing item card does **not** render "Create outfits"
  3. "Shop similar" still present on missing item cards
  4. Best color pill click calls shopping search with category + color (mock `window.open`)
  5. Category accordion expanded body includes "Owned:" and "Missing:" stats for shirt category
  6. Guide/About no longer mention Generate/Create outfit from insights (if tested)

### iOS (iOS agent)

- [ ] Update `ios-client/OutfitSuggestorTests/WardrobeInsightsViewTests.swift`
- [ ] Update `ios-client/OutfitSuggestorTests/NormalizeWardrobeInsightTests.swift`
- [ ] Cases:
  1. `InsightsCopy` / view tests: no generate/create outfit CTAs in insights components
  2. Normalizer category health `details` matches `Owned: X colors, Y styles. Missing: X colors, Y styles.` for clothing categories
  3. Color swatch row builds correct Google Shopping URL for category + color (unit test helper)
  4. Shop similar button still expected on item cards

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms
- [ ] Outfit generation buttons removed on both platforms
- [ ] Best colors open Google Shopping on both platforms
- [ ] Category owned/missing stats on both platforms (clothing categories)
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated if needed
- [ ] New-behavior tests added (web + iOS)

---

## Out of scope

- Backend API changes
- Removing Shop similar
- Changing analysis preferences or score calculation
- Navigating to main outfit flow from insights (removed intentionally)
