# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AI Outfit Suggestor (Closiq) — a FastAPI backend (Python 3.12) + React 19 frontend (TypeScript). See `README.md` for full architecture details.

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Backend | `cd backend && source venv/bin/activate && python main.py` | 8001 | Requires PostgreSQL running and `backend/.env` configured |
| Frontend | `cd frontend && npm start` | 3000 | Connects to backend via `REACT_APP_API_URL` in `frontend/.env` |

### PostgreSQL

PostgreSQL must be running before the backend starts. Start it with:
```bash
sudo pg_ctlcluster $(pg_lsclusters -h | awk '{print $1, $2}') start
```

The default database URL is `postgresql://postgres:postgres@localhost:5432/outfit_suggestor`. Tables are auto-created on backend startup via SQLAlchemy `Base.metadata.create_all`.

### Running tests

- **Backend (162 tests):** `cd backend && source venv/bin/activate && pytest tests/ -v --tb=short`
  - Uses in-memory SQLite and mock AI services — no API keys or PostgreSQL needed.
- **Frontend (137 tests):** `cd frontend && npm test -- --watchAll=false`
- **Both:** `make test` from project root.

### Linting

- Frontend: ESLint is configured via `react-app` preset in `package.json`. Lint runs automatically as part of `react-scripts` build/start.
- Backend: No explicit linter configured in the repo.

### Environment files

- `backend/.env` — required for backend startup. Copy from `backend/.env.example`. Key vars: `DATABASE_URL`, `OPENAI_API_KEY` (can be a placeholder if only running tests), `PORT`, `EMAIL_ENABLED=false`.
- `frontend/.env` — optional. Defaults to `REACT_APP_API_URL=http://localhost:8001`.

### Gotchas

- The `backend/requirements.txt` has a malformed line (`pillow>=9.0.0==2.32.5`) that pip resolves by treating `requests` version separately — it installs fine but looks odd.
- Backend tests use `pytest-asyncio` but the tests themselves are synchronous with `httpx.TestClient`.
- Frontend uses Create React App (`react-scripts`), which bundles its own webpack dev server and ESLint.
- The backend's `config.py` imports services at module level, so importing `config` triggers AI service initialization if `OPENAI_API_KEY` is set. Tests avoid this by using their own test fixtures.
- `EMAIL_ENABLED=false` in `.env` skips email verification — users are auto-activated on registration.
