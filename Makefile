# Local test targets — run in terminal (no Cursor AI usage, no API keys)
.PHONY: test test-backend test-frontend

test: test-backend test-frontend

test-backend:
	cd backend && pip install -q -r requirements.txt && pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm install && npm test -- --watchAll=false
