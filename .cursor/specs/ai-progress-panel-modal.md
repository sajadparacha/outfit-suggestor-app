# Feature Spec: AI progress panel as true modal

**Branch:** `week-planner-ai-progress-panel`  
**Slug:** `ai-progress-panel-modal`  
**Status:** done  
**Workflow:** Cost Twin UI (narrow files, one test file per platform)

---

## Goal

While the existing AI progress panel is visible, treat it as a **true modal**: full-screen dimmed backdrop that **blocks all clicks/taps** on the app underneath. Keep the current **bottom card** UI (title, elapsed, steps, bar, optional Cancel). When loading ends, remove the overlay and restore normal interaction.

- **Do not** dismiss on backdrop tap.
- **Cancel** only when already supported today (do not add new cancel paths).
- Backend: none.

---

## Allowed files (do not expand)

**Web**

- `frontend/src/views/components/LoadingOverlay.tsx`
- `frontend/src/App.tsx` — comment/wiring only if needed
- `frontend/src/views/components/UserGuide.tsx`
- `frontend/src/views/components/About.tsx`
- Tests: `frontend/src/views/components/LoadingOverlay.test.tsx` **only** (create if missing)

**iOS**

- `ios-client/OutfitSuggestor/Views/AiProgressPanelView.swift`
- `ios-client/OutfitSuggestor/Views/MainFlowView.swift` — overlay host only if needed
- `ios-client/OutfitSuggestor/Views/UserGuideView.swift`
- `ios-client/OutfitSuggestor/Views/AboutView.swift` (and `AdminVisibility` / About copy helper if Guide/About text lives there)
- Tests: `ios-client/OutfitSuggestorTests/AiProgressPanelViewTests.swift` **only** (create if missing)

Read only listed files; no full-repo search.

---

## UX rules

1. Full-screen dimmed backdrop while panel is visible.
2. Pointer/touch events on content under the overlay are blocked.
3. Bottom card chrome unchanged (title, elapsed · usually ~Xs, steps, bar, optional Cancel).
4. Backdrop tap does **not** dismiss.
5. Cancel button only when `onCancel` is already provided by callers.
6. When `isLoading` / overlay host condition ends → overlay gone, interaction restored.
7. iPhone / iPad: identical UX; layout/spacing via `horizontalSizeClass` / `adaptiveContent` only.

---

## About / Guide (required)

Update copy so users know the progress panel **blocks the app until the operation finishes** — remove any implication that tabs stay usable / non-blocking.

- Guide: clarify blocking modal behavior for AI progress / Insights / Week Planner server work.
- About: same intent on the relevant feature line(s).

---

## Tests (required)

### Web — `LoadingOverlay.test.tsx` only

- When `isLoading`, backdrop (or overlay root) is present and blocks interaction (e.g. `pointer-events` / role / test id).
- Bottom card content still renders (title / status).
- Backdrop click does not call dismiss / does not unmount while `isLoading` stays true.
- When `isLoading` false, overlay not rendered.

### iOS — `AiProgressPanelViewTests.swift` only

- Modal/backdrop blocks interaction while visible (assert structure or accessibility / test helpers as appropriate).
- Card content still present.
- No dismiss-on-backdrop behavior.
- About/Guide copy helper (if tested here) reflects blocking wording — only if copy lives in allowed files and is unit-testable in this one file; otherwise cover modal structure only.

---

## Parity checklist

- [x] Full-screen dimmed blocking backdrop on both platforms
- [x] Bottom card UI preserved
- [x] No backdrop dismiss
- [x] Cancel only when already supported
- [x] About/Guide updated (blocking, not non-blocking)
- [x] Targeted tests green (one file per platform)
