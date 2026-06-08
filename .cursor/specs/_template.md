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

### End of Twin UI — confirm, then full suites + report (orchestrator)

Orchestrator **asks user to confirm** before running these (full suites take several minutes):

| Layer | Command |
|-------|---------|
| Backend (if changed) | `cd backend && pytest -q` |
| Web (always) | `cd frontend && npm test -- --watchAll=false --passWithNoTests` |
| iOS (always) | `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests -only-testing:OutfitSuggestorUITests` |

After user confirms, publish filled report using `.cursor/specs/_test-report-template.md`.

---

## Parity checklist

- [ ] Same user-visible behavior on web and iOS
- [ ] Same copy and error messages
- [ ] Equivalent loading / empty / error UI
- [ ] API client methods match on both platforms
- [ ] `IOS_WEB_FEATURE_PARITY.md` updated (if new capability)
- [ ] New-behavior tests added (web + iOS)
- [ ] Full web suite pass (`npm test -- --watchAll=false`) — orchestrator end gate
- [ ] Full iOS suite pass (`xcodebuild test` OutfitSuggestorTests + UITests) — orchestrator end gate
- [ ] Full backend pytest pass (if backend changed)

---

## Out of scope

- …
