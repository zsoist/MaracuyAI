#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run the local dashboard stack." >&2
  echo "Install Docker Desktop, then run this script again." >&2
  exit 1
fi

echo "Starting MaracuyAI local dashboard stack..."
echo "Open http://localhost:8000/dashboard/ once the API is up."

cd "$ROOT_DIR/backend"
docker compose up --build
