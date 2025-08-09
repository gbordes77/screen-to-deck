#!/usr/bin/env bash
set -euo pipefail

# One-button: read, bootstrap, start, verify, open docs
bash scripts/bootstrap-local.sh

# Start Redis if not running (Homebrew)
if ! redis-cli ping >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Starting Redis via Homebrew..."
    brew services start redis || true
  else
    echo "Redis not detected. You can run Docker: docker run -d --name redis -p 6379:6379 redis:7-alpine"
  fi
fi

# Start app (do not block)
./scripts/self-host.sh --no-wait

# Try to detect LAN IP and print helpful links
LAN_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo 127.0.0.1)

# Health checks
set +e
curl -fsS "http://${LAN_IP}:3001/health" >/dev/null && echo "API /health OK" || echo "API /health not ready yet"
curl -fsS "http://${LAN_IP}:3001/api/health" >/dev/null && echo "API /api/health OK" || echo "API /api/health not ready yet"
set -e

cat <<MSG

Open these in your browser:
- UI:       http://${LAN_IP}:5173
- API:      http://${LAN_IP}:3001 (health: /health, /api/health)
- API Docs: http://${LAN_IP}:3001/api/docs
- Metrics:  http://${LAN_IP}:3001/metrics

Next steps:
- Follow E2E test plan: open TEST_PLAN.html
- Read docs: PROJECT_OVERVIEW.md, ARCHITECTURE.md
MSG
