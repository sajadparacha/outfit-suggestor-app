# Agent workflow: Parallel Web + iOS UI/UX

One instruction → spec → **two parallel agents** (web + iOS) → **parity + targeted tests** → **new terminal `./run_all_tests`**. On the **current branch**.

## Trigger phrase

```text
Twin UI:

[your instruction]
```

**Small cross-platform task (lower token use):** start with `Cost Twin UI:` instead — still spawns web + iOS agents, but narrow file scope, short spec, one test file per platform. See `.cursor/rules/cost-conscious-agent.mdc`.

**Before any workflow starts**, the agent runs `.cursor/scripts/estimate-workflow-cost.py` and waits for your **yes/proceed** (Twin UI, Cost Twin UI, and publish on web). After approval it runs `… start`; when the workflow finishes it runs `… end` and reports **actual** Cursor spend vs the estimate.

**Twin** = two platforms, two agents, always in parallel.

## What happens

1. Orchestrator writes `.cursor/specs/<feature-slug>.md` (includes **Tests required** section)
2. Orchestrator handles `backend/` + **targeted pytest** (if API/logic changes)
3. **Two subagents** run in parallel — web (`frontend/`) and iOS (`ios-client/`)
4. Each agent **adds tests** for new behavior and runs the **spec-listed** related tests until green; updates **About** and **Guide** when the spec says user-visible docs need it
5. Orchestrator parity review (About/Guide / `IOS_WEB_FEATURE_PARITY.md` when needed)
6. Publish **Targeted Test Report** (agent-returned results only)
7. Open a **new terminal** and start `./run_all_tests` (do **not** ingest suite logs into chat)
8. Report done when spec + targeted tests pass; full-suite pass/fail is in that terminal

The orchestrator **does not** implement web or iOS UI itself.

## Mandatory tests

| Phase | Owner | What | Command |
|-------|-------|------|---------|
| During work | Orchestrator | `backend/tests/` when API changes | `pytest tests/<file> -q` (targeted) |
| During work | Web agent | Spec-listed unit + integration tests | `npm test -- --watchAll=false <file>` |
| During work | iOS agent | Spec-listed unit/integration class | `xcodebuild test … -only-testing:OutfitSuggestorTests/<Class>` |
| **End of Twin UI** | **Orchestrator** | Launch full matrix in new terminal | `./run_all_tests` (no log ingest) |

A Twin UI feature is **not done** if new behavior has no tests, or targeted agent tests fail, or the **Targeted Test Report** is missing. Full-suite verification is watched in the terminal.

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
| `.cursor/skills/publish-on-web/SKILL.md` | CI local + slim production Actions → ship branch → optional merge; fail-stop |
| `.cursor/specs/_template.md` | Spec + Tests (required) template |
| `.cursor/specs/_test-report-template.md` | End-of-run Targeted Test Report |

## Commits

Agents commit only when you explicitly ask.

## Further reading

- [AGENT_WORKFLOWS.md](AGENT_WORKFLOWS.md) — Twin UI & Publish on Web writeup
- [IOS_WEB_FEATURE_PARITY.md](IOS_WEB_FEATURE_PARITY.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [WEB_USER_INTERACTION.md](WEB_USER_INTERACTION.md)

## Cursor Cloud specific instructions

Dependencies (backend `venv`, `node_modules`) are refreshed by the startup update script. The notes below are runtime caveats that the update script intentionally does NOT handle.

### Services (Linux cloud VM)

| Service | Run command (from repo root) | Port | Notes |
|---|---|---|---|
| Backend API (FastAPI) | `cd backend && . venv/bin/activate && python main.py` | 8001 | Reads `backend/.env`. Health: `GET /`, `/health`, docs `/docs`. |
| Web frontend (React/CRACO) | `cd frontend && BROWSER=none npm start` | 3000 | Talks to backend via `REACT_APP_API_URL` (`frontend/.env` → `http://localhost:8001`). |
| PostgreSQL 16 | `sudo pg_ctlcluster 16 main start` | 5432 | Must be started each session (see below). DB `outfit_suggestor`, user/pass `postgres`/`postgres`. |
| iOS client (`ios-client/`) | — | — | Requires macOS + Xcode; cannot build/run on this Linux VM. Source-only here. |

### Startup caveats (non-obvious)

- **PostgreSQL is not auto-started.** Run `sudo pg_ctlcluster 16 main start` at the start of each session before launching the backend (the backend auto-creates tables on startup once the DB is reachable). Verify with `pg_lsclusters`.
- **`backend/.env` and `frontend/.env` are git-ignored** and live only in the VM snapshot. `backend/.env` sets `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/outfit_suggestor` and `EMAIL_ENABLED=false` (so signup works without SMTP). If the snapshot is reset, recreate them from the `.env.example` files.
- **No `OPENAI_API_KEY` is set by default.** Auth, account creation, and non-AI reads/writes work, but AI-backed endpoints (`/api/suggest-outfit`, wardrobe AI analysis) — and `/api/outfit-history`, which shares the outfit controller dependency — return HTTP 500 with `OPENAI_API_KEY environment variable is not set`. In the web UI this surfaces as a CRA dev "Failed to fetch" error overlay (dismissable, non-blocking). To exercise AI features, add `OPENAI_API_KEY` to `backend/.env` and restart the backend.

### Tests

- Backend: `cd backend && . venv/bin/activate && pytest tests/ -q` (uses in-memory SQLite + mocked AI, so no Postgres/OpenAI needed).
- Frontend: `cd frontend && CI=true npm test -- --watchAll=false` (MSW-mocked API).
