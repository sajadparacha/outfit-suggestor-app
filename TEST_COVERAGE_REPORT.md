# API Test Coverage Report

**Last verified:** 2026-07-11  
**Method:** `pytest` endpoint inventory + `pytest-cov` line coverage on money-path packages  
**Command:**

```bash
cd backend && . venv/bin/activate
DATABASE_URL='sqlite:///:memory:' pytest tests/ \
  --cov=routes --cov=services --cov=controllers --cov=dependencies --cov=utils.auth \
  --cov-report=term-missing -q
```

---

## Measured line coverage (baseline)

| Scope | Cover |
|-------|-------|
| **TOTAL (routes + services + controllers + dependencies + utils.auth)** | **64%** |
| `controllers/auth_controller.py` | 85% |
| `services/auth_service.py` | 76% |
| `utils/auth.py` | 71% |
| `controllers/outfit_controller.py` | 63% |
| `services/outfit_service.py` | 68% |
| `services/guest_usage_service.py` | 98% |
| `controllers/wardrobe_controller.py` | 74% |
| `services/wardrobe_service.py` | 78% |
| `services/ai_service.py` | 48% (prompt/vision branches; mocked in API tests) |

> Older copies of this file claimed **35%** endpoints covered and **0%** on auth / suggest / history. That inventory was stale. Those money paths have automated tests (see below).

---

## Health & Root

| Method | Endpoint | Status | Test file(s) |
|--------|----------|--------|--------------|
| GET | `/` | ✅ Covered | `test_outfit_endpoints.py` |
| GET | `/health` | ✅ Covered | `test_outfit_endpoints.py` |

---

## Authentication (`/api/auth`)

| Method | Endpoint | Status | Test file(s) |
|--------|----------|--------|--------------|
| POST | `/api/auth/register` | ✅ Covered | `test_auth_endpoints.py`, `test_integration_auth_flow.py` |
| POST | `/api/auth/login` | ✅ Covered | `test_auth_endpoints.py`, `test_integration_auth_flow.py` |
| GET | `/api/auth/activate/{token}` | ⚠️ Partial | `test_auth_endpoints.py` (invalid token); happy path if email activation enabled still thin |
| GET | `/api/auth/me` | ✅ Covered | `test_auth_endpoints.py` |
| POST | `/api/auth/change-password` | ✅ Covered | `test_auth_endpoints.py` |

---

## Outfit suggestion & history (`/api`)

| Method | Endpoint | Status | Test file(s) |
|--------|----------|--------|--------------|
| GET | `/api/guest-usage` | ✅ Covered | `test_guest_usage.py` |
| POST | `/api/suggest-outfit` | ✅ Covered | `test_outfit_endpoints.py`, `test_integration_outfit_flow.py`, `test_reports_searches.py`, wardrobe integration tests |
| POST | `/api/check-duplicate` | ✅ Covered | `test_outfit_endpoints.py`, `test_integration_outfit_flow.py` |
| GET | `/api/outfit-history` | ✅ Covered | `test_outfit_endpoints.py`, journey/integration tests |
| DELETE | `/api/outfit-history/{entry_id}` | ✅ Covered | `test_outfit_endpoints.py` |
| POST | `/api/suggest-outfit-from-wardrobe` | ✅ Covered | `test_outfit_endpoints.py`, `test_integration_outfit_flow.py` |
| POST | `/api/suggest-outfit-from-wardrobe-item/{id}` | ✅ Covered | `test_outfit_endpoints.py`, `test_integration_outfit_flow.py` |

---

## Wardrobe (`/api/wardrobe`)

| Method | Endpoint | Status | Test file(s) |
|--------|----------|--------|--------------|
| POST | `/api/wardrobe/check-duplicate` | ✅ Covered | `test_integration_wardrobe_flow.py` |
| POST | `/api/wardrobe/analyze-image` | ⚠️ Partial | mocked wardrobe AI in conftest; endpoint exercised in wardrobe flows |
| POST | `/api/wardrobe` | ✅ Covered | `test_wardrobe_endpoints.py`, integration flows |
| GET | `/api/wardrobe` | ✅ Covered | `test_wardrobe_endpoints.py`, `test_wardrobe_pagination_search.py` |
| GET | `/api/wardrobe/summary` | ✅ Covered | `test_wardrobe_endpoints.py` |
| GET | `/api/wardrobe/random-outfit` | ⚠️ Partial / legacy | limited; non-user-facing path |
| POST | `/api/wardrobe/analyze-gaps` | ⚠️ Partial | AI gap analysis unit coverage in `test_ai_service_premium_wardrobe_gaps.py`; full HTTP contract still thin |
| GET | `/api/wardrobe/{item_id}` | ✅ Covered | `test_wardrobe_endpoints.py` |
| PUT | `/api/wardrobe/{item_id}` | ✅ Covered | `test_wardrobe_endpoints.py` |
| DELETE | `/api/wardrobe/{item_id}` | ✅ Covered | `test_wardrobe_endpoints.py` |

---

## Admin / ops (lower commercial priority)

| Area | Status | Notes |
|------|--------|-------|
| Access logs / usage / timeline | ✅ Mostly covered | `test_access_log_endpoints.py` |
| Reports searches | ✅ Covered | `test_reports_searches.py` |
| Integration test runner routes | ⚠️ Low line cov (~26%) | Admin-only; `test_integration_test_runner_access.py` |

---

## Coverage statistics (endpoint checklist)

Approximate money-path API inventory (health + auth + outfit + wardrobe core):

- **Fully tested:** majority of auth, suggest, history, wardrobe CRUD  
- **Partial:** activate happy path, analyze-image/gaps HTTP depth, legacy random-outfit  
- **Do not cite “35% / 0% money paths”** — that claim is obsolete

---

## Remaining gaps (prioritized)

1. **Deterministic suggest contract** — keep AI mocked (done in conftest); expand assertions on response shape / guest limits / error codes  
2. **Auth activation happy path** when email verification is enabled  
3. **Wardrobe Insights HTTP** — deepen `/analyze-gaps` API tests beyond unit parsing  
4. **CI gate** — ✅ `.github/workflows/backend-coverage.yml` runs money-path `pytest --cov-fail-under=60` on PRs/pushes that touch `backend/`  
5. **Refresh this report** when endpoints change (same PR)

---

## How to re-measure

```bash
cd backend && . venv/bin/activate
pip install 'pytest-cov>=4.1.0'   # if needed
DATABASE_URL='sqlite:///:memory:' pytest tests/ \
  --cov=routes --cov=services --cov=controllers --cov=dependencies --cov=utils.auth \
  --cov-report=term-missing --cov-report=html -q
```

Open `backend/htmlcov/index.html` for line-level detail.
