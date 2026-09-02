---
name: publish-on-web
description: >-
  Cost-minimized ship: CI owns test gates (web+backend local, slim production).
  Agent commits/pushes, waits on gh via wait-ci-gate.py, deploys, optional merge.
  On failure stop (no in-chat retry). Triggers: "publish on web", "ship only".
disable-model-invocation: true
---

# Publish on Web (v4 — CI gates)

**Prefer a new chat** for this workflow. Do not continue a Twin UI thread.

**Locked defaults (this project):**

| Setting | Value |
|---------|--------|
| Local gate | GitHub Actions `test-local.yml` (Jest + pytest). Skip wait if `check-local-test-gate.py` exits 0 (local stamp **or** CI already green on this SHA). **Do not** run `./run_all_tests` in this chat unless the user says to run gates locally |
| Production gate | GitHub Actions `test-production.yml` (slim: `/health` + frontend HTTP + `tests_remote`), dispatched after deploy |
| Test results | Read **`.cursor/test-gates/last-report.json` only**. Do not ingest Actions logs or suite output |
| Retries | **None in this chat.** On fail: quote JSON, stop, new chat to fix |

iOS unit/UITests are **not** in CI. Twin UI still runs `./run_all_tests` locally (includes iOS).

End-to-end:

1. **Commit** if needed, then **local CI** (skip or push + `wait-ci-gate.py --workflow test-local.yml`)
2. **Ship** — push if needed, GitHub Pages, Railway (**no merge to `main` yet**)
3. **Production CI** — `wait-ci-gate.py --workflow test-production.yml --dispatch`
4. **Merge** — only if production passes; ask user to confirm

**`ship only`:** skip both CI gates; still commit/push/deploy; no merge.

---

## Trigger

```text
publish on web
```

```text
ship only
```

---

## Step 0 — Cost estimate (required)

```bash
python3 .cursor/scripts/estimate-workflow-cost.py \
  --workflow publish-on-web \
  --prompt "publish on web"
```

Share output; **wait for** `yes` / `proceed`. Then `estimate-workflow-cost.py start` with the same prompt.

---

## Prerequisites

| Requirement | Check |
|-------------|--------|
| User invoked skill | Deploy approval (merge needs a later confirm) |
| `gh` CLI | `gh auth status` (Actions: read/write) |
| Railway CLI | `railway status` |
| GitHub secrets (production gate) | `PRODUCTION_TEST_USERNAME`, `PRODUCTION_TEST_PASSWORD`; optional `API_BASE_URL`, `FRONTEND_URL` |
| `frontend/.env.production` | `REACT_APP_API_URL` for the frontend build |

If production secrets are missing, CI will fail at the production gate — tell the user to add them under repo **Settings → Secrets and variables → Actions**. Do not fall back to reading `.env.production.test` into chat.

---

## Flow (single attempt)

```
0. Cost estimate + approval
1. Commit (git safety; never stage secrets / venv / node_modules / .env.production.test)
2. python3 .cursor/scripts/check-local-test-gate.py
   - exit 0 → skip wait; note SOURCE in the report
   - else → git push -u origin HEAD
            new terminal: python3 .cursor/scripts/wait-ci-gate.py --workflow test-local.yml
            read last-report.json (not the terminal log)
3. Ship: push if needed + npm run deploy + railway up + curl health
4. new terminal: python3 .cursor/scripts/wait-ci-gate.py --workflow test-production.yml --dispatch
   read last-report.json
5. If production PASS → ask merge to main
On any FAIL → stop (do not fix, do not retry)
```

**Local CI FAIL:** do not deploy Pages/Railway. Quote `failing_tests` + `run_url` from JSON.

**Ship FAIL:** stop; no production dispatch.

**Production CI FAIL:** no merge. Quote JSON + `run_url`.

---

## Agent: wait on CI, read JSON

**Do not** ask the user to type “tests passed”.
**Do not** run `./run_all_tests` or `./run_production_tests` unless the user explicitly asks for local gates.

### Launch wait scripts

- Working directory: repo root
- **New** terminal
- `block_until_ms: 0`
- After `exit_code:` appears, read **only** `.cursor/test-gates/last-report.json`

Show: `overall`, `exit_code`, `mode`, `run_url`, `categories`, `failing_tests`.

**Gate:** `exit_code` 0 and `overall` `PASS`.

Do **not** paste `gh` job logs. One-line `CI_STATUS=` in the terminal is noise — ignore it.

---

## Step A — Local CI gate

```bash
python3 .cursor/scripts/check-local-test-gate.py
```

Exit 0 → skip wait.

Otherwise push, then:

```bash
python3 .cursor/scripts/wait-ci-gate.py --workflow test-local.yml
```

CI jobs: Web (Jest) + Backend (pytest). See `.github/workflows/test-local.yml`.

---

## Step B — Ship from current branch (no merge yet)

1. `git branch --show-current`
2. `git push -u origin HEAD` if the remote is missing this SHA
3. `cd frontend && npm run deploy`
4. `cd backend && railway up`
5. `curl` frontend URL + `<API_BASE_URL>/health`

**Do not merge to `main` in this step.**

---

## Step C — Production CI gate (slim)

After live deploy:

```bash
python3 .cursor/scripts/wait-ci-gate.py --workflow test-production.yml --dispatch
```

Same checks as `./run_production_tests`: API `/health`, frontend HTTP, `backend/tests_remote`.

**FAIL** → stop. **PASS** → Step D.

---

## Step D — Merge to `main`

Ask:

> Production tests passed. Merge `<branch>` into `main` and push?

Only on `yes` / `proceed` / `merge`.

```bash
git checkout main
git pull origin main
git merge <branch>
git push origin main
git checkout <branch>
```

---

## Workflow checklist

```
- [ ] 0. Cost estimate → user approves → start tracking
- [ ] A. check-local-test-gate.py → skip or wait-ci-gate test-local.yml PASS
- [ ] B. Push + npm run deploy + railway up
- [ ] C. wait-ci-gate test-production.yml --dispatch PASS
- [ ] D. Ask merge; on yes → merge + push main
- [ ] On failure: quote last-report.json, stop, new-chat fix
- [ ] estimate-workflow-cost.py end + Publish on Web — Report
```

---

## Execution report (required)

```markdown
## Publish on Web — Report

**Branch:** <branch>
**Attempt:** 1 (no in-chat retries)
**Overall:** SUCCESS | FAILED (stopped at <step>)

### Local gate
| Metric | Value |
|--------|-------|
| Skipped | yes / no (stamp / Actions) |
| Overall | PASS / FAIL / skipped |
| Run URL | (Actions URL or —) |
| Failed tests | (from last-report.json or —) |

### Ship (current branch, no merge yet)
- **Commit:** `<hash>` — <message>
- **Push:** origin/<branch> — OK / FAILED
- **GitHub Pages:** OK / FAILED
- **Railway:** OK / FAILED

### Production gate (CI slim)
| Metric | Value |
|--------|-------|
| Report | `.cursor/test-gates/last-report.json` |
| Run URL | |
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
```

---

## Failure handling

| Failure | Action |
|---------|--------|
| Local CI FAIL | No Pages/Railway. Quote JSON + run URL. **Stop.** |
| Production CI FAIL | No merge. Quote JSON. **Stop.** |
| Ship / deploy FAIL | Stop; no production dispatch. |
| Missing Actions secrets | Stop at production; tell user which secrets to add. |
| User declines merge | Ship + production pass still success. |

Do **not** auto-fix product code in this chat.

---

## References

- `.github/workflows/test-local.yml` — Jest + pytest on push/PR
- `.github/workflows/test-production.yml` — slim live gate (`workflow_dispatch`)
- `.cursor/scripts/wait-ci-gate.py` — wait / `--check-only` / `--dispatch`
- `.cursor/scripts/check-local-test-gate.py` — stamp or CI already green
- `./run_all_tests` / `./run_production_tests` — local equivalents (Twin UI / manual)
- [TEST_CASE_EXECUTION_GUIDE.md](../../../TEST_CASE_EXECUTION_GUIDE.md)
