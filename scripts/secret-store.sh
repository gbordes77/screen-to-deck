#!/usr/bin/env bash
set -euo pipefail

SERVICE="screen-to-deck-openai"
ACCOUNT="openai"

usage() {
  cat <<EOF
Usage:
  $0 set <OPENAI_API_KEY>   # store key in macOS Keychain
  $0 get                     # print key from Keychain
  $0 delete                  # remove key from Keychain
EOF
}

cmd=${1:-}
case "$cmd" in
  set)
    key=${2:-}
    if [[ -z "$key" ]]; then echo "Missing key"; exit 1; fi
    security add-generic-password -a "$ACCOUNT" -s "$SERVICE" -w "$key" -U >/dev/null
    echo "Key stored in Keychain (service=$SERVICE, account=$ACCOUNT)."
    ;;
  get)
    security find-generic-password -a "$ACCOUNT" -s "$SERVICE" -w || true
    ;;
  delete)
    security delete-generic-password -a "$ACCOUNT" -s "$SERVICE" >/dev/null || true
    echo "Key removed from Keychain (if it existed)."
    ;;
  *)
    usage; exit 1;
    ;;
esac
