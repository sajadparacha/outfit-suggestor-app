# Feature Spec: Wardrobe Insights — Owned & Missing Details

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-owned-missing-details`  
**Status:** in-progress

---

## User story

As a user expanding a category in **Detailed category analysis**, I want to see **which** colors and styles I own vs. what's missing — not only counts — so I know exactly what to shop for.

---

## Screens and flows

| Screen / area | Web location | iOS location |
|---------------|--------------|--------------|
| Category accordion (expanded) | `CategoryDetailAccordion.tsx` | `CategoryDetailAccordionView.swift` |
| Data model | `WardrobeInsightResult.ts` | `WardrobeInsightResult.swift` |
| Normalizer | `normalizeWardrobeInsight.ts` | `NormalizeWardrobeInsight.swift` |
| Chip components (reuse) | `InsightColorChip.tsx`, `InsightStyleChip.tsx` | `InsightsSharedViews.swift` |

### Expanded category body (clothing: shirt, trouser, shoes, blazer, belt)

Keep existing **count summary** line:
`Owned: 6 colors, 12 styles. Missing: 1 colors, 4 styles.`

Add four subsections below it (uppercase muted labels, same typography as Top items cards):

| Section | Content | Interaction |
|---------|---------|-------------|
| **Owned colors** | Color chips (swatch + label) | Display only |
| **Missing colors** | Color chips | Clickable → Google Shopping for category + color |
| **Owned styles** | Blue style chips | Display only |
| **Missing styles** | Blue style chips | Display only |

Empty states (when array empty):
- Owned colors: "No colors detected yet."
- Missing colors: "You already have enough core colors in this category."
- Owned styles: "No style keywords detected yet."
- Missing styles: "Your style coverage looks balanced for this category."

Then **Recommended next step** and **Shop similar** (unchanged).

### Aggregate rows (Colors / Styles)

**Colors** (`id: colors`):
- Count summary in `details` (keep or align with clothing format using aggregated counts)
- **Missing colors** chips from aggregated unique missing colors across categories
- **Owned colors** chips from aggregated unique owned colors across categories (optional empty state)
- No style subsections (or hide when empty)

**Styles** (`id: styles`):
- **Missing styles** chips from aggregated unique missing styles
- **Owned styles** chips from aggregated unique owned styles across categories
- No color subsections (or hide when empty)

---

## Model change (both platforms)

Extend `WardrobeCategoryHealth` / `WardrobeInsightCategoryHealth`:

```typescript
ownedColors: string[]
ownedStyles: string[]
missingColors: string[]
missingStyles: string[]
```

Populate in normalizer from `analysis_by_category[category]` for clothing rows.

For `colors` aggregate:
- `ownedColors`: unique union of all `owned_colors` across clothing categories
- `missingColors`: unique union of all `missing_colors`
- `ownedStyles` / `missingStyles`: `[]`

For `styles` aggregate:
- `ownedStyles`: unique union of all `owned_styles`
- `missingStyles`: unique union of all `missing_styles`
- `ownedColors` / `missingColors`: `[]`

Keep existing `details` count string for clothing categories.

---

## API and contract

- [x] No backend changes — data already in `WardrobeGapAnalysisResponse.analysis_by_category`

---

## User-facing docs (About & Guide)

- [x] **No** — expands existing accordion content; no new flows

---

## Tests (required)

### Web
- [ ] `normalizeWardrobeInsight.test.ts` — category health includes inventory arrays
- [ ] `WardrobeInsightsComponents.test.tsx` — expanded shirt row shows owned/missing color & style chips

### iOS
- [ ] `NormalizeWardrobeInsightTests.swift` — inventory arrays populated
- [ ] `WardrobeInsightsViewTests.swift` — category health has arrays

---

## Parity checklist

- [ ] Same four subsections on clothing categories (web + iOS)
- [ ] Missing color chips open Google Shopping
- [ ] Aggregate Colors/Styles rows show appropriate chip lists
- [ ] Count summary line retained

---

## Out of scope

- Backend API changes
- Making style chips clickable
