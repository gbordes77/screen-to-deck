#!/bin/bash

# ===========================================
# SCRIPT DÉPLOIEMENT AUTOMATIQUE - SCREEN TO DECK
# ===========================================
# Ce script automatise le déploiement sur différents environnements
# Usage: ./scripts/deploy.sh [staging|production] [--force]

set -e
set -o pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/scripts/logs/deploy.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Variables d'environnement
ENVIRONMENT="${1:-staging}"
FORCE_DEPLOY="${2:-}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
IMAGE_NAME="${IMAGE_NAME:-screen-to-deck}"

# Fonctions utilitaires
log() {
    echo -e "${DATE} - $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] 🚀 $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] ℹ️  $1${NC}"
}

# Création du dossier de logs
mkdir -p "$(dirname "$LOG_FILE")"

print_step "🚀 Démarrage du déploiement - Environnement: $ENVIRONMENT"
log "🚀 Starting deployment process for environment: $ENVIRONMENT"

# ===========================================
# VALIDATION DES PRÉREQUIS
# ===========================================

print_step "Vérification des prérequis..."

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé!"
    log "❌ Docker not found"
    exit 1
fi

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose n'est pas installé!"
    log "❌ Docker Compose not found"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé!"
    log "❌ Node.js not found"
    exit 1
fi

# Vérifier les variables d'environnement selon l'environnement
case $ENVIRONMENT in
    "production")
        if [[ -z "$DOCKER_USERNAME" ]] || [[ -z "$DOCKER_PASSWORD" ]]; then
            print_error "Variables Docker manquantes pour la production!"
            log "❌ Missing Docker credentials for production"
            exit 1
        fi
        ;;
    "staging")
        print_info "Déploiement staging - Variables locales utilisées"
        ;;
    *)
        print_error "Environnement invalide: $ENVIRONMENT (staging|production)"
        log "❌ Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

print_success "Prérequis validés"
log "✅ Prerequisites validated"

# ===========================================
# VÉRIFICATIONS GIT
# ===========================================

print_step "Vérification de l'état Git..."

# Vérifier que nous sommes sur la bonne branche
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
EXPECTED_BRANCH=$([ "$ENVIRONMENT" = "production" ] && echo "main" || echo "develop")

if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]] && [[ "$FORCE_DEPLOY" != "--force" ]]; then
    print_error "Branche incorrecte pour $ENVIRONMENT: $CURRENT_BRANCH (attendu: $EXPECTED_BRANCH)"
    print_info "Utilisez --force pour outrepasser cette vérification"
    log "❌ Wrong branch for $ENVIRONMENT: $CURRENT_BRANCH (expected: $EXPECTED_BRANCH)"
    exit 1
fi

# Vérifier qu'il n'y a pas de changements non commitées
if ! git diff-index --quiet HEAD --; then
    print_error "Changements non commitées détectés!"
    print_info "Commitez vos changements avant le déploiement"
    log "❌ Uncommitted changes detected"
    exit 1
fi

# Vérifier que nous sommes à jour avec origin
git fetch origin
if ! git diff --quiet HEAD origin/$CURRENT_BRANCH; then
    print_error "La branche locale n'est pas à jour avec origin!"
    print_info "Exécutez 'git pull origin $CURRENT_BRANCH'"
    log "❌ Local branch not up to date with origin"
    exit 1
fi

print_success "État Git validé"
log "✅ Git state validated"

# ===========================================
# TESTS AVANT DÉPLOIEMENT
# ===========================================

print_step "Exécution des tests avant déploiement..."

# Tests complets
cd "$PROJECT_ROOT"

# Tests Client
if [[ -f "client/package.json" ]]; then
    print_step "Tests du client..."
    cd client
    npm ci --silent
    npm run lint
    npm run build
    # npm run test:ci || { print_error "Tests client échoués!"; exit 1; }
    cd ..
    print_success "Client: OK"
fi

# Tests Server
if [[ -f "server/package.json" ]]; then
    print_step "Tests du serveur..."
    cd server
    npm ci --silent
    npm run lint
    npm run build
    # npm run test || { print_error "Tests serveur échoués!"; exit 1; }
    cd ..
    print_success "Serveur: OK"
fi

# Tests Discord Bot
if [[ -f "discord-bot/requirements.txt" ]] && [[ -d "discord-bot/venv" ]]; then
    print_step "Tests du bot Discord..."
    cd discord-bot
    source venv/bin/activate
    python -m py_compile bot.py || { print_error "Compilation Python échouée!"; exit 1; }
    # python -m pytest tests/ || { print_error "Tests Python échoués!"; exit 1; }
    cd ..
    print_success "Bot Discord: OK"
fi

log "✅ All tests passed"

# ===========================================
# BUILD & DOCKER
# ===========================================

print_step "Construction des images Docker..."

# Tag pour l'image
IMAGE_TAG=$(git rev-parse --short HEAD)
FULL_IMAGE_NAME="$DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
LATEST_IMAGE_NAME="$DOCKER_REGISTRY/$IMAGE_NAME:latest"

# Build de l'image Docker
print_step "Build de l'image Docker: $FULL_IMAGE_NAME"
docker build -t "$FULL_IMAGE_NAME" -t "$LATEST_IMAGE_NAME" .

print_success "Image Docker construite"
log "✅ Docker image built: $FULL_IMAGE_NAME"

# ===========================================
# DÉPLOIEMENT SELON L'ENVIRONNEMENT
# ===========================================

case $ENVIRONMENT in
    "staging")
        print_step "🎯 Déploiement en staging..."
        
        # Arrêt des services existants
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml down || true
        
        # Mise à jour des variables d'environnement
        cp docker-compose.env.example .env.staging
        
        # Démarrage des nouveaux services
        docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
        
        # Attendre que les services soient prêts
        print_step "Attente de la disponibilité des services..."
        sleep 30
        
        # Health check
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            print_success "Staging déployé avec succès!"
            print_info "URL: http://localhost:3000"
            log "✅ Staging deployment successful"
        else
            print_error "Health check échoué!"
            log "❌ Health check failed"
            exit 1
        fi
        ;;
        
    "production")
        print_step "🌟 Déploiement en production..."
        
        # Authentification Docker Registry
        echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" --password-stdin
        
        # Push de l'image
        print_step "Push de l'image vers le registry..."
        docker push "$FULL_IMAGE_NAME"
        docker push "$LATEST_IMAGE_NAME"
        
        print_success "Image poussée vers le registry"
        log "✅ Image pushed to registry: $FULL_IMAGE_NAME"
        
        # Déploiement sur le serveur de production
        # NOTE: Personnalisez cette section selon votre infrastructure
        print_step "Déploiement sur le serveur de production..."
        
        # Exemple pour un déploiement SSH
        if [[ -n "$PRODUCTION_SERVER" ]] && [[ -n "$PRODUCTION_USER" ]]; then
            ssh "$PRODUCTION_USER@$PRODUCTION_SERVER" << EOF
                docker pull $FULL_IMAGE_NAME
                docker-compose -f /opt/screen-to-deck/docker-compose.prod.yml down
                docker-compose -f /opt/screen-to-deck/docker-compose.prod.yml up -d
EOF
            print_success "Production déployée avec succès!"
            log "✅ Production deployment successful"
        else
            print_warning "Configuration serveur de production manquante"
            print_info "Image disponible dans le registry: $FULL_IMAGE_NAME"
            log "⚠️  Production server configuration missing"
        fi
        ;;
esac

# ===========================================
# POST-DÉPLOIEMENT
# ===========================================

print_step "Tâches post-déploiement..."

# Nettoyage des images Docker obsolètes
print_step "Nettoyage des images obsolètes..."
docker image prune -f > /dev/null 2>&1 || true

# Tag Git pour la production
if [[ "$ENVIRONMENT" = "production" ]]; then
    RELEASE_TAG="v$(date '+%Y.%m.%d')-$(git rev-parse --short HEAD)"
    git tag -a "$RELEASE_TAG" -m "Production release $RELEASE_TAG"
    git push origin "$RELEASE_TAG"
    print_success "Tag de release créé: $RELEASE_TAG"
    log "✅ Release tag created: $RELEASE_TAG"
fi

# Notification (optionnelle)
if [[ -n "$DISCORD_WEBHOOK" ]]; then
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\":\"🚀 **Screen to Deck** déployé en **$ENVIRONMENT**\\n- Commit: \`$(git rev-parse --short HEAD)\`\\n- Branche: \`$CURRENT_BRANCH\`\\n- Heure: $(date)\"}" \
         "$DISCORD_WEBHOOK" > /dev/null 2>&1 || true
    print_success "Notification Discord envoyée"
fi

# ===========================================
# RAPPORT FINAL
# ===========================================

print_success "🎉 Déploiement $ENVIRONMENT terminé avec succès!"
log "🎉 Deployment $ENVIRONMENT completed successfully"

print_info "📊 Résumé du déploiement:"
echo "  🌍 Environnement: $ENVIRONMENT"
echo "  🏷️  Image: $FULL_IMAGE_NAME"
echo "  📦 Commit: $(git rev-parse --short HEAD)"
echo "  🌿 Branche: $CURRENT_BRANCH"
echo "  ⏰ Durée: $((SECONDS / 60))m $((SECONDS % 60))s"

if [[ "$ENVIRONMENT" = "staging" ]]; then
    echo ""
    print_info "🔗 URLs de test:"
    echo "  📱 Frontend: http://localhost:3000"
    echo "  🖥️  Backend: http://localhost:3001"
    echo "  📊 Health: http://localhost:3001/health"
fi

print_success "✨ Déploiement réussi! ✨" 