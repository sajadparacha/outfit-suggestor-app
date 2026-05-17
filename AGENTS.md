## Cursor Cloud specific instructions

### Services overview

| Service | Tech | Port | Run command |
|---------|------|------|-------------|
| Backend API | Python 3.12 / FastAPI | 8001 | `cd backend && source venv/bin/activate && python main.py` |
| Frontend | React 19 / TypeScript | 3000 | `cd frontend && npm start` |

### Backend

- Virtual environment lives at `backend/venv`. Always activate before running backend commands.
- The backend requires PostgreSQL. Default connection: `postgresql://postgres:postgres@localhost:5432/outfit_suggestor`. Start PostgreSQL with `sudo pg_ctlcluster 16 main start`.
- Config is in `backend/.env`. At minimum set `DATABASE_URL`, `OPENAI_API_KEY` (can be `dummy-key-for-dev` if not testing AI features), and `JWT_SECRET_KEY`.
- Tables are auto-created on startup (`Base.metadata.create_all`); there is no Alembic migration system.
- Backend tests use in-memory SQLite with mock AI services — no API keys or PostgreSQL needed. Run: `cd backend && source venv/bin/activate && pytest tests/ -v`.

### Frontend

- Uses `react-scripts` (Create React App). Dev server: `cd frontend && npm start`.
- Tests: `cd frontend && CI=true npm test -- --watchAll=false`.
- Lint: `cd frontend && npx eslint src/` (pre-existing lint warnings in test files are expected).
- TypeScript check: `cd frontend && npx tsc --noEmit`.
- Build: `cd frontend && npm run build`.

### Running all tests from root

```
make test            # backend + frontend
make test-backend    # backend only
make test-frontend   # frontend only
```

### Gotchas

- `requirements.txt` includes `torch` and `transformers` (large packages) — initial `pip install` takes ~90s.
- The `start.sh` script expects `backend/venv` and `backend/.env` to exist. For Cloud Agents, start the services in separate tmux sessions instead.
- Frontend ESLint reports pre-existing errors in test files (`testing-library/no-node-access`, `testing-library/no-wait-for-multiple-assertions`). These are not regressions.
- `EMAIL_ENABLED=false` in `.env` disables email activation; users are auto-verified on registration.
- The `OPENAI_API_KEY` is only needed at runtime for actual AI outfit suggestions. Tests mock all AI calls.
