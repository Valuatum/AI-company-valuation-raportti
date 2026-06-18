#!/usr/bin/env bash
# Start backend (:8000) + frontend (:5173). Ctrl-C stops both.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- backend ---
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip -q install -r requirements.txt
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "→ Loi backend/.env — lisää OPENROUTER_API_KEY ennen ajoa."
fi
.venv/bin/uvicorn app.main:app --port 8000 --reload &
BACK=$!

# --- frontend ---
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev &
FRONT=$!

trap 'kill $BACK $FRONT 2>/dev/null' EXIT INT TERM
echo "Backend :8000  Frontend :5173  (Ctrl-C lopettaa)"
wait
