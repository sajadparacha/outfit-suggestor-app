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
- [ ] 0. Run cost estimate script; user confirms before any work
- [ ] 1. Confirm branch (`git branch --show-current`)
- [ ] 2. Create spec with Tests (required) section filled; mark if **About** / **Guide** need updates
- [ ] 3. Orchestrator: backend/contract + targeted backend pytest (if needed)
- [ ] 4. Spawn web + iOS Task subagents in ONE message (required)
- [ ] 5. Parity review vs spec, About/Guide (when required), and IOS_WEB_FEATURE_PARITY.md
- [ ] 6. Publish Targeted Test Report (agent-returned results only)
- [ ] 7. Open a **new terminal** and start `./run_all_tests` (do not ingest suite logs)
- [ ] 8. Run `estimate-workflow-cost.py end`; include **Workflow actual cost** in summary
- [ ] 9. Mark spec done; summarize for user (implementation complete on targeted tests; full suite in terminal)
```

## Mandatory tests (every Twin UI feature)

### Orchestrator (backend)

When `backend/` changes:

- Add/update `backend/tests/test_<feature>.py` (or extend existing)
- Cover happy path, auth/guest edge cases, error responses
- Run **targeted only**: `cd backend && . venv/bin/activate && pytest tests/<file> -q`
- Fix failures before spawning UI agents
- Do **not** run full `pytest -q` as an end gate in this chat

### Web agent (required)

- **Unit tests** for utils, controllers, pure components (`*.test.tsx` next to component or under `src/`)
- **Integration tests** for user flows (`*.integration.test.tsx`, `renderApp()` from `src/test/renderWithRouter.tsx`)
- Mock API via MSW handlers in `src/test/msw/handlers.ts` when endpoints change
- Run **ONLY** the spec-listed test file(s), e.g.:
  `cd frontend && npm test -- --watchAll=false src/path/to/file.test.ts`
- Fix failures; do not skip tests
- Do **NOT** run the full Jest suite before returning
- Return: test file paths + pass count (e.g. `1 suite, 13 passed`)

Minimum: **at least one test** that asserts the new behavior (not just "renders without crash").

### iOS agent (required)

- **Unit tests** in `ios-client/OutfitSuggestorTests/` for ViewModels, parsers, copy helpers
- **Integration tests** in `OutfitSuggestorTests/*IntegrationTests.swift` when API/ViewModel logic changes
- **UITests** in `OutfitSuggestorUITests/` only for critical E2E flows (optional extra, not a substitute for unit tests)
- Build if needed: `xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build`
- Run **ONLY** the spec-listed class:
  `xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/<TestClass>`
- Do **NOT** run `OutfitSuggestorUITests` or the full `OutfitSuggestorTests` target unless the spec names that class
- Fix failures; do not skip tests
- Return: test file paths + build/test result

Minimum: **at least one unit or integration test** for new behavior. If truly impossible, document why in return — orchestrator must reject unless spec marks exception.

## End of Twin UI / Cost Twin UI (orchestrator — same policy)

After both agents return and parity review is done:

1. Publish a **Targeted Test Report** from agent-returned results only (paths, pass counts, commands they ran). Use `.cursor/specs/_test-report-template.md`.
2. Open a **new terminal** in the Cursor terminal panel and start the full matrix:

```bash
./run_all_tests
```

(repo root wrapper → `scripts/run_all_tests.sh`)

**How to launch (required):**

- Working directory: repo root
- Run in a **new** terminal session, not reused for other commands
- Start in the background / with `block_until_ms: 0` (or equivalent) so it is visible in the Terminal UI
- Do **NOT** AwaitShell, poll, or read the full stdout/stderr back into the chat
- Do **NOT** paste xcodebuild/Jest/pytest logs into the Twin UI summary
- One-line smoke check that the process started is OK; then leave it running

3. Do **NOT** ask “ready to run full suites?” — just start `./run_all_tests` in that terminal.
4. Do **NOT** run full `npm test`, full iOS `xcodebuild test`, or full `pytest -q` via the agent Shell in this chat (duplicates the terminal run and dumps logs into context).
5. Final user message must say:
   - Targeted tests (agents) passed/failed as reported
   - Full suite is running in a new terminal: `./run_all_tests`
   - Twin UI implementation is complete based on spec + targeted tests; full-suite pass/fail is in that terminal (user watches it)
6. **Exception:** if the user explicitly says “run full suites in this chat” / “wait for `./run_all_tests` and report”, then it is OK to wait and summarize — still prefer quoting only the summary footer, not the entire log.

**Do not report Twin UI complete** if new behavior has no tests added, or if targeted agent tests failed. Full-suite verification lives in the terminal, not as an in-chat gate.

### Targeted Test Report (required — orchestrator publishes to user)

```markdown
## Targeted Test Report

**Feature:** <feature-slug>  
**Branch:** <branch-name>  
**Overall (targeted):** PASS | FAIL

### Web (`frontend/`)

| Metric | Value |
|--------|-------|
| Command | (spec-listed file(s) only) |
| Result | e.g. 1 suite, 13 passed |
| Status | PASS / FAIL |

**New tests this feature:**
- `path/to/new.test.tsx` — what it covers

### iOS (`ios-client/`)

| Metric | Value |
|--------|-------|
| Command | `-only-testing:OutfitSuggestorTests/<TestClass>` |
| Result | e.g. 14 tests, 0 failures |
| Status | PASS / FAIL |

**New tests this feature:**
- `OutfitSuggestorTests/FooTests.swift` — what it covers

### Backend (`backend/`) — if changed this feature

| Metric | Value |
|--------|-------|
| Command | `pytest tests/<file> -q` (targeted) |
| Result | passed / total |
| Status | PASS / FAIL / SKIPPED |

### Full suite

| Metric | Value |
|--------|-------|
| Command | `./run_all_tests` |
| Status | Launched in new terminal (user watches; orchestrator did not ingest logs) |

### Notes

- Flaky/skipped (from targeted runs only):
```

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
- Run ONLY the spec-listed test file(s), e.g.:
  cd frontend && npm test -- --watchAll=false src/path/to/file.test.ts
- Fix failures; do not skip tests
- Do NOT run the full Jest suite before returning

ABOUT / GUIDE (when spec requires):
- Update `frontend/src/views/components/UserGuide.tsx` and `About.tsx` if the feature changes user-visible flows, copy, or capabilities described there
- Skip for pure layout/styling with no user-facing behavior change
- Update or add tests if Guide/About assertions exist (e.g. `GuideAndFooter.integration.test.tsx`)

Return: files changed, spec compliance, test files added, targeted test run summary, About/Guide updated (yes/no).
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
- Build if needed: xcodebuild -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' build
- Run ONLY the spec-listed class:
  xcodebuild test -scheme OutfitSuggestor -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:OutfitSuggestorTests/<TestClass>
- Do NOT run OutfitSuggestorUITests or the full OutfitSuggestorTests target unless the spec names that class
- Fix failures; do not skip tests

ABOUT / GUIDE (when spec requires):
- Update `ios-client/OutfitSuggestor/Views/UserGuideView.swift` and `AboutView.swift` if the feature changes user-visible flows, copy, or capabilities described there
- Skip for pure layout/styling with no user-facing behavior change
- Keep Guide/About copy aligned with web where both document the same feature

Return: files changed, spec compliance, test files added, targeted build/test summary, About/Guide updated (yes/no).
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
