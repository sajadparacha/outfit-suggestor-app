# Feature Spec: Week Planner AI progress panel

**Branch:** `week-planner-ai-progress-panel`  
**Slug:** `week-planner-ai-progress-panel`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

Week Planner server work shows the **same** bottom staged AI progress panel as Insights (title, elapsed · usually ~Xs, blue–purple bar, check/active/pending steps, footer). Reuse the existing overlay — **do not** build a second card.

- Web: `LoadingOverlay` + `useStagedAiProgress` (already in `App.tsx`)
- iOS: `AiProgressPanelView` + `AiProgressSteps`

Backend: none (UI-only).

---

## Allowed files (do not expand)

**Web**

- `frontend/src/utils/aiProgressSteps.ts`
- `frontend/src/views/components/LoadingOverlay.tsx` (titles only if needed)
- `frontend/src/App.tsx` — wire `weekPlan.generating` / `saving` / `loading` / `restoring` / `presetBusy` into `appBusy` + `operationType` + `message`
- `frontend/src/views/WeekPlanner.tsx` — only if needed for cancel/message
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- Tests: `frontend/src/utils/aiProgressSteps.test.ts` **only**

**iOS**

- `ios-client/OutfitSuggestor/Utils/AiProgressSteps.swift`
- `ios-client/OutfitSuggestor/Views/AiProgressPanelView.swift` — only if needed (e.g. optional Cancel)
- `ios-client/OutfitSuggestor/Views/WeekPlannerView.swift`
- `ios-client/OutfitSuggestor/ViewModels/WeekPlannerViewModel.swift`
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift` (and `AboutCopy.weekPlannerFeature` if copy lives in `AdminVisibility.swift` / About copy helper — keep Guide/About aligned)
- Tests: `ios-client/OutfitSuggestorTests/AiProgressStepsTests.swift` **only**

Read only listed files; no full-repo search.

---

## Operation types (match web + iOS)

Add to `AiOperationType` / `AI_PROGRESS_STEPS` (keep existing types unchanged).

| Type | When | Title | Steps (durations) | Footer while running |
|------|------|-------|-------------------|----------------------|
| `week-plan-generate` | Generate week | Planning your week | Reading your plan (~4s) → Matching wardrobe pieces (~8s) → Building outfits (~12s) | Preparing this week’s outfits… |
| `week-plan-regenerate` | Regenerate this day | Planning this day’s outfit | **Same three steps** | Preparing this week’s outfits… (or “Preparing this day’s outfit…”) |
| `week-plan-sync` | Load plan, save, restore history, presets, clear plan | Updating your week | 1–2 steps totaling **~3–6s** (not Insights ~30s). e.g. Saving your changes (~2.5s) → Updating your week (~2.5s) | Keep existing Saving… / Loading… where already shown on CTAs |

If distinguishing generate vs regenerate needs a local kind in `App.tsx` / `WeekPlannerViewModel` (both generating flags today), set it from the callback that fired. Do **not** edit `useWeekPlanController.ts`.

---

## UX rules

1. **Generate week / Regenerate this day:** full Insights-style panel (chrome + 3 steps).
2. **Other server calls:** same chrome, short `week-plan-sync` script.
3. Keep existing button disable / Generating… / Saving… — overlay is **additional**, not a replacement.
4. **No overlay** for local UI (toggle a day, change occasion/style in memory).
5. Suggest filters and Insights Analysis Preference chips **unchanged**.
6. **Cancel:** show only if that operation can be aborted. Week plan generate is **not** abortable today — **do not add abort**. Hide Cancel for week-plan ops. (Web: pass `onCancel` only for existing cancellable Suggest/Insights work. iOS: make `onCancel` optional on `AiProgressPanelView` if needed; existing Insights/Suggest callers keep Cancel.)
7. Overlay priority: existing Suggest / Insights busy wins over week-plan busy if both could theoretically overlap.
8. iPhone / iPad: identical UX; layout/spacing via `horizontalSizeClass` / `adaptiveContent` only.

---

## About / Guide (required)

While Generate outfits / Regenerate this day (and other Week Planner server calls) run, the **same bottom progress panel as Insights** appears — not a full-screen spinner.

- Guide: one sentence in the Week Outfit Planner section.
- About: one clause on the Week Planner feature line.

---

## Tests (required) — one file per platform

### Web — `frontend/src/utils/aiProgressSteps.test.ts`

- [x] `week-plan-generate` has the three labels and title “Planning your week”; estimated duration ≈ 24s
- [x] `week-plan-regenerate` shares those steps; title “Planning this day’s outfit”
- [x] `week-plan-sync` has 1–2 steps totaling 3–6s; title “Updating your week”
- [x] `resolveStepFromMessage` maps the generate footer / step labels to the expected index
- Run: `cd frontend && npm test -- --watchAll=false src/utils/aiProgressSteps.test.ts`

### iOS — `ios-client/OutfitSuggestorTests/AiProgressStepsTests.swift`

- [x] Same assertions via `AiProgressSteps.steps/title/estimatedTotalSeconds/stepIndex`
- Run: `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/AiProgressStepsTests`

---

## Out of scope

- Backend / API
- `IOS_WEB_FEATURE_PARITY.md` (no new capability)
- Full test suites
- Second overlay card or full-screen spinner
