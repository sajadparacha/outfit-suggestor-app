---
name: publish-on-web
description: >-
  Local test gate (agent-launched terminal, auto-read results) → ship from
  current branch → production test gate (full matrix vs live API) → optional
  merge to main after user confirms. Retries up to 3 times (always redeploy on
  retry). Use when the user says "publish on web", "Publish on web", or wants
  to ship the web app.
disable-model-invocation: true
---

# Publish on Web (v2)

**Locked defaults (this project):**

| Setting | Value |
|---------|--------|
| Production gate | **Option C** — full matrix (`./run_production_tests` = same categories as local, vs live API) |
| Test results | **Auto-read** from agent terminal logs (`exit_code` + summary table); do **not** wait for user “tests passed” |
| Retries | Up to **3** attempts; **always redeploy** on every retry (local gate → ship → production gate), even if only production failed |

End-to-end release for **outfit-suggestor-app**:

1. **Local gate** — agent opens a new terminal, runs `./run_all_tests`, auto-reads results
2. **Ship** — commit, push `HEAD`, GitHub Pages, Railway (**no merge to `main` yet**)
3. **Production gate** — second new terminal, `./run_production_tests` (Option C: same categories vs live API), auto-read results
4. **Merge** — only if production gate passes; ask user to confirm merge to `main`

**Retries:** up to **3 full attempts**. On any local or production failure: list failing tests, agent tries to fix, restart from step 1. **Always redeploy** on every retry (local → ship → production), even if only production failed.

---

## Trigger

```text
publish on web
```

or invoke this skill by name.

---

## Step 0 — Cost estimate (required)

```bash
python3 .cursor/scripts/estimate-workflow-cost.py \
  --workflow publish-on-web \
  --prompt "publish on web"
```

Share output; **wait for** `yes` / `proceed`. Then:

```bash
python3 .cursor/scripts/estimate-workflow-cost.py start \
  --workflow publish-on-web \
  --prompt "publish on web"
```

---

## Prerequisites

| Requirement | Check |
|-------------|--------|
| User invoked skill | Counts as deploy approval (merge needs separate confirm) |
| `gh` CLI | `gh auth status` |
| Railway CLI | `railway status` (linked project) |
| `frontend/node_modules`, `backend/venv` | Present |
| Xcode + simulator | Default `iPhone 17` |
| `frontend/.env.production` | `REACT_APP_API_URL` for build + production gate |
| `.env.production.test` | Copy from `.env.production.test.example` — `TEST_USERNAME`, `TEST_PASSWORD` (gitignored) |

If `.env.production.test` is missing, stop and tell user to create it before production gate.

---

## Attempt loop (max 3)

```
attempt = 1
while attempt <= 3:
  A. Local gate     → ./run_all_tests (new terminal, auto-read)
  B. Ship           → commit + push HEAD + npm run deploy + railway up
  C. Production gate → ./run_production_tests (new terminal, auto-read)
  if C passes → ask merge to main → break
  if C fails  → list failures, fix, attempt++, retry from A (always redeploy)
if attempt > 3 and still failing → stop with report
```

**Local gate failure:** do not ship; list failures, fix, `attempt++`, retry from A.

**Ship failure:** stop attempt; report error (no production gate until ship succeeds).

**Production gate failure:** list failures from terminal log (`=== Failing tests ===` + summary table), fix, `attempt++`, **full retry from A including redeploy**.

---

## Agent: launch tests in new terminal and auto-read results

**Do not** ask the user to type “tests passed”. **Do** launch suites in a **new terminal** and read the summary when the process ends.

### Launch (required pattern)

- Working directory: repo root
- **New** terminal session (not reused for other commands)
- Start in background: `block_until_ms: 0` (or equivalent)
- Command:
  - Local: `./run_all_tests`
  - Production: `./run_production_tests`

### Auto-read (required)

Poll the terminal output file until `exit_code:` appears (or use Await with a completion pattern). Extract and show the user:

- `=== Test Results ===` summary table (Overall row)
- `=== Failing tests ===` section when present
- `exit_code` (0 = pass)

**Gate:** `exit_code: 0` and Overall **PASS** → continue. Otherwise → failure path (fix + retry or stop at attempt 3).

**Do not** paste full xcodebuild/Jest/pytest logs into chat — quote the summary table and failing-test list only.

---

## Step A — Local test gate

```bash
./run_all_tests
```

Same matrix as today: web Jest + backend pytest (local) + iOS unit/integration + iOS UITests.

**FAIL** → list failures, fix, next attempt (do not ship).  
**PASS** → Step B.

---

## Step B — Ship from current branch (no merge yet)

1. Record branch: `git branch --show-current`
2. Commit (git safety rules; never stage secrets, `venv`, `node_modules`, `xcuserdata`)
3. `git push -u origin HEAD`
4. `cd frontend && npm run deploy`
5. `cd backend && railway up`
6. Verify: `curl` frontend URL + `<API_BASE_URL>/health`

**Do not merge to `main` in this step.**

---

## Step C — Production test gate (Option C)

Second **new** terminal:

```bash
./run_production_tests
```

Same categories, production wiring:

| Category | Production behavior |
|----------|---------------------|
| Web | Jest with `REACT_APP_API_URL` from `frontend/.env.production` |
| Backend | `backend/tests_remote` vs `API_BASE_URL` + credentials |
| iOS | `Release` build + `API_BASE_URL` env (live Railway API) |

Credentials: `.env.production.test` (see `.env.production.test.example`).

Auto-read results; show production test report to user.

**FAIL** → list failures, fix, **retry from Step A** (always redeploy).  
**PASS** → Step D.

---

## Step D — Merge to `main` (only after production pass)

Ask explicitly:

> Production tests passed. Merge `<branch>` into `main` and push?

Proceed **only** on `yes` / `proceed` / `merge`.

```bash
git checkout main
git pull origin main
git merge <branch>
git push origin main
git checkout <branch>   # return to feature branch if user was working there
```

If user declines merge, report success for ship + production gate only.

---

## Workflow checklist

```
- [ ] 0. Cost estimate → user approves → start tracking
- [ ] 1. attempt ≤ 3:
- [ ]    A. New terminal: ./run_all_tests → auto-read → PASS required
- [ ]    B. Commit + push HEAD + npm run deploy + railway up
- [ ]    C. New terminal: ./run_production_tests → auto-read → show report
- [ ]    D. On C pass: ask merge to main; on yes → merge + push main
- [ ]    On failure: list failing tests, fix, retry from A (always redeploy)
- [ ] 2. estimate-workflow-cost.py end + Publish on Web — Report
```

---

## Execution report (required)

```markdown
## Publish on Web — Report

**Branch:** <branch>
**Attempt:** <n>/3
**Overall:** SUCCESS | FAILED (stopped at <step>)

### Local gate (./run_all_tests)
| Metric | Value |
|--------|-------|
| Terminal | auto-read |
| Overall | PASS / FAIL |
| Failed tests | (list or —) |

### Ship (current branch, no merge yet)
- **Commit:** `<hash>` — <message>
- **Push:** origin/<branch> — OK / FAILED
- **GitHub Pages:** OK / FAILED
- **Railway:** OK / FAILED

### Production gate (./run_production_tests)
| Metric | Value |
|--------|-------|
| Terminal | auto-read |
| Overall | PASS / FAIL |
| Failed tests | (list or —) |

### Merge to main
- **Asked:** yes / no
- **Result:** merged + pushed / declined / not reached

### Live checks
- Frontend: <URL> — HTTP status
- Backend /health: <URL> — response

### Cursor cost
(paste `estimate-workflow-cost.py end` output)

### Notes
- Retries, fixes applied, manual follow-ups
```

---

## Failure handling

| Failure | Action |
|---------|--------|
| Local gate FAIL | No ship. List failures, fix, retry attempt (max 3). |
| Production gate FAIL | List failures, fix, **full retry from local gate + redeploy** (max 3). |
| Ship / deploy FAIL | Stop current attempt; report; do not run production gate until ship OK. |
| Missing `.env.production.test` | Stop before production gate; instruct user to create from example. |
| 3 attempts exhausted | Stop; report all failing tests; no merge. |
| User declines merge | Ship + production pass still reported as success. |

---

## References

- `scripts/run_all_tests.sh` — local gate
- `run_production_tests` / `scripts/run_all_tests.sh --production` — production gate
- `.env.production.test.example` — remote test credentials
- [TEST_CASE_EXECUTION_GUIDE.md](../../../TEST_CASE_EXECUTION_GUIDE.md)
- [DEPLOYMENT_INSTRUCTIONS.md](../../../DEPLOYMENT_INSTRUCTIONS.md)
- `frontend/package.json` → `npm run deploy`
