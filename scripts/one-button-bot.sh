#!/usr/bin/env bash
set -euo pipefail

# One-button launcher for the Discord bot (macOS/Linux)
# - Prepares Python venv
# - Installs deps if needed
# - Checks DISCORD_BOT_TOKEN
# - Starts the bot in background
# - Verifies health endpoint

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)
BOT_DIR="${ROOT_DIR}/discord-bot"
VENV_DIR="${BOT_DIR}/.venv"
PID_FILE="${BOT_DIR}/bot.pid"

if [[ ! -d "${BOT_DIR}" ]]; then
  echo "❌ discord-bot directory not found at ${BOT_DIR}" >&2
  exit 1
fi

# 1) Python availability
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3 not found. Please install Python 3.10+" >&2
  exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print("%d.%d"% (sys.version_info.major, sys.version_info.minor))')
echo "🐍 Python ${PY_VERSION} detected"

# 2) Create venv if missing
if [[ ! -d "${VENV_DIR}" ]]; then
  echo "📦 Creating virtualenv at ${VENV_DIR}"
  python3 -m venv "${VENV_DIR}"
fi
# shellcheck disable=SC1090
source "${VENV_DIR}/bin/activate"

# 3) Install deps if needed (idempotent)
STAMP="${VENV_DIR}/.installed.timestamp"
if [[ ! -f "${STAMP}" ]]; then
  echo "⬇️  Installing bot dependencies..."
  python -m pip install --upgrade pip setuptools wheel >/dev/null
  python -m pip install -r "${BOT_DIR}/requirements.txt"
  date > "${STAMP}"
else
  echo "✅ Dependencies already installed"
fi

# 4) Ensure DISCORD_BOT_TOKEN is available (from env or .env)
if [[ ! -f "${BOT_DIR}/.env" ]]; then
  echo "ℹ️  Create ${BOT_DIR}/.env with your DISCORD_BOT_TOKEN if not using shell env"
fi

# Quick check: try to read token via python-dotenv
TOKEN_CHECK=$(python - <<'PY'
import os
from dotenv import load_dotenv
load_dotenv()
print('OK' if os.getenv('DISCORD_BOT_TOKEN') else 'MISSING')
PY
)
if [[ "${TOKEN_CHECK}" != "OK" ]]; then
  echo "❌ DISCORD_BOT_TOKEN not found. Create discord-bot/.env with:\nDISCORD_BOT_TOKEN=your_token_here" >&2
  exit 1
fi

# 5) Stop previous instance if any
if [[ -f "${PID_FILE}" ]]; then
  OLD_PID=$(cat "${PID_FILE}" || true)
  if [[ -n "${OLD_PID}" ]] && ps -p "${OLD_PID}" >/dev/null 2>&1; then
    echo "🛑 Stopping previous bot instance (PID ${OLD_PID})"
    kill "${OLD_PID}" || true
    sleep 1
  fi
  rm -f "${PID_FILE}"
fi

# 6) Launch bot in background
cd "${BOT_DIR}"
echo "🚀 Launching Discord bot..."
nohup python -u bot.py >/dev/null 2>&1 &
BOT_PID=$!
echo "${BOT_PID}" > "${PID_FILE}"
echo "✅ Bot started with PID: ${BOT_PID}"

# 7) Health check (aiohttp on 8080/healthz)
HEALTH_URL="http://127.0.0.1:8080/healthz"
echo -n "🔎 Waiting for health endpoint ${HEALTH_URL}..."
for i in {1..20}; do
  sleep 0.5
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    echo " OK"
    break
  fi
  echo -n "."
done

if ! curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
  echo "\n⚠️  Health endpoint not responding yet. Check logs: tail -f ${BOT_DIR}/bot.log"
else
  echo "🩺 Health: $(curl -fsS "${HEALTH_URL}")"
fi

cat <<MSG

Next steps:
- In Discord, post an image; click the 📷 reaction to trigger scanning.
- Stop bot: kill \\$(cat ${PID_FILE})
- Logs: tail -f ${BOT_DIR}/bot.log

MSG
