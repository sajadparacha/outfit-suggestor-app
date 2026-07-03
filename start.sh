#!/bin/bash

# Start frontend + backend for AI Outfit Suggestor (macOS / Linux)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting AI Outfit Suggestor App..."

if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env not found"
    echo "Copy backend/.env.example to backend/.env and add your API keys"
    exit 1
fi

if [ ! -f "backend/venv/bin/activate" ]; then
    echo "Error: Python venv not found at backend/venv"
    echo "Create it with:"
    echo "  cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
    if [ -n "${FRONTEND_PID:-}" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "[1/2] Starting backend (http://localhost:8001)..."
(
    cd backend
    # shellcheck disable=SC1091
    source venv/bin/activate
    python main.py
) &
BACKEND_PID=$!

sleep 3

echo "[2/2] Starting frontend (http://localhost:3000)..."
(
    cd frontend
    npm start
) &
FRONTEND_PID=$!

echo ""
echo "Both servers are running."
echo "Backend:  http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

wait
