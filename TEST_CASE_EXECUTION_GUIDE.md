# Test Case Execution Guide

This guide explains the types of tests in the AI Outfit Suggestor project and how to run them.

---

## Types of Tests

### 1. Unit tests
**Purpose:** Test a single function, class, or API endpoint in isolation with mocked dependencies.

| Layer | What they test | Environment |
|-------|----------------|-------------|
| **Backend** | One API call at a time; auth, wardrobe CRUD, access logs, outfit endpoints | In-memory SQLite, mock AI (no OpenAI/Replicate) |
| **Frontend** | One React component with mocked hooks/controllers | Jest, mocked `useWardrobeController` etc. |

**Characteristics:** Fast, no external services, deterministic.

---

### 2. Integration tests
**Purpose:** Test multi-step flows that combine several features (auth → wardrobe → outfit → history).

| Layer | What they test | Environment |
|-------|----------------|-------------|
| **Backend** | Full user journeys: login, add wardrobe, get outfit suggestion, view history | FastAPI TestClient + in-memory SQLite + mock AI |
| **Frontend** | Component with real hook + mocked HTTP (MSW) | Jest + MSW (Mock Service Worker) |

**Characteristics:** Exercise real wiring between layers; still no real API keys or external APIs.

---

### 3. Remote tests
**Purpose:** Validate the deployed backend (e.g. Railway) over real HTTP.

| Layer | What they test | Environment |
|-------|----------------|-------------|
| **Backend** | Smoke, auth, wardrobe, access logs, optional outfit AI | Real deployed API, real credentials |

**Characteristics:** Hit live deployment; `test_outfit_ai_optional.py` can incur AI costs if `RUN_AI_TESTS=1`.

---

## Test File Reference

### Backend (`backend/tests/`)

| File | Type | Purpose |
|------|------|---------|
| `test_auth_endpoints.py` | Unit | Register, login, change password, activate, `/me` |
| `test_outfit_endpoints.py` | Unit | Suggest-outfit, check-duplicate, history, suggest-from-wardrobe |
| `test_wardrobe_endpoints.py` | Unit | Wardrobe CRUD, summary, duplicate check, analyze-image |
| `test_wardrobe_pagination_search.py` | Unit | Pagination, search, filters |
| `test_access_log_endpoints.py` | Unit | Access logs list, filters, stats, usage, admin gating |
| `test_access_log_middleware.py` | Unit | Middleware: only defined ops logged, operation-type mapping |
| `test_outfit_wardrobe_integration.py` | Integration | Outfit + wardrobe matching, suggest-from-wardrobe flows |
| `test_integration_auth_flow.py` | Integration | Auth flow: register, login, change password |
| `test_integration_outfit_flow.py` | Integration | Outfit flow: upload → suggest → history |
| `test_integration_wardrobe_flow.py` | Integration | Wardrobe flow: add, view, update, delete |
| `test_integration_complete_user_journey.py` | Integration | Full journey: wardrobe → outfit → history, search |

### Frontend (`frontend/src/`)

| File | Type | Purpose |
|------|------|---------|
| `App.test.tsx` | Unit | App renders and shows main UI |
| `Wardrobe.test.tsx` | Unit | Wardrobe UI with mocked controller |
| `AdminReports.test.tsx` | Unit | AdminReports filters, Search/Clear, table filter |
| `Wardrobe.integration.test.tsx` | Integration | Wardrobe with real hook + MSW-mocked API |

### Remote (`backend/tests_remote/`)

| File | Type | Purpose |
|------|------|---------|
| `test_smoke.py` | Remote | Health, OpenAPI docs |
| `test_auth.py` | Remote | `/api/auth/me` |
| `test_wardrobe.py` | Remote | Wardrobe CRUD against deployed API |
| `test_access_logs.py` | Remote | Access logs (needs admin user) |
| `test_outfit_ai_optional.py` | Remote | Outfit suggestion (set `RUN_AI_TESTS=1`; may incur cost) |

---

## Backend (pytest)

### Run a single test file
```bash
cd backend
pytest tests/test_access_log_endpoints.py -v
```

### Run a single test class
```bash
pytest tests/test_access_log_endpoints.py::TestAccessLogEndpoints -v
```

### Run a single test function
```bash
pytest tests/test_access_log_endpoints.py::TestAccessLogEndpoints::test_get_access_logs_success -v
```

### Run by name (substring match)
```bash
pytest tests/ -v -k "access_log"      # any test whose name contains "access_log"
pytest tests/ -v -k "user_filter"     # any test whose name contains "user_filter"
```

### Run all backend tests
```bash
cd backend
pytest tests/ -v
```

### Run integration tests
```bash
cd backend
pytest tests/test_integration_complete_user_journey.py -v
pytest tests/test_integration_outfit_flow.py -v
pytest tests/test_integration_wardrobe_flow.py -v
pytest tests/test_integration_auth_flow.py -v
```

---

## Frontend (Jest)

### Run a single test file
```bash
cd frontend
npm test -- --watchAll=false --testPathPattern="AdminReports"
```

### Run a single test by name
```bash
npm test -- --watchAll=false -t "shows admin-required message"
```

### Run tests matching a pattern
```bash
npm test -- --watchAll=false -t "AdminReports"
npm test -- --watchAll=false -t "Wardrobe"
```

### Run all frontend tests
```bash
cd frontend
npm test -- --watchAll=false
```

---

## Run all tests (backend + frontend)

From project root:
```bash
./run_tests.sh
```

---

## Remote tests (Railway API)

Run tests against your deployed backend at Railway.

### Run all remote tests
```bash
API_BASE_URL=https://web-production-dfcf8.up.railway.app \
TEST_USERNAME=your@email.com \
TEST_PASSWORD=yourpassword \
./run_railway_tests.sh
```

### Run a single remote test file
```bash
API_BASE_URL=https://web-production-dfcf8.up.railway.app \
TEST_USERNAME=your@email.com \
TEST_PASSWORD=yourpassword \
pytest backend/tests_remote/test_smoke.py -v
```

### Remote test files
- `backend/tests_remote/test_smoke.py` — health, OpenAPI
- `backend/tests_remote/test_auth.py` — auth endpoints
- `backend/tests_remote/test_wardrobe.py` — wardrobe CRUD
- `backend/tests_remote/test_access_logs.py` — access logs (admin user required)
- `backend/tests_remote/test_outfit_ai_optional.py` — outfit suggestion (set `RUN_AI_TESTS=1` to run)

---

## Quick Reference by Test Type

| To run… | Command |
|---------|---------|
| **All local tests** | `./run_tests.sh` |
| **Backend unit only** | `cd backend && pytest tests/ -v -k "not integration"` |
| **Backend integration only** | `cd backend && pytest tests/test_integration_*.py tests/test_outfit_wardrobe_integration.py -v` |
| **Frontend unit only** | `cd frontend && npm test -- --watchAll=false --testPathIgnorePattern="integration"` |
| **Frontend integration only** | `cd frontend && npm test -- --watchAll=false --testPathPattern="integration"` |
| **Remote (deployed API)** | `API_BASE_URL=... TEST_USERNAME=... TEST_PASSWORD=... ./run_railway_tests.sh` |
