#!/bin/bash
set -e

# Thread & Pixel Local Development Runner
# Starts both FastAPI backend and Next.js frontend

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧵 Starting Thread & Pixel local environment..."

# 1. Check Python virtual environment
if [ ! -d "$ROOT_DIR/api/.venv" ]; then
    echo "Creating virtual environment in api/.venv..."
    python3 -m venv "$ROOT_DIR/api/.venv"
    "$ROOT_DIR/api/.venv/bin/pip install" -r "$ROOT_DIR/api/requirements.txt" pytest
fi

# 2. Check api/.env
if [ ! -f "$ROOT_DIR/api/.env" ]; then
    echo "Creating api/.env from api/.env.example..."
    cp "$ROOT_DIR/api/.env.example" "$ROOT_DIR/api/.env"
fi

# 3. Check web/.env.local
if [ ! -f "$ROOT_DIR/web/.env.local" ]; then
    echo "Creating web/.env.local from web/.env.example..."
    cp "$ROOT_DIR/web/.env.example" "$ROOT_DIR/web/.env.local"
fi

# 4. Check web/node_modules
if [ ! -d "$ROOT_DIR/web/node_modules" ]; then
    echo "Installing web dependencies..."
    npm --prefix "$ROOT_DIR/web" install
fi

cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill "$API_PID" "$WEB_PID" 2>/dev/null || true
    wait "$API_PID" "$WEB_PID" 2>/dev/null || true
    echo "Servers stopped."
}
trap cleanup EXIT INT TERM

echo "🚀 Starting FastAPI backend on http://localhost:8080..."
(cd "$ROOT_DIR/api" && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload) &
API_PID=$!

echo "🚀 Starting Next.js frontend on http://localhost:3000..."
(cd "$ROOT_DIR/web" && npm run dev) &
WEB_PID=$!

echo "✨ Services running:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:8080 (docs at http://localhost:8080/docs)"
echo "Press Ctrl+C to stop both."

wait
