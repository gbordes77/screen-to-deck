#!/usr/bin/env bash
set -euo pipefail

# Départ: vérifie, fige, met à jour changelog, guide release, ouvre les docs de passation
ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)
cd "$ROOT_DIR"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
NO_OPEN=0
if [[ "${1:-}" == "--no-open" ]]; then NO_OPEN=1; fi

printf "${GREEN}=== Parcours de départ — préparation fin de mission ===${NC}\n"

# 0) Rappels docs
cat <<DOC
[À vérifier]
- MISSION_CLOSEOUT.md (checklist)
- CHANGELOG.md (à jour)
- ROLLBACK.md (procédure testée)
- PROJECT_OVERVIEW.md, ARCHITECTURE.md (dernières modifs)
DOC

# 1) État git
git status

echo "Mise à jour du changelog: affiche le delta depuis le dernier tag"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  git log --oneline ${LAST_TAG}..HEAD
else
  git log --oneline -n 20
fi

# 2) Qualité locale
bash scripts/bootstrap-local.sh
./scripts/one-button.sh --no-wait
LAN_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo 127.0.0.1)
set +e
curl -fsS "http://${LAN_IP}:3001/health" >/dev/null && echo "API /health OK" || echo "API /health en cours..."
curl -fsS "http://${LAN_IP}:3001/api/health" >/dev/null && echo "API /api/health OK" || echo "/api/health en cours..."
set -e

# 3) Ouvrir docs de passation
if [[ $NO_OPEN -eq 0 ]]; then
  if command -v open >/dev/null 2>&1; then
    open "${ROOT_DIR}/PARCOURS_DEPART.html" || true
    open "${ROOT_DIR}/MISSION_CLOSEOUT.md" || true
  fi
fi

printf "${GREEN}=== Départ: exécution terminée. Complétez changelog, release et checklist. ===${NC}\n"
