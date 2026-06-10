---
name: publish-on-web
description: >-
  Run full web, backend, and iOS test suites; on success commit and push the
  current branch (do not merge to main), publish frontend to GitHub Pages, and
  deploy backend to Railway. Use when the user says "publish on web",
  "Publish on web", or wants to ship the web app after tests pass.
disable-model-invocation: true
---

# Publish on Web

End-to-end release workflow for **outfit-suggestor-app**: test → commit → push → GitHub Pages → Railway.

**Stop immediately** if any test suite fails. Do **not** commit, push, or deploy on failure.

**Do not merge to `main`.** Ship from the **current branch** only — commit, push `HEAD`, then deploy. Never `git merge main`, `git checkout main && git merge …`, or open/complete a merge-to-main step as part of this workflow.

---

## Trigger

User says:

```text
publish on web
```

or invokes this skill by name.

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
- [ ] 2. Run all test suites (gate)
- [ ] 3. If all pass → inspect changes, draft commit message
- [ ] 4. Stage, commit (exclude secrets & build artifacts)
- [ ] 5. Push current branch to origin (`git push -u origin HEAD`) — not a merge to main
- [ ] 6. Publish GitHub Pages
- [ ] 7. Deploy backend to Railway
- [ ] 8. Verify deployments
- [ ] 9. Publish execution report to user
```

Optional fast gate script (tests only):

```bash
bash .cursor/skills/publish-on-web/scripts/run-all-tests.sh
```

---

## Step 1 — Run all tests (mandatory gate)

Run **all three** suites. Use generous timeouts (iOS ~5–10 min, backend ~4 min).

### Web

```bash
cd frontend && npm test -- --watchAll=false --passWithNoTests
```

### Backend

```bash
cd backend && . venv/bin/activate && pytest -q
```

### iOS

```bash
cd ios-client && xcodebuild test \
  -scheme OutfitSuggestor \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -only-testing:OutfitSuggestorTests \
  -only-testing:OutfitSuggestorUITests
```

If simulator name fails, list devices: `xcrun simctl list devices available | grep iPhone` and retry.

**Gate rule:** Any failure → fix or report to user and **exit workflow**. No commit/push/deploy.

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

### Tests
| Suite | Result | Details |
|-------|--------|---------|
| Web | PASS/FAIL | X suites, Y tests |
| Backend | PASS/FAIL | X passed |
| iOS | PASS/FAIL | X unit + Y UI |

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

### Notes
- Failures, skipped steps, or manual follow-ups
```

---

## Failure handling

| Failure | Action |
|---------|--------|
| Tests fail | Stop. Show failing test names. No deploy. |
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
