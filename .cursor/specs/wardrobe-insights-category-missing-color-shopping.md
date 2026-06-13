# Feature Spec: Category Accordion — Missing Color Shopping with Styles

**Branch:** `feature/wardrobe-insights-ui-ux`  
**Slug:** `wardrobe-insights-category-missing-color-shopping`  
**Status:** in-progress

---

## User story

When I tap a **Missing colors** chip in **Detailed category analysis**, Google Shopping should search for that **category + color + missing styles** for that category (e.g. beige shirt + oxford, linen, overshirt).

---

## Scope

**Web only** (`frontend/**`)

---

## Change

In `CategoryDetailAccordion.tsx`, for missing color chips pass:
- `stylesToTry={item.missingStyles.map(prettyLabel)}` (or raw strings — match openShoppingSearch formatting)
- Keep `fallbackStyle={styleContext}` when missingStyles empty (Colors aggregate row)

Do NOT change owned color chips (readOnly).

---

## Tests

Update `WardrobeInsightsComponents.test.tsx`:
- Expand shirt category, click missing color chip
- Assert `window.open` URL includes color AND missing style names (e.g. oxford, linen)

Run full frontend tests.

---

## Out of scope

- iOS (separate if needed)
- Top items cards (already passes worksWith styles)
