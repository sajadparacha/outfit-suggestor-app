---
name: parallel-ui-ux
description: Orchestrates parallel web and iOS UI/UX from one instruction via two subagents with mandatory tests. Use when the user says "Twin UI:", "Parallel UI/UX", or wants matching web+iOS UX on the current branch. Orchestrator writes spec and backend/contract only; never implements platform UI inline.
---

# Parallel UI/UX (Web + iOS)

## Trigger phrase

```text
Twin UI:

[your instruction]
```

All triggers use the **strict** workflow: orchestrator never edits `frontend/**` or `ios-client/**` UI; always spawns two subagents; **tests are mandatory**.

## Workflow checklist

```
- [ ] 1. Confirm branch (`git branch --show-current`)
- [ ] 2. Create spec with Tests (required) section filled; mark if **About** / **Guide** need updates
- [ ] 3. Orchestrator: backend/contract + backend pytest (if needed)
- [ ] 4. Spawn web + iOS Task subagents in ONE message (required)
- [ ] 5. Parity review vs spec, About/Guide (when required), and IOS_WEB_FEATURE_PARITY.md
- [ ] 6. **Ask user to confirm** before running full web + iOS test suites
- [ ] 7. Orchestrator: run FULL web + iOS test suites (only after user confirms)
- [ ] 8. Publish Test Execution Report (required format below)
- [ ] 9. Mark spec done; summarize for user
```

## Mandatory tests (every Twin UI feature)

### Orchestrator (backend)

When `backend/` changes:

- Add/update `backend/tests/test_<feature>.py` (or extend existing)
- Cover happy path, auth/guest edge cases, error responses
- Run: `cd backend && . venv/bin/activate && pytest tests/<file> -q`

### Web agent (required)

- **Unit tests** for utils, controllers, pure components (`*.test.tsx` next to component or under `src/`)
- **Integration tests** for user flows (`*.integration.test.tsx`, `renderApp()` from `src/test/renderWithRouter.tsx`)
- Mock API via MSW handlers in `src/test/msw/handlers.ts` when endpoints change
- Run: `cd frontend && npm test -- --watchAll=false --passWithNoTests`
- Return: test file paths + pass count (e.g. `35 suites, 183 passed`)

Minimum: **at least one test** that asserts the new behavior (not just "renders without crash").

### iOS agent (required)

- **Unit tests** in `ios-client/OutfitSuggestorTests/` for ViewModels, parsers, copy helpers
- **Integration tests** in `OutfitSuggestorTests/*IntegrationTests.swift` when API/ViewModel logic changes
- **UITests** in `OutfitSuggestorUITests/` only for critical E2E flows (optional extra, not a substitute for unit tests)
- Run at minimum: `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`
- **Also run tests** when ViewModel/service tests were added:
  `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/<TestClass>`
- Return: test file paths + build/test result

Minimum: **at least one unit or integration test** for new behavior. If truly impossible, document why in return — orchestrator must reject unless spec marks exception.

## End-of-Twin-UI full test run (orchestrator — after user confirms)

After both agents return and parity review is done, the orchestrator **must ask the user for confirmation** before running complete suites (not only new test files). Full suites can take several minutes — do not start them automatically.

**Confirmation prompt (orchestrator → user):**

```text
Both web and iOS agents have returned. Ready to run the full test suites?

- Web: all Jest unit + integration tests
- iOS: all OutfitSuggestorTests + OutfitSuggestorUITests
- Backend: full pytest (only if backend changed this feature)

This may take several minutes. Proceed?
```

- **If user confirms:** run the suites below and publish the Test Execution Report.
- **If user declines or does not respond:** summarize agent work and parity review; note that full-suite verification is pending. Do **not** report Twin UI complete.

After confirmation, the orchestrator runs:

### Web — all unit + integration tests

```bash
cd frontend && npm test -- --watchAll=false --passWithNoTests
```

Covers `*.test.ts(x)` and `*.integration.test.tsx` under `frontend/src/`.

### iOS — all unit + integration (+ UITest) targets

```bash
cd ios-client && xcodebuild test \
  -scheme OutfitSuggestor \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:OutfitSuggestorTests \
  -only-testing:OutfitSuggestorUITests
```

If simulator name differs, use an available iPhone simulator from `xcrun simctl list devices available`.

### Backend (when orchestrator changed backend this feature)

```bash
cd backend && . venv/bin/activate && pytest -q
```

### Test Execution Report (required — orchestrator publishes to user)

After running full suites, always include this report in the final Twin UI message. Copy the template and fill every field; do not omit failed tests.

```markdown
## Test Execution Report

**Feature:** <feature-slug>  
**Branch:** <branch-name>  
**Overall:** PASS | FAIL

### Web (`frontend/`)

| Metric | Value |
|--------|-------|
| Command | `npm test -- --watchAll=false --passWithNoTests` |
| Suites | passed / total |
| Tests | passed / total |
| Duration | e.g. 2.4s |
| Status | PASS / FAIL |

**Failures (if any):**
- `path/to/file.test.tsx` — test name — one-line reason

**New tests this feature:**
- `path/to/new.test.tsx` — what it covers

### iOS (`ios-client/`)

| Metric | Value |
|--------|-------|
| Command | `xcodebuild test -scheme OutfitSuggestor …` |
| Simulator | e.g. iPhone 17 |
| Unit/Integration | passed / total (OutfitSuggestorTests) |
| UI tests | passed / total (OutfitSuggestorUITests) |
| Status | PASS / FAIL |

**Failures (if any):**
- `ClassName/testMethod` — one-line reason

**New tests this feature:**
- `OutfitSuggestorTests/FooTests.swift` — what it covers

### Backend (`backend/`) — if changed this feature

| Metric | Value |
|--------|-------|
| Command | `pytest -q` |
| Tests | passed / total |
| Status | PASS / FAIL / SKIPPED |

**Failures (if any):**
- `tests/test_foo.py::test_bar` — one-line reason

### Notes

- Flaky/skipped tests:
- Environment issues (simulator, DB, env vars):
```

**Do not report Twin UI complete** if Overall is FAIL or web/iOS full suite failed.

## Parallel agent prompts (include test block)

### Web subagent

```
Implement the WEB side on branch <BRANCH>.

SPEC: `.cursor/specs/<feature-slug>.md`

SCOPE: `frontend/**` ONLY.
FORBIDDEN: `ios-client/**`, `backend/**`.

Rules: `.cursor/rules/web-ui-ux.mdc`

TESTS (required before returning):
- Add/update unit + integration tests per spec Tests section
- Run: cd frontend && npm test -- --watchAll=false --passWithNoTests
- Fix failures; do not skip tests

ABOUT / GUIDE (when spec requires):
- Update `frontend/src/views/components/UserGuide.tsx` and `About.tsx` if the feature changes user-visible flows, copy, or capabilities described there
- Skip for pure layout/styling with no user-facing behavior change
- Update or add tests if Guide/About assertions exist (e.g. `GuideAndFooter.integration.test.tsx`)

Return: files changed, spec compliance, test files added, test run summary, About/Guide updated (yes/no).
```

### iOS subagent

```
Implement the iOS side on branch <BRANCH>.

SPEC: `.cursor/specs/<feature-slug>.md`

SCOPE: `ios-client/**` ONLY (exclude build-device/, xcuserdata/).
FORBIDDEN: `frontend/**`, `backend/**`.

Rules: `.cursor/rules/ios-ui-ux.mdc`

IPHONE / IPAD: Same UX on all devices — identical flows, copy, and actions. Layout-only tweaks via horizontalSizeClass / adaptiveContent; no iPad-only navigation or features.

TESTS (required before returning):
- Add/update OutfitSuggestorTests per spec Tests section
- Build: xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build
- Run new test classes if added
- Fix failures; do not skip tests

ABOUT / GUIDE (when spec requires):
- Update `ios-client/OutfitSuggestor/Views/UserGuideView.swift` and `AboutView.swift` if the feature changes user-visible flows, copy, or capabilities described there
- Skip for pure layout/styling with no user-facing behavior change
- Keep Guide/About copy aligned with web where both document the same feature

Return: files changed, spec compliance, test files added, build/test summary, About/Guide updated (yes/no).
```

## Contract pairs (sync when spec requires)

| Web | iOS |
|-----|-----|
| `frontend/src/utils/aiProgressSteps.ts` | `ios-client/OutfitSuggestor/Utils/AiProgressSteps.swift` |
| `frontend/src/services/ApiService.ts` | `ios-client/OutfitSuggestor/Services/APIService.swift` |
| Tailwind brand tokens | `ios-client/OutfitSuggestor/Theme/AppTheme.swift` |

## User copy-paste template

```text
Twin UI:

[Describe screens, flows, copy, and behavior]

iOS: keep iPhone and iPad UX identical — layout/spacing tweaks via horizontalSizeClass only.
Update About and Guide if user-facing behavior or copy changes.
```

## References

- [IOS_WEB_FEATURE_PARITY.md](../../IOS_WEB_FEATURE_PARITY.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [WEB_USER_INTERACTION.md](../../WEB_USER_INTERACTION.md)
- [ios-client/PROJECT_STRUCTURE.md](../../ios-client/PROJECT_STRUCTURE.md)
