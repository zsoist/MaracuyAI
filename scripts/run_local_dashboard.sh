#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DOCKER_BIN="${DOCKER_BIN:-}"

if [[ -z "$DOCKER_BIN" ]]; then
  if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
  elif [[ -x /Applications/Docker.app/Contents/Resources/bin/docker ]]; then
    DOCKER_BIN="/Applications/Docker.app/Contents/Resources/bin/docker"
  else
    echo "Docker is required to run the local dashboard stack." >&2
    echo "Install Docker Desktop, then run this script again." >&2
    exit 1
  fi
fi

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "Docker Desktop is installed but not running. Starting it now..."
  open -a Docker

  for _ in {1..60}; do
    if "$DOCKER_BIN" info >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "Docker did not become ready in time." >&2
  echo "Open Docker Desktop manually, wait until it says Engine running, then rerun this script." >&2
  exit 1
fi

echo "Starting MaracuyAI local dashboard stack..."
echo "Open http://localhost:8000/dashboard/ once the API is up."

cd "$ROOT_DIR/backend"
"$DOCKER_BIN" compose up --build
