# Outfit completion UX clarity (Cost Twin UI)

**Branch:** `feature/outfit-completion-ux-clarity`
**Workflow:** Cost Twin UI (short spec)
**Backend:** none
**About / Guide:** Guide yes (button wording changes). About: only if it quotes old card button copy.

## Goal

Naive users don't understand the wardrobe card button "Add to outfit completion". Make the multi-select "complete an outfit" flow self-explanatory with goal-oriented labels, plain panel copy, and a sticky selection bar that shows what happens next.

## Behavior / copy (identical on web and iOS)

1. **Wardrobe card toggle button** (replaces "Add to outfit completion" family):
   - Not selected, eligible: `+ Use in outfit`
   - Selected: `✓ In outfit`
   - Not eligible: `Can't be used in outfits`
   - Accessibility labels: `Use <category> in outfit` / `Remove <category> from outfit` (web aria-label; iOS accessibilityLabel). Not-eligible: `<category> can't be used in outfits`.
   - Remove the separate "✓ Selected" badge on the card (button already conveys state). Keep selected card highlight styling.
2. **Completion panel copy:**
   - Title: `Build an outfit around pieces you love`
   - Subtitle: `Pick 1–5 items you want to wear. AI picks the rest from your style.`
   - Slot rules sentence moves to a smaller secondary line below: `One item per slot. Choose only one of blazer, outerwear, or sweater.`
3. **Sticky selection bar** (new):
   - Visible only when ≥1 item is selected and not in week-plan pick mode.
   - Pinned to the bottom of the viewport (web: `fixed bottom-0`, safe area aware; iOS: `.safeAreaInset(edge: .bottom)` on the wardrobe list).
   - Text: `<N> piece(s) picked · <slot summary> — AI will pick the rest` (singular "piece" when N = 1).
   - Primary button: `Complete outfit with AI` — same action/disabled/loading state as the existing panel CTA (`Completing your outfit...` while loading).
   - Secondary: `Clear` button that deselects all.
   - Test id (web): `wardrobe-selection-sticky-bar`.
4. Existing panel CTA label `Complete outfit with AI` is unchanged.

## Files (narrow scope)

**Web:** `frontend/src/views/components/Wardrobe.tsx`, `frontend/src/views/components/UserGuide.tsx`, tests: `Wardrobe.test.tsx` (+ fix string asserts in `WardrobeMultiSelect.integration.test.tsx` / `GuideAndFooter.integration.test.tsx` only if they break on changed copy).

**iOS:** `ios-client/OutfitSuggestor/Utils/WardrobeCardUx.swift`, `Views/WardrobeListView.swift`, `Utils/IosLayoutBugFixPresentation.swift` (card action titles), `Views/UserGuideView.swift` / `Utils/AdminVisibility.swift` (Guide/About copy only if they mention card button wording), tests: `WardrobeCardUxTests.swift` (+ fix `IosLayoutBugFixPresentationTests` / `AdminVisibilityTests` asserts only if copy breaks them).

iPhone and iPad: identical UX; layout via horizontalSizeClass only.

## Tests (required)

- [x] Web `Wardrobe.test.tsx`: card shows `+ Use in outfit`; toggles to `✓ In outfit`; ineligible shows `Can't be used in outfits`; no `✓ Selected` badge.
- [x] Web `Wardrobe.test.tsx`: sticky bar hidden with 0 selected; shows `1 piece picked` / `2 pieces picked` + slot summary; `Clear` deselects all and hides bar; CTA calls completion.
- [x] Web: panel title/subtitle new copy.
- [x] iOS `WardrobeCardUxTests`: new card strings, sticky bar summary text helper (singular/plural + slot summary), panel title/subtitle constants.
- [x] Guide copy references `Use in outfit` on both platforms.

---

## Follow-up: sticky bar complements the panel (Cost Twin UI)

**Backend:** none. **Guide:** yes, both platforms quote "Tap Clear" → change to `Clear selection` and mention the bar appears once the panel scrolls away. About: no.

### Behavior (identical on web and iOS; supersedes item 3 above where different)

1. **Visibility:** sticky bar shows only when ≥1 item selected **AND** the completion panel ("Build an outfit around pieces you love") is out of view. Hidden while panel is visible. Still hidden in week-plan pick mode.
   - Web: `IntersectionObserver` on the panel element (guard when `IntersectionObserver` is undefined → treat panel as visible = bar hidden is acceptable only if tests mock it; prefer: undefined → treat as out of view so bar still works in old browsers).
   - iOS: panel `onAppear`/`onDisappear` (or scroll offset) drives `isCompletionPanelVisible`.
2. **Preference summary (second line of bar):** shared preferences joined with ` · `, e.g. `Work · All Season · Smart Casual`. Use the display labels of the current occasion/season/style values. If notes non-empty append ` · + notes`. If wardrobe-only toggle on append ` · Wardrobe only`. Followed by an `Edit` link/button that scrolls to the panel and expands Preferences. No preference controls inside the bar.
   - Web test id: `wardrobe-selection-sticky-prefs`; Edit button accessible name `Edit`.
3. **Copy consistency:**
   - Secondary button label is `Clear selection` in **both** bar and panel.
   - Count format on both: `<N> picked: <Slots>` with Title Case slot names joined by `, ` (e.g. `2 picked: Outerwear, Shirt`). Bar appends ` — AI will pick the rest`. Panel shows the same `<N> picked: <Slots>` string (no suffix). Replaces `N piece(s) picked · …`.

### Files (narrow)

**Web:** `frontend/src/views/components/Wardrobe.tsx`, `Wardrobe.test.tsx`, `UserGuide.tsx` (the "Clear" sentence only). Fix string asserts in `WardrobeMultiSelect.integration.test.tsx` / `GuideAndFooter.integration.test.tsx` only if they break.

**iOS:** `Utils/WardrobeCardUx.swift`, `Views/WardrobeListView.swift`, `Views/UserGuideView.swift` (the "Clear" sentence only), `OutfitSuggestorTests/WardrobeCardUxTests.swift`.

### Tests (required)

- [x] Web: bar hidden when panel intersecting; shown when panel not intersecting (mock IntersectionObserver); hidden with 0 selected.
- [x] Web: preference summary text — base, with notes (`+ notes`), with wardrobe-only.
- [x] Web: Edit scrolls panel into view (`scrollIntoView` called) and Preferences expanded.
- [x] Web: `Clear selection` label in bar and panel; count text `2 picked: Outerwear, Shirt` (Title Case).
- [x] iOS `WardrobeCardUxTests`: count format helper (Title Case, bar suffix), preference summary helper (base / notes / wardrobe-only), sticky bar visibility helper (selected count × panel visible × week-plan mode), `Clear selection` constant.
