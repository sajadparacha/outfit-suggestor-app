## Remote (Railway) API Tests

These tests run **against a deployed backend** (e.g. Railway) over HTTP.
They are separate from `backend/tests/` which uses FastAPI `TestClient` + in-memory SQLite.

### Prerequisites

- A deployed backend URL (Railway domain)
- A real test user on that deployment (email + password)

### Run

From repo root:

```bash
API_BASE_URL="https://web-production-dfcf8.up.railway.app" \
TEST_USERNAME="you@example.com" \
TEST_PASSWORD="your_password" \
pytest backend/tests_remote -v
```

### Optional: run AI-calling tests (may incur cost)

```bash
RUN_AI_TESTS=1 \
API_BASE_URL="https://web-production-dfcf8.up.railway.app" \
TEST_USERNAME="you@example.com" \
TEST_PASSWORD="your_password" \
pytest backend/tests_remote -v -m ai
```

