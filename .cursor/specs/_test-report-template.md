# Test Execution Report Template

Copy into the orchestrator's final Twin UI message. Fill all sections.

---

## Test Execution Report

**Feature:** `<feature-slug>`  
**Branch:** `<branch-name>`  
**Overall:** PASS | FAIL

### Web (`frontend/`)

| Metric | Value |
|--------|-------|
| Command | `npm test -- --watchAll=false --passWithNoTests` |
| Suites | / |
| Tests | / |
| Duration | |
| Status | PASS / FAIL |

**Failures (if any):**

- 

**New tests this feature:**

- 

### iOS (`ios-client/`)

| Metric | Value |
|--------|-------|
| Command | `xcodebuild test -scheme OutfitSuggestor …` |
| Simulator | |
| Unit/Integration (OutfitSuggestorTests) | / |
| UI tests (OutfitSuggestorUITests) | / |
| Status | PASS / FAIL |

**Failures (if any):**

- 

**New tests this feature:**

- 

### Backend (`backend/`) — if changed

| Metric | Value |
|--------|-------|
| Command | `pytest -q` |
| Tests | / |
| Status | PASS / FAIL / SKIPPED |

**Failures (if any):**

- 

### Notes

- 

### Cursor cost (required)

Run:

```bash
python3 .cursor/scripts/estimate-workflow-cost.py end
```

Paste the **Workflow actual cost** block (actual $, API calls, vs estimate, on-demand portion).
