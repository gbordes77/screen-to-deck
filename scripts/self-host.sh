#!/usr/bin/env bash
set -euo pipefail

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 || true)
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP=$(ipconfig getifaddr en1 || true)
fi
if [[ -z "${LAN_IP}" ]]; then
  echo "Could not auto-detect LAN IP. Falling back to localhost."
  LAN_IP=127.0.0.1
fi

echo "Using LAN IP: ${LAN_IP}"

# Ensure env files exist
mkdir -p server
if [[ ! -f server/.env ]]; then
  cp server/env.example server/.env
fi

# Update CORS_ORIGIN and OFFLINE_MODE
if grep -q '^CORS_ORIGIN=' server/.env; then
  sed -i '' "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://${LAN_IP}:5173|" server/.env || true
else
  echo "CORS_ORIGIN=http://${LAN_IP}:5173" >> server/.env
fi

if grep -q '^OFFLINE_MODE=' server/.env; then
  sed -i '' "s|^OFFLINE_MODE=.*|OFFLINE_MODE=false|" server/.env || true
else
  echo "OFFLINE_MODE=false" >> server/.env
fi

# Root .env for compose/dev convenience
if [[ ! -f .env ]]; then
  cat > .env <<EOF
OPENAI_API_KEY=
CORS_ORIGIN=http://${LAN_IP}:5173
VITE_API_URL=http://localhost:3001/api
EOF
else
  sed -i '' "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://${LAN_IP}:5173|" .env || true
fi

echo "Env prepared. Please export OPENAI_API_KEY in your shell or edit server/.env and ./.env to add your key."

echo "Starting server and client (client bound to 0.0.0.0)..."
# Start server and client (client on 0.0.0.0 for LAN)
npm run dev:server &
SERVER_PID=$!
( cd client && npm run dev -- --host 0.0.0.0 ) &
CLIENT_PID=$!

trap 'kill ${SERVER_PID} ${CLIENT_PID} 2>/dev/null || true' INT TERM EXIT

# Print access URLs
sleep 2
cat <<MSG

Access URLs:
- Frontend: http://${LAN_IP}:5173
- API:      http://${LAN_IP}:3001 (health: /health, /api/health)

If the browser shows CORS errors, ensure CORS_ORIGIN matches the frontend URL in server/.env
MSG

# Wait for background processes
wait
