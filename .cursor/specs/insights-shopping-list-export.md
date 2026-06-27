# Feature Spec: Insights Shopping List Export

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `insights-shopping-list-export`  
**Status:** in-progress

---

## User story

As a user who has completed Wardrobe Insights, I want a clear Shopping List button that opens a table of items to buy, style/color tuples, Google Shopping links, and export actions so I can act on the analysis outside the app.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Wardrobe Insights results | `frontend/src/views/components/insights/...` | `ios-client/OutfitSuggestor/Views/Insights/...` | Add button after insights are available. |
| Shopping list table/sheet | New or existing insights component under platform scope | New or existing Insights SwiftUI component | Derived from existing normalized missing-items / priority shopping data. |

### Flow

1. User runs Wardrobe Insights and sees results.
2. User taps/clicks **Shopping list**.
3. App shows a table/list with columns:
   - **Item**: item/category label, e.g. `Shirt`, `Trouser`, `Blazer`, `Shoes`, `Belt`.
   - **Style & color tuples**: comma-separated tuples like `(Oxford, Olive)`, `(Linen, White)`.
   - **Google Shopping**: opens Google Shopping for the item plus the provided style/color tuples.
4. User can export the shopping list:
   - **WhatsApp**: opens WhatsApp/share URL with a readable text version of the table.
   - **PDF**: exports or shares a PDF version of the table.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| No insights result | Hide Shopping list button | None |
| Result with missing items | Show **Shopping list** button near results header/actions | `Shopping list` |
| Shopping list open | Show table/list and export actions | `Export to WhatsApp`, `Export as PDF` |
| Empty shopping list | Show empty state instead of blank table | `No shopping list items for this analysis.` |
| Export unavailable | Show non-blocking error/toast/alert | `Could not export shopping list.` |

---

## Visual / UX

- Keep existing Insights layout and **Top items to add** cards.
- Add a prominent but secondary **Shopping list** action once results exist.
- The table should be readable on mobile:
  - Web: responsive table/card layout is acceptable.
  - iOS: SwiftUI list/table-style rows are acceptable.
- Google Shopping links should be per row and open externally.
- WhatsApp export should use plain text with one line per item.
- PDF export should include a title, analyzed context, and the table rows.

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class are allowed.
- **No** iPad-specific navigation, screens, or feature differences.

---

## API and contract

### Backend changes needed?

- [x] No — client-side view/export over existing Insights result data
- [ ] Yes — describe endpoints, request/response shapes

### Data source

Use existing normalized insight missing items / priority shopping data.

| Table column | Source |
|--------------|--------|
| Item | `WardrobeMissingItem.category` / `WardrobeMissingItem.name` |
| Style & color tuples | Cross product of `worksWith` styles and `bestColors`; if one side is empty, use available values with sensible fallback (`classic` style or `neutral` color) |
| Google Shopping | Existing Google Shopping search helper with item/category, style(s), color(s) |

### Client contract files to update

**Web**

- [x] `frontend/src/views/components/insights/...`
- [x] `frontend/src/utils/insightsHelpers.ts` or new helper for row formatting/export
- [x] `frontend/src/views/components/UserGuide.tsx`, `About.tsx`

**iOS**

- [x] `ios-client/OutfitSuggestor/Views/Insights/...`
- [x] `ios-client/OutfitSuggestor/Utils/...` or `Models/...` for row formatting/export
- [x] `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift`

---

## User-facing docs (About & Guide)

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [ ] **No** — layout/styling only; no change to flows or copy users read in Guide/About
- [x] **Yes** — describe what to update:
  - Guide: explain the Insights Shopping list button, row links, WhatsApp export, and PDF export.
  - About: mention actionable shopping list exports from Wardrobe Insights if Insights capabilities are listed.

---

## Platform-specific notes

### Web only

- WhatsApp export may use `https://wa.me/?text=<encoded text>`.
- PDF export may use browser APIs (`window.print`, Blob/object URL, or a small client-side PDF approach already available in the repo). Do not add a dependency unless necessary.
- Tests should mock `window.open` / print/export side effects.

### iOS only

- WhatsApp export should prefer native share sheet / WhatsApp URL if available; a generic share sheet is acceptable if WhatsApp-specific URL cannot be guaranteed.
- PDF export should use native PDF/share APIs where practical.
- Keep iPhone/iPad behavior identical.

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- [x] Not applicable; no backend changes.

### Web (web agent)

- [x] Unit/helper tests:
  - Builds shopping-list rows from missing items.
  - Formats style/color tuples like `(Oxford, Olive), (Linen, White)`.
  - Builds WhatsApp export text.
- [x] Integration/component tests:
  - Shopping list button is hidden before insights result and visible after result.
  - Clicking Shopping list opens/shows the table with Item, Style & color tuples, and Google Shopping.
  - Google Shopping row link opens the expected shopping URL.
  - Export to WhatsApp opens encoded WhatsApp text.
  - Export as PDF invokes the PDF/print/share path.

### iOS (iOS agent)

- [x] Unit/helper tests:
  - Builds shopping-list rows from `WardrobeInsightMissingItem`.
  - Formats style/color tuples.
  - Builds share text and Google Shopping URL.
- [x] View model / presentation tests:
  - Shopping list action is hidden before results and available after results.
  - Export actions are exposed with the same copy.

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Backend | Not applicable |
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `cd ios-client && xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`; run new `OutfitSuggestorTests` classes |

### End of Twin UI — confirm, then full suites + report (orchestrator)

Orchestrator **asks user to confirm** before running these (full suites take several minutes):

| Layer | Command |
|-------|---------|
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `cd ios-client && xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

After user confirms, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] About & Guide updated on both platforms
- [x] Same copy and export labels
- [x] Equivalent empty/export error states
- [x] API client methods unchanged
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [ ] Full web suite pass (`npm test -- --watchAll=false`) — orchestrator end gate
- [ ] Full iOS suite pass (`xcodebuild test` OutfitSuggestorTests + UITests) — orchestrator end gate

Targeted verification so far:
- Web: `npm test -- --watchAll=false --passWithNoTests` passed, 53 suites / 317 tests.
- iOS: `git diff --check -- ios-client` passed; `xcodebuild` is unavailable in this Linux environment.

---

## Out of scope

- Backend persistence of shopping lists.
- Editing shopping list rows.
- Checkout/cart integrations beyond external Google Shopping links.
