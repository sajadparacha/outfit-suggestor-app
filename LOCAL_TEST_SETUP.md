# Local test setup

Run **all tests locally** in your terminal (no Cursor AI usage). No API keys required.

## Test counts

| Location | Test cases | Runner |
|----------|------------|--------|
| **Backend** | **108** | pytest |
| **Frontend** | **1** | Jest (react-scripts) |
| **Total** | **109** | — |

### Backend test files

- `test_auth_endpoints.py` — auth (register, login, change password, activate)
- `test_outfit_endpoints.py` — suggest-outfit, check-duplicate, history, suggest-from-wardrobe
- `test_wardrobe_endpoints.py` — CRUD, summary, duplicate check, analyze-image
- `test_access_log_endpoints.py` — access logs, filters, stats
- `test_wardrobe_pagination_search.py` — pagination, search, summary
- `test_outfit_wardrobe_integration.py` — outfit + wardrobe flows
- `test_integration_auth_flow.py` — auth flow integration
- `test_integration_outfit_flow.py` — outfit flow integration
- `test_integration_wardrobe_flow.py` — wardrobe flow integration
- `test_integration_complete_user_journey.py` — full user journey
- `test_outfit_wardrobe_integration.py` — outfit–wardrobe integration

Backend tests use **in-memory SQLite** and **mock AI services** (no OpenAI/Replicate/HuggingFace calls).

---

## 1. Backend (pytest)

### Prerequisites

- Python 3.10+
- `pip`

### Setup and run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest tests/ -v
```

### Useful commands

```bash
# All tests
pytest tests/ -v

# Single file
pytest tests/test_auth_endpoints.py -v

# With coverage
pytest tests/ -v --tb=short
```

No `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, or `DATABASE_URL` needed for tests.

---

## 2. Frontend (Jest)

### Prerequisites

- Node 18+
- `npm`

### Setup and run

```bash
cd frontend
npm install
npm test -- --watchAll=false
```

### Useful commands

```bash
# Run once (CI-friendly)
npm test -- --watchAll=false

# Watch mode (during development)
npm test
```

---

## 3. Run everything from project root

**Option A – shell script (recommended):**

```bash
./run_tests.sh
```

**Option B – Makefile:**

```bash
make test          # backend + frontend
make test-backend  # backend only
make test-frontend # frontend only
```

**Option C – manually:**

```bash
# Backend
cd backend && pip install -r requirements.txt && pytest tests/ -v && cd ..

# Frontend
cd frontend && npm install && npm test -- --watchAll=false && cd ..
```

---

## Summary

- **109 tests** total (108 backend + 1 frontend).
- Run them locally: `./run_tests.sh` or `make test`, or run `pytest` / `npm test` in each directory.
- **No API keys required** — backend uses in-memory SQLite and mock AI services.
- **No Cursor AI usage** — run everything in your terminal.
