# Feature Spec: Progress bar for Random from History & Wardrobe

**Branch:** `feature/random-history-diverse-selection`  
**Slug:** `random-picks-progress-bar`  
**Status:** done

---

## User story

As a user, when I tap **Random from History** or **Random from Wardrobe**, I want the same staged AI progress panel as **Generate outfit** (elapsed time, bar, step list, cancel) — so long operations feel consistent and I know the app is working.

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| Random from Wardrobe | `Sidebar` → `getRandomSuggestion` | `MainFlowView` → `getRandomFromWardrobe` | AI call — already sets wardrobe operation on web; verify panel shows |
| Random from History | `Sidebar` → `loadRandomFromHistory` | `MainFlowView` → `getRandomFromHistory` | Fetch history + client pick — **missing** progress today |
| Progress panel | `LoadingOverlay.tsx` | `AiProgressPanelView` in `MainFlowView` | Bottom sheet style, non-blocking |

### Flow

1. User taps random pick button (auth required).
2. Show staged progress panel immediately (`isLoading` / `showsAiProgressPanel`).
3. Steps animate while work runs (API fetch and/or AI).
4. Panel dismisses on success/error/cancel.
5. Cancel aborts in-flight request (wardrobe AI) or stops history load where applicable.

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Random wardrobe loading | `wardrobe-outfit` operation | Title: **Building from your wardrobe**; message: **Scanning your wardrobe...** |
| Random history loading | `random-history` operation (new) | Title: **Picking from your history**; message: **Picking a random look from your history...** |
| Cancel | Same as Generate outfit | Abort controller / `cancelOperation()` |

### `random-history` staged steps (both platforms — keep in sync)

| Step id | Label | durationMs |
|---------|-------|------------|
| fetch | Loading your saved looks | 2500 |
| pick | Finding a varied outfit | 2000 |
| prepare | Preparing your look | 2000 |

---

## Visual / UX

- Reuse existing `LoadingOverlay` (web) and `AiProgressPanelView` (iOS) — **no new component**.
- Same placement: bottom panel, gradient bar, step checklist, elapsed / estimated total, slow hint at 45s, Cancel button.
- Do **not** block tab navigation (existing behavior).

### iPhone / iPad (iOS)

- Same UX; panel padding already adapts in `MainFlowView`.

---

## API and contract

### Backend changes needed?

- [ ] No — UI-only

### Shared constants (sync required)

| Name | Web | iOS |
|------|-----|-----|
| `random-history` operation type | `aiProgressSteps.ts` | `AiProgressSteps.swift` |
| Step definitions | `AI_PROGRESS_STEPS['random-history']` | `AiOperationType.randomHistory` case |
| Title | LoadingOverlay `OPERATION_TITLES` | `AiProgressSteps.title(for:)` |
| Message → step index | `resolveStepFromMessage` | `stepIndex(for:steps:)` — match `history`, `pick`, `varied` |

---

## User-facing docs (About & Guide)

- [ ] **No** — no flow/copy change beyond existing loading feedback

---

## Platform-specific notes

### Web

- `loadRandomFromHistory`: set `loading=true`, `activeOperation='random-history'`, `loadingMessage` at start; clear in `finally`.
- `getRandomSuggestion`: already sets `wardrobe-outfit` — verify `loading=true` before async work; add test if missing.
- `handleCancelAiOperation` in `App.tsx`: abort should cover random history if abort controller added (optional: history fetch uses same abort ref pattern as other ops).

### iOS

- Add `AiOperationType.randomHistory` with steps + title **Picking from your history**.
- `OutfitViewModel.aiOperationType`: return `.randomHistory` for `.randomHistory` context (currently `nil`).
- `.randomWardrobe` already returns `.wardrobeOutfit` — verify panel appears in tests.

---

## Tests (required)

### Backend

- N/A

### Web

- [ ] `aiProgressSteps.test.ts` — `random-history` steps + message resolution
- [ ] `LoadingOverlay.test.tsx` — renders title for `random-history`
- [ ] `useOutfitController.test.ts` or integration — `loadRandomFromHistory` sets `activeOperation` / `loading`
- [ ] `RandomFromHistory.integration.test.tsx` — progress panel visible during load (if testable via aria)

### iOS

- [ ] `AiProgressStepsTests.swift` — `randomHistory` steps + title
- [ ] `OutfitViewModelIntegrationTests.swift` — `aiOperationType` for random history & wardrobe during load

---

## Parity checklist

- [ ] Both random flows show staged progress panel
- [ ] Same step labels and titles (modulo platform casing)
- [ ] Cancel works for wardrobe AI
- [ ] `IOS_WEB_FEATURE_PARITY.md` note if needed
- [ ] Tests added web + iOS

---

## Out of scope

- Changing AI step timings for main Generate outfit flow
- Full-screen blocking spinner
