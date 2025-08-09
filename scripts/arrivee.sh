#!/usr/bin/env bash
set -euo pipefail

# Arrivée: lit, prépare, lance, vérifie, ouvre les docs essentielles
ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)
cd "$ROOT_DIR"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
NO_OPEN=0
if [[ "${1:-}" == "--no-open" ]]; then NO_OPEN=1; fi

printf "${GREEN}=== Parcours d'arrivée — lancement automatique ===${NC}\n"

# 0) Afficher les docs à lire
cat <<DOC

[Lecture recommandée]
- PROJECT_OVERVIEW.md (vision)\n- ARCHITECTURE.md (modules/flux)\n- DEVELOPMENT.md, SELF_HOSTING.md (runbook)\n- .github/workflows, AUDIT.md, CHANGELOG.md, ROLLBACK.md (qualité/CI)\n- CONTRIBUTING.md, .github/, MISSION_CLOSEOUT.md (gouvernance)
DOC

# 1) Bootstrap deps
bash scripts/bootstrap-local.sh

# 1bis) Redis (BullMQ + quotas)
if ! redis-cli ping >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Redis non détecté actif. Démarrage via Homebrew..."
    brew services start redis || true
  elif command -v docker >/dev/null 2>&1; then
    echo "Redis non détecté actif. Démarrage via Docker..."
    docker inspect redis >/dev/null 2>&1 || docker run -d --name redis -p 6379:6379 redis:7-alpine >/dev/null
  else
    printf "${YELLOW}Avertissement:${NC} Redis non démarré (installez Homebrew ou Docker).\n"
  fi
fi

# 2) Start app (no-wait)
./scripts/self-host.sh --no-wait

# 3) Links & quick checks
LAN_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo 127.0.0.1)
set +e
curl -fsS "http://${LAN_IP}:3001/health" >/dev/null && echo "API /health OK" || echo "API /health en cours..."
curl -fsS "http://${LAN_IP}:3001/api/health" >/dev/null && echo "API /api/health OK" || echo "/api/health en cours..."
set -e

cat <<LINKS

[Accès]
- UI:       http://${LAN_IP}:5173
- API:      http://${LAN_IP}:3001 (health: /health, /api/health)
- API Docs: http://${LAN_IP}:3001/api/docs
- Metrics:  http://${LAN_IP}:3001/metrics

Étape suivante: ouvrir TEST_PLAN.html et suivre le pas-à-pas (E2E).
LINKS

# 4) Ouvrir docs (si possible)
if [[ $NO_OPEN -eq 0 ]]; then
  if command -v open >/dev/null 2>&1; then
    open "${ROOT_DIR}/PARCOURS_ARRIVEE.html" || true
    open "${ROOT_DIR}/TEST_PLAN.html" || true
  fi
  if command -v code >/dev/null 2>&1; then
    code -g "${ROOT_DIR}/PROJECT_OVERVIEW.md" "${ROOT_DIR}/ARCHITECTURE.md" || true
  fi
fi

printf "${GREEN}=== Arrivée: terminé. Bon démarrage ! ===${NC}\n"
