# Feature Spec: Wardrobe Insights — Top Items Chip Styling

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-chip-styling`  
**Status:** in-progress

---

## User story

As a user viewing **Top items to add**, I want color and style boxes to match the established Insights chip design (category insight cards) — rounded rectangles with color swatches and blue style chips — so the section feels consistent with the rest of the analysis UI.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Top items cards | `frontend/src/views/components/insights/MissingItemCard.tsx` | `ios-client/OutfitSuggestor/Views/Insights/MissingItemCardView.swift` | Restyle chips only |
| Shared chip helpers | New or extend `insights/` components + `insightsHelpers.ts` | `InsightsSharedViews.swift` | Reuse across platforms |

### Target visual (reference: legacy category insight cards + screenshot)

**Color chips (Best colors)**
- Shape: `rounded-lg` / 8pt corner radius — **not** fully rounded pills (`rounded-full`)
- Background: dark slate (`bg-slate-900/50` web; `Color.white.opacity(0.06)` iOS)
- Border: subtle `border-white/15`
- Content: small color circle swatch + **white/primary** label text
- Clickable → Google Shopping (existing `openColorShoppingSearch` / `InsightsShoppingSearch.openColor`) — behavior unchanged

**Style chips (Works with → chip row)**
- Replace comma-separated "Works with" text with individual **style chips** in a flex/wrap row
- Section label stays **Works with** (do not rename to "Styles to try" on this card)
- Chip style: light brand-blue tint — `border-brand-blue/25 bg-brand-blue/10 text-brand-blue/90` (web); matching accent soft tint on iOS
- Shape: `rounded-lg` / 8pt, same padding as color chips
- Optional: style chips non-clickable (display only) unless easy to wire to shopping — **display-only is OK** for this pass

**Unchanged**
- Card title, priority badge, reason text, Shop similar button
- Section header typography (uppercase muted label)

---

## API and contract

- [x] No backend changes

---

## User-facing docs (About & Guide)

- [x] **No** — visual/layout only; shopping behavior unchanged

---

## Tests (required)

### Web
- [ ] Update `WardrobeInsightsComponents.test.tsx`
- Cases:
  1. Best color chips use `rounded-lg` (not `rounded-full`)
  2. Works with renders as multiple chip elements (not single comma string)
  3. Color chip click still opens shopping URL

### iOS
- [ ] Update `WardrobeInsightsViewTests.swift` if needed
- Cases:
  1. Missing item card renders style chips for worksWith items
  2. Color swatch row retains tap accessibility identifiers

---

## Parity checklist

- [ ] Same chip shapes and colors on web and iOS
- [ ] Works with shown as chips on both platforms
- [ ] Best colors remain clickable → Google Shopping

---

## Out of scope

- Renaming section labels
- Category accordion styling
- New shopping behavior for style chips
