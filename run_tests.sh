#!/usr/bin/env bash
# Run all tests locally (no API keys, no Cursor AI usage).
set -e
echo "=== Backend tests (pytest) ==="
(cd backend && pip install -q -r requirements.txt && pytest tests/ -v --tb=short)
echo ""
echo "=== Frontend tests (Jest) ==="
(cd frontend && npm install && npm test -- --watchAll=false)
echo ""
echo "=== All tests finished ==="
