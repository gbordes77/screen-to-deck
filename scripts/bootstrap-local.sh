#!/usr/bin/env bash
set -euo pipefail

# Ensure Node deps are installed locally before any push/commit
# 1) Install root deps
if [[ ! -d node_modules || ! -f node_modules/.installed.timestamp ]]; then
  echo "Installing root dependencies..."
  npm install
  mkdir -p node_modules && date > node_modules/.installed.timestamp
else
  echo "Root dependencies already installed."
fi

# 2) Install server deps
if [[ ! -d server/node_modules || ! -f server/node_modules/.installed.timestamp ]]; then
  echo "Installing server dependencies..."
  (cd server && npm install)
  mkdir -p server/node_modules && date > server/node_modules/.installed.timestamp
else
  echo "Server dependencies already installed."
fi

# 3) Install client deps
if [[ ! -d client/node_modules || ! -f client/node_modules/.installed.timestamp ]]; then
  echo "Installing client dependencies..."
  (cd client && npm install)
  mkdir -p client/node_modules && date > client/node_modules/.installed.timestamp
else
  echo "Client dependencies already installed."
fi

# 4) Preflight build (type-check)
echo "Building server and client to validate environment..."
npm run build:server
npm run build:client

echo "Local bootstrap complete. You can now run ./scripts/self-host.sh"
