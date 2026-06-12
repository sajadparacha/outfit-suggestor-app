# Agent workflow: Parallel Web + iOS UI/UX

One instruction → spec → **two parallel agents** (web + iOS) → **parity + test gate**. On the **current branch**.

## Trigger phrase

```text
Twin UI:

[your instruction]
```

**Twin** = two platforms, two agents, always in parallel.

## What happens

1. Orchestrator writes `.cursor/specs/<feature-slug>.md` (includes **Tests required** section)
2. Orchestrator handles `backend/` + **pytest** (if API/logic changes)
3. **Two subagents** run in parallel — web (`frontend/`) and iOS (`ios-client/`)
4. Each agent **adds tests** for new behavior before returning; updates **About** and **Guide** when the spec says user-visible docs need it
5. Orchestrator **asks for confirmation** before running full web + iOS test suites (and backend if changed)
6. After user confirms: run **full web + iOS test suites** (all unit + integration; iOS includes UITests)
7. Orchestrator runs full `pytest` if backend changed this feature
8. Publish **Test Execution Report** (suites passed/failed, durations, failure details)
9. Report done only when all full suites pass (or note verification pending if user declined)

The orchestrator **does not** implement web or iOS UI itself.

## Mandatory tests

| Phase | Owner | What | Command |
|-------|-------|------|---------|
| During work | Orchestrator | `backend/tests/` when API changes | `pytest tests/<file> -q` |
| During work | Web agent | New unit + integration tests for feature | (orchestrator runs full suite at end) |
| During work | iOS agent | New unit/integration tests for feature | (orchestrator runs full suite at end) |
| **End of Twin UI** | **Orchestrator** | **All web tests** (after user confirms) | `npm test -- --watchAll=false` |
| **End of Twin UI** | **Orchestrator** | **All iOS tests** (after user confirms) | `xcodebuild test … OutfitSuggestorTests + OutfitSuggestorUITests` |
| End of Twin UI | Orchestrator | Full backend (if changed, after user confirms) | `pytest -q` |

A Twin UI feature is **not done** if the **full** web or iOS suite fails, new behavior has no tests, or the **Test Execution Report** is missing.

Report template: `.cursor/specs/_test-report-template.md`

## Example

```text
Twin UI:

Add a heart on suggestion results to save favorites. Empty state when none saved. Require login.

iOS: keep iPhone and iPad UX identical — layout/spacing tweaks via horizontalSizeClass only.
```

## iPhone / iPad (iOS)

On every Twin UI feature, keep **iPhone and iPad the same UX** (flows, copy, actions). Only layout/spacing may differ on regular horizontal size class. See `.cursor/rules/ios-ui-ux.mdc` and the **iPhone / iPad** section in `.cursor/specs/_template.md`.

Optional lines to append to any Twin UI prompt:

```text
iOS: keep iPhone and iPad UX identical — layout/spacing tweaks via horizontalSizeClass only.
Update About and Guide if user-facing behavior or copy changes.
```

## Repository layout

| Layer | Path | Owner |
|-------|------|--------|
| Backend | `backend/` | Orchestrator (when needed) |
| Web UI + tests | `frontend/` | Web subagent |
| iOS UI + tests | `ios-client/OutfitSuggestor/` + `OutfitSuggestorTests/` | iOS subagent |
| Specs | `.cursor/specs/` | Orchestrator |

## Cursor config

| File | Purpose |
|------|---------|
| `.cursor/rules/parallel-ui-orchestrator.mdc` | Strict orchestration + test gate |
| `.cursor/rules/web-ui-ux.mdc` | Web scope (`frontend/**`) |
| `.cursor/rules/ios-ui-ux.mdc` | iOS scope (`ios-client/**`) |
| `.cursor/skills/parallel-ui-ux/SKILL.md` | Workflow, prompts, test requirements |
| `.cursor/skills/publish-on-web/SKILL.md` | Test → commit → push → GitHub Pages + Railway (current branch; **no merge to main**) |
| `.cursor/specs/_template.md` | Spec + Tests (required) template |
| `.cursor/specs/_test-report-template.md` | End-of-run Test Execution Report |

## Commits

Agents commit only when you explicitly ask.

## Further reading

- [AGENT_WORKFLOWS.md](AGENT_WORKFLOWS.md) — Twin UI & Publish on Web writeup
- [IOS_WEB_FEATURE_PARITY.md](IOS_WEB_FEATURE_PARITY.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [WEB_USER_INTERACTION.md](WEB_USER_INTERACTION.md)
