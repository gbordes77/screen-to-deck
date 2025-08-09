#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR=${1:-data}
mkdir -p "$TARGET_DIR"

echo "Downloading Scryfall bulk default-cards..."
curl -s https://api.scryfall.com/bulk-data | jq -r '.data[] | select(.type=="default_cards").download_uri' | xargs curl -L -o "$TARGET_DIR/scryfall-default-cards.json"

echo "Saved to $TARGET_DIR/scryfall-default-cards.json"
