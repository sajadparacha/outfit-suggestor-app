# Feature Spec: <Feature Name>

**Branch:** `<branch-name>`  
**Slug:** `<feature-slug>`  
**Status:** draft | in-progress | done

---

## User story

As a user, I want … so that …

---

## Screens and flows

| Screen / area | Web location | iOS location | Notes |
|---------------|--------------|--------------|-------|
| | `frontend/src/views/...` | `ios-client/OutfitSuggestor/Views/...` | |

### Flow

1. …
2. …

---

## States (both platforms)

| State | Behavior | Copy |
|-------|----------|------|
| Loading | | |
| Empty | | |
| Error | | |
| Success | | |

---

## Visual / UX

- Layout and component placement (platform-neutral description)
- Primary actions and secondary actions
- Animation / feedback (haptics on iOS; hover/focus on web where relevant)
- Theme: dark slate background, blue-purple gradient accents (`#4facfe` → `#c471ed`)

### iPhone / iPad (iOS)

- **Same UX** on iPhone and iPad: identical flows, copy, and actions.
- **Layout-only** adjustments on regular horizontal size class (wider max width, spacing, optional horizontal toolbars).
- **No** iPad-specific navigation, screens, or feature differences unless explicitly called out below.

| Device | Expected difference |
|--------|---------------------|
| iPhone (compact) | Default full-width layout |
| iPad / regular width | Same UI; optional width caps and spacing per iOS adaptive patterns |

---

## API and contract

### Backend changes needed?

- [ ] No — UI-only
- [ ] Yes — describe endpoints, request/response shapes

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| | | |

### Client contract files to update

**Web**

- [ ] `frontend/src/models/...`
- [ ] `frontend/src/services/ApiService.ts`
- [ ] `frontend/src/controllers/...`
- [ ] `frontend/src/utils/...`

**iOS**

- [ ] `ios-client/OutfitSuggestor/Models/...`
- [ ] `ios-client/OutfitSuggestor/Services/...`
- [ ] `ios-client/OutfitSuggestor/ViewModels/...`
- [ ] `ios-client/OutfitSuggestor/Utils/...`

### Shared constants / enums

| Name | Value(s) | Web file | iOS file |
|------|----------|----------|----------|
| | | | |

---

## User-facing docs (About & Guide)

Mark whether agents should update in-app documentation for this feature.

| Platform | Files |
|----------|--------|
| Web | `frontend/src/views/components/UserGuide.tsx`, `About.tsx` |
| iOS | `ios-client/OutfitSuggestor/Views/UserGuideView.swift`, `AboutView.swift` |

- [ ] **No** — layout/styling only; no change to flows or copy users read in Guide/About
- [ ] **Yes** — describe what to update:
  - Guide: …
  - About: …

When **Yes**, both agents update their platform files before returning. Orchestrator verifies in parity review.

---

## Platform-specific notes

### Web only

- Navigation (`currentView` in `App.tsx`):
- Storage (`localStorage`):

### iOS only

- Navigation (tab / stack / sheet):
- Storage (Keychain):

---

## Tests (required)

Fill before spawning agents. Each platform needs tests that assert **new behavior**, not only smoke renders.

### Backend (orchestrator — if API/business logic changes)

- [ ] Test file: `backend/tests/test_<feature>.py`
- [ ] Cases:
  - …

### Web (web agent)

- [ ] Unit: `frontend/src/.../*.test.ts(x)`
- [ ] Integration: `frontend/src/.../*.integration.test.tsx`
- [ ] Cases:
  - …

### iOS (iOS agent)

- [ ] Unit/Integration: `ios-client/OutfitSuggestorTests/<Name>Tests.swift`
- [ ] UITest (only if critical E2E): `ios-client/OutfitSuggestorUITests/...`
- [ ] Cases:
  - …

### Per-feature tests (agents add during implementation)

| Layer | Command |
|-------|---------|
| Backend | `cd backend && pytest tests/test_<feature>.py -q` |
| Web | tests colocated with changed modules |
| iOS | `OutfitSuggestorTests/<NewClass>Tests.swift` |

### End of Twin UI — targeted report + new terminal `./run_all_tests` (orchestrator)

Same for full Twin UI and Cost Twin UI:

1. Publish **Targeted Test Report** from agent results (spec-listed files/classes only).
2. Open a **new terminal** at repo root and start `./run_all_tests` — do **not** ask first; do **not** ingest suite logs into chat.
3. Implementation is complete when spec + targeted tests pass; full-suite pass/fail is watched in that terminal.

| Layer | During work | End |
|-------|-------------|-----|
| Backend (if changed) | `pytest tests/test_<feature>.py -q` | Covered by `./run_all_tests` in new terminal |
| Web | Spec-listed file(s) only | Covered by `./run_all_tests` in new terminal |
| iOS | Spec-listed class only | Covered by `./run_all_tests` in new terminal |

After agents return, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] About & Guide updated on both platforms (if spec required)
- [ ] Same copy and error messages
- [ ] Equivalent loading / empty / error UI
- [ ] API client methods match on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated (if new capability)
- [ ] New-behavior tests added (web + iOS)
- [ ] Targeted web tests pass (spec-listed file(s))
- [ ] Targeted iOS tests pass (spec-listed class)
- [ ] Targeted backend pytest pass (if backend changed)
- [ ] Full suite launched: `./run_all_tests` in new terminal (user watches)

---

## Out of scope

- …
