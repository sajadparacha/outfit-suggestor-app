# Targeted Test Report Template

Copy into the orchestrator's final Twin UI / Cost Twin UI message. Fill all sections.

---

## Targeted Test Report

**Feature:** `<feature-slug>`  
**Branch:** `<branch-name>`  
**Overall (targeted):** PASS | FAIL

### Web (`frontend/`)

| Metric | Value |
|--------|-------|
| Command | (spec-listed file(s) only, e.g. `npm test -- --watchAll=false src/…`) |
| Result | e.g. 1 suite, 13 passed |
| Status | PASS / FAIL |

**Failures (if any):**

- 

**New tests this feature:**

- 

### iOS (`ios-client/`)

| Metric | Value |
|--------|-------|
| Command | `-only-testing:OutfitSuggestorTests/<TestClass>` |
| Simulator | |
| Result | e.g. 14 tests, 0 failures |
| Status | PASS / FAIL |

**Failures (if any):**

- 

**New tests this feature:**

- 

### Backend (`backend/`) — if changed

| Metric | Value |
|--------|-------|
| Command | `pytest tests/<file> -q` (targeted) |
| Tests | / |
| Status | PASS / FAIL / SKIPPED |

**Failures (if any):**

- 

### Full suite

| Metric | Value |
|--------|-------|
| Command | `./run_all_tests` |
| Status | Launched in new terminal (user watches; orchestrator did not ingest logs) |

### Notes

- 

### Cursor cost (required)

Run:

```bash
python3 .cursor/scripts/estimate-workflow-cost.py end
```

Paste the **Workflow actual cost** block (actual $, API calls, vs estimate, on-demand portion).
