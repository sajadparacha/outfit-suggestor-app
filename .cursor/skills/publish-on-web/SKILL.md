---
name: publish-on-web
description: >-
  Remind the user to run full web, backend, and iOS test suites in their
  terminal (agent does not run them); then commit and push the current branch
  (do not merge to main), publish frontend to GitHub Pages, and deploy backend
  to Railway. Use when the user says "publish on web", "Publish on web", or
  wants to ship the web app.
disable-model-invocation: true
---

# Publish on Web

End-to-end release workflow for **outfit-suggestor-app**: remind user to test in terminal → commit → push → GitHub Pages → Railway.

**Do not run test suites in this workflow.** Show the user the terminal commands below and remind them to run all suites locally before deploy. Ask them to confirm tests passed before commit/push/deploy. If they report failures, stop — do **not** commit, push, or deploy.

**Do not merge to `main`.** Ship from the **current branch** only — commit, push `HEAD`, then deploy. Never `git merge main`, `git checkout main && git merge …`, or open/complete a merge-to-main step as part of this workflow.

---

## Trigger

User says:

```text
publish on web
```

or invokes this skill by name.

---

## Step 0 — Cost estimate (required)

Before git operations or deploy, **stop** and show an estimate:

```bash
python3 .cursor/scripts/estimate-workflow-cost.py \
  --workflow publish-on-web \
  --prompt "publish on web"
```

Share the output and **wait for explicit approval** (`yes` / `proceed`). If the user declines, exit. If the script fails, cite the `publish-on-web` range in `.cursor/workflow-cost-baselines.json` and still ask.

After approval, start tracking:

```bash
python3 .cursor/scripts/estimate-workflow-cost.py start \
  --workflow publish-on-web \
  --prompt "publish on web"
```

_Note: this estimates **Cursor agent** cost only, not Railway/hosting fees._

---

## Prerequisites (check before starting)

| Requirement | Check |
|-------------|--------|
| Clean intent | User invoked this skill (counts as explicit commit + push + deploy approval) |
| `gh` CLI | `gh auth status` — needed for push if HTTPS credential helper missing |
| Railway CLI | `railway --version` and `railway status` — project must be linked (`railway link`) |
| Node + Python venv | `frontend/node_modules`, `backend/venv` present |
| Xcode (iOS tests) | Simulator available; fallback name: `iPhone 17` |

If Railway is not linked, run `railway link` from repo root (user may need to approve in browser). If `frontend/.env.production` is missing, warn user that production build may use wrong API URL — do not create it with secrets unless user provides the Railway URL.

---

## Workflow checklist

```
- [ ] 1. Record branch name (`git branch --show-current`) — stay on this branch; do not merge to main
- [ ] 2. Remind user to run all test suites in terminal (agent does not run them)
- [ ] 3. User confirms tests passed → inspect changes, draft commit message
- [ ] 4. Stage, commit (exclude secrets & build artifacts)
- [ ] 5. Push current branch to origin (`git push -u origin HEAD`) — not a merge to main
- [ ] 6. Publish GitHub Pages
- [ ] 7. Deploy backend to Railway
- [ ] 8. Verify deployments
- [ ] 9. Run `python3 .cursor/scripts/estimate-workflow-cost.py end` — include actual cost in report
- [ ] 10. Publish execution report to user
```

---

## Step 1 — Remind user to run tests (do not run in agent)

**Do not execute** web, backend, or iOS test commands in this workflow. Post a reminder like the section below and **wait for the user to confirm all suites passed** before continuing to commit/push/deploy.

### Reminder to post to the user

**Run all tests in your terminal before deploy**

The agent does not run full suites during publish on web. Please run these locally and confirm when they pass.

**All suites (one script):**

```bash
run_all_tests
```

Or from repo root without alias:

```bash
./run_all_tests
```

Legacy path (same script):

```bash
bash .cursor/skills/publish-on-web/scripts/run-all-tests.sh
```

**Or individually:**

Web (~3 s):

```bash
cd frontend && npm test -- --watchAll=false --passWithNoTests
```

Backend (~4 min):

```bash
cd backend && . venv/bin/activate && pytest -q
```

iOS (~4–8 min; adjust simulator if needed):

```bash
cd ios-client && xcodebuild test \
  -scheme OutfitSuggestor \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:OutfitSuggestorTests \
  -only-testing:OutfitSuggestorUITests
```

If the simulator name fails: `xcrun simctl list devices available | grep iPhone`

Reply **tests passed** (or report failures) when done.

**Gate rule:** If the user reports failures or has not confirmed, **exit workflow**. No commit/push/deploy until they confirm all suites passed.

---

## Step 2 — Commit current branch

Follow git safety rules:

1. In parallel:
   - `git status`
   - `git diff` (staged + unstaged)
   - `git log -3 --oneline`
2. **Never stage:**
   - `.env`, `.env.*` with secrets (e.g. `frontend/.env.development`)
   - `ios-client/build-device/`, `**/xcuserdata/**`, `node_modules/`
   - `backend/venv/`, `__pycache__/`, `.pytest_cache/`
3. Draft a 1–2 sentence commit message from the diff (focus on **why**).
4. Commit with HEREDOC:

```bash
git add <relevant-files>
git commit -m "$(cat <<'EOF'
Your message here.

EOF
)"
```

5. `git status` to confirm commit succeeded.

Do **not** amend unless a hook auto-modified files and rules allow it.

---

## Step 3 — Push to GitHub

Push the **same branch** you tested and committed on — do **not** merge into `main` first.

```bash
git push -u origin HEAD
```

Use `required_permissions: ["all"]` / network if the environment blocks push.

GitHub Pages deploy (step 4) uses `npm run deploy` from the current branch’s `frontend/` tree. A push to **`main`** may *also* trigger [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml), but that is optional CI — **not** a required step in this workflow.

---

## Step 4 — Publish GitHub Pages

From repo root:

```bash
cd frontend && npm run deploy
```

This runs `predeploy` (`npm run build`) then `gh-pages -d build`.

**Production API URL:** build reads `frontend/.env.production` (`REACT_APP_API_URL`). Ensure it points at the live Railway backend before deploy.

**Live URLs (this project):**

| Site | URL |
|------|-----|
| Custom domain | https://closiq.me |
| GitHub Pages | https://sajadparacha.github.io/outfit-suggestor-app |

---

## Step 5 — Deploy backend to Railway

From repo root (linked project required):

```bash
cd backend && railway up
```

Railway builds/deploys the Python backend (`backend/` root per project settings). Auto-deploy also occurs on push if the GitHub repo is connected in Railway dashboard.

**Verify:**

```bash
curl -s https://<your-railway-host>/health
```

Expect JSON with `"status":"healthy"`.

---

## Step 6 — Execution report (required)

Always post this summary to the user:

```markdown
## Publish on Web — Report

**Branch:** <branch>
**Overall:** SUCCESS | FAILED (stopped at <step>)

### Tests (user-run in terminal)
| Suite | Result | Details |
|-------|--------|---------|
| Web | PASS/FAIL / not confirmed | user-reported |
| Backend | PASS/FAIL / not confirmed | user-reported |
| iOS | PASS/FAIL / not confirmed | user-reported |

_Note: agent did not run suites; user confirmed in terminal._

### Git
- **Commit:** `<hash>` — <message>
- **Push:** origin/<branch> — OK / FAILED

### Deployments
| Target | Command | Status |
|--------|---------|--------|
| GitHub Pages | `npm run deploy` | OK / FAILED / SKIPPED |
| Railway | `railway up` | OK / FAILED / SKIPPED |
| GitHub Actions | push to main | triggered / N/A |

### Live checks
- Frontend: <URL> — HTTP status
- Backend /health: <URL> — response

### Cursor cost (required)

Run `python3 .cursor/scripts/estimate-workflow-cost.py end` and paste the **Workflow actual cost** section here (estimated vs actual, API calls, on-demand portion).

### Notes
- Failures, skipped steps, or manual follow-ups
```

---

## Failure handling

| Failure | Action |
|---------|--------|
| User reports test failures | Stop. No deploy until fixed and user re-confirms. |
| User has not confirmed tests | Stop at step 1 reminder. No deploy. |
| User or agent about to merge to `main` | **Stop.** Publish ships from the current branch only. |
| Nothing to commit | Skip commit; ask user if they still want push/deploy. |
| Push rejected | Report error; do not deploy. |
| `npm run deploy` fails | Report; backend may still be on Railway from prior deploy. |
| `railway up` fails | Report; suggest `railway status` and dashboard logs. |
| Not logged into Railway | `railway login` then retry. |

---

## References

- [DEPLOYMENT_INSTRUCTIONS.md](../../../DEPLOYMENT_INSTRUCTIONS.md)
- [RAILWAY_DEPLOYMENT_STEPS.md](../../../RAILWAY_DEPLOYMENT_STEPS.md)
- [PRODUCTION_DEPLOYMENT_GUIDE.md](../../../PRODUCTION_DEPLOYMENT_GUIDE.md)
- Frontend deploy script: `frontend/package.json` → `npm run deploy`
- CI Pages workflow: `.github/workflows/deploy.yml`
