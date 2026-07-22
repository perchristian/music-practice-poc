#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
HOST="${POC_HOST:-127.0.0.1}"
PIPELINE_MODE="${PIPELINE_MODE:-mock}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"
if [ "${PIPELINE_MODE}" != "real" ]; then
  PIPELINE_MODE="mock"
fi
URL="http://localhost:${PORT}/?mode=${PIPELINE_MODE}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"

export PORT HOST PIPELINE_MODE

open_browser() {
  if [ "${OPEN_BROWSER}" = "1" ]; then
    open "${URL}"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH."
  echo "Install Node.js, then run this launcher again."
  read -r "?Press Enter to close."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Project dependencies are missing."
  echo "Run npm install from the project directory before using this launcher."
  read -r "?Press Enter to close."
  exit 1
fi

if curl --silent --fail "${HEALTH_URL}" >/dev/null 2>&1; then
  echo "Piano Practice POC is already running on ${URL}."
  open_browser
  exit 0
fi

echo "Starting Piano Practice POC in ${PIPELINE_MODE} mode..."
echo "URL: ${URL}"
echo

npm start &
SERVER_PID=$!

cleanup() {
  if kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

for _ in {1..40}; do
  if curl --silent --fail "${HEALTH_URL}" >/dev/null 2>&1; then
    open_browser
    echo
    echo "The app is running. Close this Terminal window to stop the service."
    wait "${SERVER_PID}"
    exit $?
  fi
  sleep 0.25
done

echo "The server did not become ready at ${URL}."
echo "Check the npm output above for errors."
wait "${SERVER_PID}"
