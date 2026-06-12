# Feature Spec: Main Page Simplified UX Flow

**Branch:** `feature/main-page-ui-improvements`  
**Slug:** `main-page-ui-simplified-flow`  
**Status:** done

**UX contract:** `docs/main-flow-ux-contract.md` (mandatory reference)

---

## User story

As a user, I want a focused outfit-suggestion flow (upload → preferences → generate → review → save/refine) so that I am not overwhelmed by controls and the result feels like a fashion product, not an AI dashboard.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Creation (input) | `Sidebar.tsx`, `App.tsx` layout | `MainFlowView.swift` creation section | Collapsed wardrobe/picks/advanced |
| Empty preview | `OutfitPreview.tsx` or new `EmptyOutfitPreview.tsx` | `MainFlowView` preview column | Desktop/tablet right column |
| Result hero | `OutfitPreview.tsx` | `OutfitSuggestionView.swift` | Model image hero; no upload repeat |
| Item cards | `suggestion/OutfitItemCard.tsx` | New or refactored `OutfitItemCardView.swift` | Short name + one-line reason + tag |
| Refine menu | New `RefineMenu.tsx` | Refine sheet/menu in `MainFlowView` | 4 options inside |
| Compact summary | New `MainFlowCompactSummary.tsx` | Compact summary in result layout | After generation, left column (web) |
| Shared copy/utils | `frontend/src/utils/mainFlowUxCopy.ts` etc. | `ios-client/.../Utils/MainFlowUxCopy.swift` etc. | **Already created by orchestrator** |

### Flow

1. **Creation:** Upload photo → set occasion/season/style/notes → tap **Generate Outfit**
2. **Loading:** Result area shows skeleton; AI progress unchanged
3. **Result:** Hero outfit preview → context line → 5 item cards → Why this works bullets → 3 actions
4. **Refine:** User opens Refine → formal/casual/wardrobe-only/change occasion → regenerates
5. **Save Look:** Saves/likes (auth gate for guests)

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | Skeleton in result; disable generate | Existing AI progress messages |
| Empty (no result) | Empty preview card right column / below input | `MainFlowUxCopy.emptyPreview*` |
| Error | Inline error in result area | Existing error strings |
| Success | Switch to result layout; mobile scroll to result | `MainFlowUxCopy.resultTitle` |

---

## Visual / UX

- Keep premium dark slate + blue-purple gradients
- **Before generation:** max 3 visible sections (Upload, Preferences, Generate CTA) + collapsed disclosures
- **After generation:** hero image area min 280px mobile / 360px desktop height
- **Three primary actions only:** Generate Another Look, Save Look, Refine
- Rename ♥ Like → **Save Look** (same handler)
- Remove Advanced options block from result panel entirely
- Move refine buttons (formal/casual/wardrobe/occasion) into Refine menu only
- Remove duplicate mobile sticky refine grid; sticky bar: Save Look + Generate Another (+ Refine or in menu)
- **Web desktop after result:** `lg:grid-cols-2` with compact summary left (~320px content), hero right
- **Web mobile:** `scrollIntoView` on `#outfit-result-hero` after successful generation (keep existing pattern in App)
- **iOS:** `ScrollViewReader` scroll to result on generation; sticky bottom safeAreaInset for Save + Generate Again
- **iPad:** two-column when `horizontalSizeClass == .regular` (input left, preview/result right) — same UX as iPhone

### iPhone / iPad (iOS)

- Same flows, copy, actions on all devices
- Layout-only: `adaptiveContent`, two-column on regular width

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Client contract files (orchestrator created — use, do not duplicate)

| Web | iOS |
|-----|-----|
| `mainFlowUxCopy.ts` | `MainFlowUxCopy.swift` |
| `reasoningBullets.ts` | `ReasoningBullets.swift` |
| `outfitContextLine.ts` | `OutfitContextLine.swift` |
| `outfitItemCardText.ts` | `OutfitItemCardText.swift` |

**iOS agent:** Add new Swift files to `OutfitSuggestor.xcodeproj` target if not already linked.

---

## Platform-specific notes

### Web only

- `App.tsx`: pass `hasSuggestion` to control layout; ref for scroll target
- `Sidebar.tsx`: when `hasSuggestion`, collapse to compact mode or hide heavy sections
- Update `aria-label` on primary CTA to `MAIN_FLOW_UX_COPY.primaryCtaAria`
- Secondary actions (Add to Wardrobe, Start Over) → optional overflow "More" menu — not primary row
- Update `UserGuide.tsx` copy: "Generate Outfit" not "Get AI outfit suggestion" where referring to button label

### iOS only

- Refactor `MainFlowView` result section: remove `resultSecondaryActions` visible grid; use Refine sheet
- `OutfitSuggestionView`: remove Advanced options disclosure from result; remove duplicate action rows when `showsActionSection`
- Wire `MainFlowUxCopy` for all user-visible strings in main flow
- Rename Like → Save Look; remove separate Save button if redundant (consolidate to Save Look)
- Add `MainFlowUxContractTests.swift` for utils + copy parity

---

## Tests (required)

### Backend (orchestrator — if API/business logic changes)

- N/A

### Web (web agent)

- [ ] Unit: `frontend/src/utils/reasoningBullets.test.ts` (orchestrator added — keep green)
- [ ] Unit: `frontend/src/utils/outfitItemCardText.test.ts` (orchestrator added)
- [ ] Unit: `frontend/src/views/components/OutfitPreview.test.tsx` — update for:
  - Refine menu contains 4 options; standalone refine buttons removed
  - Advanced options NOT in result panel
  - Save Look label (not Like)
  - Why this works renders bullets
  - Hero does not use upload when model_image absent (placeholder, not upload)
- [ ] Unit: new `RefineMenu.test.tsx` if component extracted
- [ ] Integration: `OutfitResultActions.integration.test.tsx` — refine via Refine menu
- [ ] Integration: `MainSuggestionFlow.integration.test.tsx` — end-to-end with new labels
- [ ] Cases:
  - Generate Outfit CTA visible in creation state
  - After result: exactly 3 primary action buttons visible (Generate Another, Save Look, Refine)
  - Refine → Make it more formal triggers API with modifier
  - Mobile scroll to result on success
  - Empty preview before generation on desktop

### iOS (iOS agent)

- [ ] Unit: `MainFlowUxContractTests.swift` — copy keys, ReasoningBullets, OutfitItemCardTextParser, OutfitContextLine
- [ ] Update: `FirstRunCoachTests.swift` if empty preview copy changed
- [ ] Update UITests accessibility identifiers: `main.saveLookButton`, `main.refineButton`
- [ ] Cases:
  - Result shows MainFlowUxCopy.resultTitle
  - Refine sheet presents 4 options
  - Advanced options only in creation section (not OutfitSuggestionView result)
  - Save Look button exists (not Like)

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Web | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/MainFlowUxContractTests` |

---

## Parity checklist

- [x] Same user-visible behavior on web and iOS
- [x] Same copy via MainFlowUxCopy / mainFlowUxCopy.ts
- [x] Equivalent loading / empty / error UI
- [x] Three primary result actions only
- [x] Refine menu contains same 4 options
- [x] Advanced options input-side only
- [x] `IOS_WEB_FEATURE_PARITY.md` updated
- [x] New-behavior tests added (web + iOS)
- [x] Full web suite pass — orchestrator end gate
- [x] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend API changes
- New color preference field (use notes for color hints)
- History/Wardrobe/Insights screen redesign
- Visual regression screenshot CI (note if unavailable)
