# Feature Spec: Main Flow Side-by-Side Layout (Web ↔ iPad)

**Branch:** `cursor/update-preference-options-8b6a`  
**Slug:** `main-flow-side-by-side-layout`  
**Status:** in-progress (agents complete; full-suite gate pending user confirm)

**Reference implementation:** iOS `MainFlowView.regularWidthFlow` (iPad / `horizontalSizeClass == .regular`)  
**UX contract:** `docs/main-flow-ux-contract.md` (Layout section)

---

## User story

As a user on web tablet/desktop, I want the Suggest main flow to use the same side-by-side layout as iPad (inputs left, empty preview or outfit result right) so the experience matches across platforms.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Side-by-side shell | `App.tsx` main route grid | `MainFlowView.regularWidthFlow` | Two equal columns, max width ~980px |
| Input column (creation) | `Sidebar.tsx` | `creationInputColumn` | Upload, prefs, CTA, disclosures, Recent Looks |
| Preview column (creation) | `OutfitPreview.tsx` → `EmptyOutfitPreview` | `previewOrResultColumn` → `EmptyOutfitPreviewView` | Always visible right column when wide |
| Input column (result) | `Sidebar.tsx` compact mode | `compactResultInputColumn` | Compact summary + upload/regenerate + prefs |
| Result column | `OutfitPreview.tsx` | `resultContent` / `OutfitSuggestionView` | Hero, cards, Why this works; **no inline primary actions on wide** |
| Sticky result actions | `OutfitPreview.tsx` sticky bar | `resultStickyActions` safeAreaInset | Visible in result state on **all** widths (iOS); web must match |
| Layout logic | `frontend/src/utils/mainFlowLayoutLogic.ts` (new) | `MainFlowLayoutLogic.swift` | Sync pair for `showsCompactResultLayout` |

### Flow (wide viewport — md+ web / iPad regular)

1. **Creation:** Left = full input stack. Right = empty preview (`emptyPreviewHeadline` / subline). No stacked empty preview below input.
2. **Loading:** Left = input (disabled). Right = loading skeleton in preview column.
3. **Result:** Left = compact summary + compact upload/regenerate + preferences. Right = styled look (hero + cards). Primary actions in **sticky bottom bar** (not duplicated inline in result panel on md+).
4. **Narrow (web &lt; md / iPhone):** Single column stack; scroll to result on success; mobile sticky bar unchanged.

---

## States (both platforms)

| State | Wide layout | Copy |
|-------|-------------|------|
| Creation | Input left \| empty preview right | `MainFlowUxCopy.emptyPreview*` |
| Loading | Input left \| skeleton right | Existing progress |
| Result | Compact input left \| result right + sticky actions | `MainFlowUxCopy.resultTitle` |
| Wardrobe style pending | Full creation layout (not compact) even if stale suggestion | Same as iOS `MainFlowLayoutLogic` |

---

## Visual / UX

- **Max content width:** 980px centered (`adaptiveContent` on iOS; `max-w-[980px] mx-auto` on web main flow)
- **Column gap:** ~20px (web `gap-5` / iOS `spacing: 20`)
- **Breakpoint:** Web uses **`md:` (768px)** for two-column — aligns with iPad portrait regular width, not `lg:` (1024px)
- **Marketing block:** Web Sidebar “AI-Powered Style” badge + “Dress Better. Every Day.” headline — **hidden when side-by-side active (md+)** to match iOS (minimal `HomeHeaderView` only; web keeps existing NavBar)
- **HowItWorksStepper:** Hidden on web when side-by-side (md+) — not present on iOS main flow
- **Recent Looks:** On web md+, move into **left input column** (creation state) when authenticated — matches iOS `RecentLooksSection` inside `creationInputColumn`
- **Sticky input column:** `md:sticky md:top-20` (was `lg:sticky`)
- **Result actions:** On md+, hide inline primary action row in `OutfitPreview` result card; show sticky bottom bar (extend visibility beyond `sm:hidden` to match iOS sticky on tablet/desktop result)
- **Hero heights:** min 280px mobile / 360px wide (unchanged)

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad — no new iPad-only features
- iPad regular width remains reference; iPhone stays stacked (`compactWidthFlow`)
- iOS agent: verify `regularWidthFlow` still matches spec; fix only if web parity work exposes a gap

---

## API and contract

### Backend changes needed?

- [x] No — UI-only

### Shared constants / enums

| Name | Web file | iOS file |
|------|----------|----------|
| `showsCompactResultLayout` / `isWardrobeStylePending` | `frontend/src/utils/mainFlowLayoutLogic.ts` | `ios-client/OutfitSuggestor/Utils/MainFlowLayoutLogic.swift` |

Web must use `showsCompactResultLayout()` for Sidebar compact mode (replace ad-hoc `compactMode` where it diverges from iOS logic, including `highlightGenerateButton`).

---

## User-facing docs (About & Guide)

- [x] **No** — layout/styling only; no change to flows or copy in Guide/About

---

## Platform-specific notes

### Web only

- `App.tsx`: wrap main flow in `max-w-[980px] mx-auto`; change grid to `md:grid-cols-2 md:gap-5`
- `Sidebar.tsx`: hide marketing hero when `md+`; use `mainFlowLayoutLogic`; accept `highlightGenerateButton` prop if needed
- `OutfitPreview.tsx`: sticky actions on result for md+ (not only mobile); hide inline action row on md+ when suggestion present
- `RecentLooksSection`: render inside left column (Sidebar or App grid left cell) on md+ creation; keep below grid on mobile if simpler
- Hide `HowItWorksStepper` on md+ or when side-by-side

### iOS only

- Primary work: **verify** reference layout; add tests documenting regular vs compact width behavior
- Do not introduce iPad-only navigation or features
- If `Sidebar`-equivalent marketing copy exists anywhere on main flow, ensure it stays absent (already true)

---

## Tests (required)

### Backend (orchestrator)

- N/A

### Web (web agent)

- [ ] Unit: `frontend/src/utils/mainFlowLayoutLogic.test.ts` — parity with `MainFlowLayoutLogic.swift` cases
- [ ] Unit: update `Sidebar.test.tsx` — marketing block hidden at md+; compact mode uses layout logic with `highlightGenerateButton`
- [ ] Unit: update `OutfitPreview.test.tsx` — empty preview in no-suggestion state; inline actions hidden md+ when suggestion; sticky bar present in result
- [ ] Unit: update `MobileFriendly.test.tsx` — `md:grid-cols-2`, `md:sticky` (not only lg)
- [ ] Integration: `MainFlowSideBySideLayout.integration.test.tsx` (new) — at tablet width, creation shows empty preview in document alongside upload; after result, compact summary + result title both visible without vertical-only stack
- [ ] Cases:
  - Creation md+: empty preview headline visible while upload is in left column
  - Result md+: `main-flow-compact-summary` and `Your Styled Look` coexist (side-by-side grid)
  - Wardrobe style pending: full creation layout despite stale suggestion
  - Mobile: still stacks; scroll-to-result on success

### iOS (iOS agent)

- [ ] Unit: extend `MainFlowUxContractTests.swift` or add `MainFlowLayoutLogicTests.swift` — document regular-width two-column expectations (layout logic already covered; add test for `isRegularWidth` layout branch if testable)
- [ ] Build: `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`
- [ ] Run: `MainFlowUxContractTests` at minimum
- [ ] Cases:
  - `showsCompactResultLayout` false when wardrobe style pending with highlight
  - Regular width flow: no regression to compact iPhone stack

---

## Parity checklist

- [x] Web md+ matches iPad two-column creation (input | empty preview)
- [x] Web md+ matches iPad two-column result (compact input | result)
- [x] Sticky result actions on web md+ (no duplicate inline actions)
- [x] Max width 980px centered on web
- [x] `mainFlowLayoutLogic.ts` synced with `MainFlowLayoutLogic.swift`
- [x] Recent Looks in left column on wide web creation (auth)
- [x] HowItWorks hidden on wide web main flow
- [x] About & Guide unchanged
- [x] New-behavior tests added (web + iOS)
- [x] `IOS_WEB_FEATURE_PARITY.md` updated (layout row)
- [ ] Full web suite pass — orchestrator end gate
- [ ] Full iOS suite pass — orchestrator end gate

---

## Out of scope

- Backend / API changes
- NavBar redesign to match `HomeHeaderView`
- Removing HowItWorks on mobile web
- iPad-only navigation (split view, sidebar nav)
