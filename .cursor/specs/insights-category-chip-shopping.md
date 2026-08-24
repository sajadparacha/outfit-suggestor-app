# Feature Spec: Category accordion — shop from missing chips

**Branch:** `feature/insights-lifestyle-preferences`  
**Slug:** `insights-category-chip-shopping`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

In **Detailed category analysis**, shopping happens from missing chips — not from a category-level next-step or Shop similar control.

- Each **missing color** chip opens Google Shopping with that **color** as the color parameter.
- Each **missing style** chip opens Google Shopping with that **style** as the style parameter.
- Remove **Recommended next step** text and the accordion **Shop similar** button from every category section.
- Leave **Top items to add** and **Shopping list** Shop similar unchanged.
- Owned color/style chips stay non-clickable.

## User story

As a user expanding a category, I want to tap a missing color or missing style and land on Google Shopping for that category + that color or style, without a separate next-step line or Shop similar button.

## File paths

**Backend:** none (UI-only)

**Web (web agent — only these + one test file)**

- `frontend/src/views/components/insights/CategoryDetailAccordion.tsx`
- `frontend/src/views/components/insights/InsightStyleChip.tsx`
- `frontend/src/utils/insightsHelpers.ts` (only if a style-search helper is needed; prefer existing `openShoppingSearch` / `openColorShoppingSearch`)
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- **One test file:** `frontend/src/views/components/insights/WardrobeInsightsComponents.test.tsx`

**iOS (iOS agent — only these + one test file)**

- `ios-client/OutfitSuggestor/Views/Insights/CategoryDetailAccordionView.swift`
- `ios-client/OutfitSuggestor/Views/Insights/InsightsSharedViews.swift` (`InsightsStyleChipRow`, `InsightsShoppingSearch`)
- `ios-client/OutfitSuggestor/Utils/InsightsCopy.swift` (Guide/About strings if needed)
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift`
- **One test file:** `ios-client/OutfitSuggestorTests/WardrobeInsightsViewTests.swift`

Read only listed files; no full-repo search.

---

## Screens and flows

| Screen / area | Web | iOS |
|---------------|-----|-----|
| Category accordion expanded body | `CategoryDetailAccordion.tsx` | `CategoryDetailAccordionView.swift` |
| Missing color chip | `InsightColorChip` (already a button; keep) | `InsightsColorSwatchRow` (already interactive when category is set; keep) |
| Missing style chip | `InsightStyleChip` — make clickable for missing only | `InsightsStyleChipRow` — add shopping like color row |
| Top items Shop similar | Do not change | Do not change |

### Shopping query (reuse existing helpers)

Google Shopping URL already used:

`https://www.google.com/search?tbm=shop&q=Show me men's {category} in {style} style and {color} color`

| Chip | Parameters |
|------|------------|
| Missing color | category = row id (e.g. `shirt` → `shirts`); colors = `[tappedColor]`; styles = that category’s missing styles if already passed today, else fallback style context / classic |
| Missing style | category = row id; styles = `[tappedStyle]`; colors default (`neutral`) via existing helper |

Owned chips: no `window.open` / no `openURL`.

Do **not** render:

- The “Recommended next step:” label or `item.recommendedStep` / `category.recommendedStep`
- The accordion “Shop similar” button (web has it today; iOS accordion does not — keep it absent)

### iPhone / iPad

Same UX. Layout/spacing only via `horizontalSizeClass`.

---

## About / Guide

**Required: yes** — user-visible shopping path in category analysis changed.

- Guide: say to tap a **missing color** or **missing style** chip in Detailed category analysis to search Google Shopping. Keep Shop similar as Top items / Shopping list only.
- About: one short line if Insights copy still implies a category-level shop CTA; otherwise keep existing Insights bullet and rely on Guide.

---

## API and contract

- [x] No — UI-only

---

## Tests (required)

### Web — `WardrobeInsightsComponents.test.tsx`

- Expand shirt: missing color chip is a button; click opens Google Shopping URL with `tbm=shop`, shirts, and that color.
- Expand shirt: missing style chip is a button; click opens Google Shopping URL with `tbm=shop`, shirts, and that style (e.g. oxford).
- Expand shirt (or sweater): no “Recommended next step” text; no Shop similar button inside the accordion details.
- Owned color/style chips are not buttons (or do not call `window.open`).
- Keep / adjust existing missing-color shopping assertion; **replace** the sweater-row Shop similar accordion test (that button is gone).

Run: `cd frontend && npm test -- --watchAll=false src/views/components/insights/WardrobeInsightsComponents.test.tsx`

### iOS — `WardrobeInsightsViewTests.swift`

- `InsightsShoppingSearch.buildSearchURL` (or new style helper) for a missing style includes `tbm=shop`, category phrase, and the style name.
- Missing-color URL still includes the tapped color (existing test can stay).
- Copy/Guide: category analysis shopping is described as tapping missing color/style chips; Shop similar copy remains for top items.
- Assert accordion does not require `recommendedNextStepLabel` in the expanded category UI (copy may remain in `InsightsCopy` unused, or be removed if unused).

Run targeted: `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/WardrobeInsightsViewTests`

Also build: `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`

---

## Out of scope

- Shopping list and Top items cards / Shop similar
- Backend gap ranking, owned vs missing overlap, shirts missing from shopping list (separate Cost Twin UI)
- `IOS_WEB_FEATURE_PARITY.md` (no new capability vs existing chip shopping)

---

## Parity checklist

- [x] Missing color chip → Google Shopping with that color (web + iOS)
- [x] Missing style chip → Google Shopping with that style (web + iOS)
- [x] No recommended next step in category accordion (web + iOS)
- [x] No Shop similar in category accordion (web + iOS)
- [x] Top items Shop similar unchanged
- [x] About/Guide updated both platforms (web About + Guide; iOS Guide; iOS About unchanged — no category-level shop CTA there)
- [x] Tests added and run (targeted Cost Twin UI files only)
