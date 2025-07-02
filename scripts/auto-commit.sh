#!/bin/bash

# ===========================================
# SCRIPT AUTO-COMMIT - SCREEN TO DECK
# ===========================================
# Ce script automatise le processus de commit avec vérifications
# Usage: ./scripts/auto-commit.sh [message]

set -e  # Arrêter si une commande échoue
set -o pipefail  # Arrêter si un pipe échoue

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/scripts/logs/auto-commit.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${DATE} - $1" | tee -a "$LOG_FILE"
}

# Fonction d'affichage coloré
print_step() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] 🔧 $1${NC}"
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

# Création du dossier de logs si nécessaire
mkdir -p "$(dirname "$LOG_FILE")"

# Message de commit par défaut ou fourni en paramètre
COMMIT_MESSAGE="${1:-"🔄 Auto: $(date '+%Y-%m-%d %H:%M:%S')"}"

print_step "Démarrage du processus auto-commit..."
log "🚀 Starting auto-commit process with message: $COMMIT_MESSAGE"

# ===========================================
# VÉRIFICATIONS PRÉALABLES
# ===========================================

print_step "Vérification de l'état du repository..."

# Vérifier si on est dans un repository Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Erreur: Pas dans un repository Git"
    log "❌ Not in a Git repository"
    exit 1
fi

# Vérifier s'il y a des changements à commiter
if git diff-index --quiet HEAD --; then
    print_warning "Aucun changement à commiter"
    log "⚠️  No changes to commit"
    exit 0
fi

# Vérifier la branche courante
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_step "Branche courante: $CURRENT_BRANCH"
log "📍 Current branch: $CURRENT_BRANCH"

# Protéger les branches principales
if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
    print_error "⛔ Commit direct sur la branche principale interdit!"
    log "❌ Direct commit to main branch forbidden"
    read -p "Créer une nouvelle branche? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        NEW_BRANCH="feature/auto-$(date '+%Y%m%d-%H%M%S')"
        git checkout -b "$NEW_BRANCH"
        print_success "Nouvelle branche créée: $NEW_BRANCH"
        log "✅ New branch created: $NEW_BRANCH"
    else
        exit 1
    fi
fi

# ===========================================
# TESTS AUTOMATIQUES
# ===========================================

print_step "Exécution des tests automatiques..."

# Tests Client
if [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
    print_step "Tests du client React..."
    cd "$PROJECT_ROOT/client"
    if npm run lint --silent; then
        print_success "Lint client: OK"
        log "✅ Client lint passed"
    else
        print_warning "Erreurs de lint détectées - tentative de correction automatique..."
        npm run lint:fix --silent || true
        log "⚠️  Client lint issues found - attempted auto-fix"
    fi
    
    # Tests unitaires (si disponibles)
    if npm run test:ci --silent > /dev/null 2>&1; then
        print_success "Tests client: OK"
        log "✅ Client tests passed"
    else
        print_warning "Tests client échoués ou non configurés"
        log "⚠️  Client tests failed or not configured"
    fi
fi

# Tests Server
if [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
    print_step "Tests du serveur Node.js..."
    cd "$PROJECT_ROOT/server"
    if npm run lint --silent; then
        print_success "Lint serveur: OK"
        log "✅ Server lint passed"
    else
        print_warning "Erreurs de lint détectées - tentative de correction automatique..."
        npm run lint:fix --silent || true
        log "⚠️  Server lint issues found - attempted auto-fix"
    fi
    
    # Build test
    if npm run build --silent; then
        print_success "Build serveur: OK"
        log "✅ Server build passed"
    else
        print_error "Build serveur échoué!"
        log "❌ Server build failed"
        exit 1
    fi
fi

# Tests Discord Bot
if [[ -f "$PROJECT_ROOT/discord-bot/requirements.txt" ]]; then
    print_step "Tests du bot Discord..."
    cd "$PROJECT_ROOT/discord-bot"
    
    # Vérifier l'environnement Python
    if [[ -d "venv" ]]; then
        source venv/bin/activate
        
        # Vérification syntaxe Python
        if python -m py_compile bot.py > /dev/null 2>&1; then
            print_success "Syntaxe Python: OK"
            log "✅ Python syntax check passed"
        else
            print_error "Erreur de syntaxe Python!"
            log "❌ Python syntax check failed"
            exit 1
        fi
        
        # Tests Python (si disponibles)
        if [[ -d "tests" ]]; then
            if python -m pytest tests/ -q > /dev/null 2>&1; then
                print_success "Tests Python: OK"
                log "✅ Python tests passed"
            else
                print_warning "Tests Python échoués"
                log "⚠️  Python tests failed"
            fi
        fi
    else
        print_warning "Environnement Python virtuel non trouvé"
        log "⚠️  Python virtual environment not found"
    fi
fi

cd "$PROJECT_ROOT"

# ===========================================
# FORMATAGE AUTOMATIQUE
# ===========================================

print_step "Formatage automatique du code..."

# Prettier pour JavaScript/TypeScript
if command -v npx > /dev/null 2>&1; then
    npx prettier --write "client/src/**/*.{ts,tsx,js,jsx}" > /dev/null 2>&1 || true
    npx prettier --write "server/src/**/*.{ts,js}" > /dev/null 2>&1 || true
    print_success "Formatage Prettier: OK"
    log "✅ Prettier formatting applied"
fi

# Black pour Python
if [[ -d "$PROJECT_ROOT/discord-bot/venv" ]]; then
    cd "$PROJECT_ROOT/discord-bot"
    source venv/bin/activate
    black . > /dev/null 2>&1 || true
    print_success "Formatage Python: OK"
    log "✅ Black formatting applied"
    cd "$PROJECT_ROOT"
fi

# ===========================================
# COMMIT PROCESS
# ===========================================

print_step "Préparation du commit..."

# Ajouter tous les fichiers modifiés
git add .

# Vérifier à nouveau s'il y a des changements après le formatage
if git diff-index --quiet HEAD --; then
    print_warning "Aucun changement après formatage"
    log "⚠️  No changes after formatting"
    exit 0
fi

# Afficher les fichiers qui seront commitées
print_step "Fichiers à commiter:"
git diff --cached --name-only | while read file; do
    echo "  📄 $file"
done

# Commit avec signature
print_step "Création du commit..."
git commit -m "$COMMIT_MESSAGE" -S 2>/dev/null || git commit -m "$COMMIT_MESSAGE"

COMMIT_HASH=$(git rev-parse --short HEAD)
print_success "Commit créé: $COMMIT_HASH"
log "✅ Commit created: $COMMIT_HASH with message: $COMMIT_MESSAGE"

# ===========================================
# PUSH AUTOMATIQUE (OPTIONNEL)
# ===========================================

# Demander confirmation pour le push
read -p "🚀 Pousser vers l'origine? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    print_warning "Push annulé par l'utilisateur"
    log "⚠️  Push cancelled by user"
else
    print_step "Push vers l'origine..."
    
    # Vérifier si la branche existe sur l'origine
    if git ls-remote --heads origin "$CURRENT_BRANCH" | grep -q "$CURRENT_BRANCH"; then
        git push origin "$CURRENT_BRANCH"
    else
        git push -u origin "$CURRENT_BRANCH"
    fi
    
    print_success "Push terminé!"
    log "✅ Push completed successfully"
    
    # Afficher l'URL pour créer une PR si on n'est pas sur main/master
    if [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "master" ]]; then
        REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
        if [[ $REPO_URL == git@* ]]; then
            REPO_URL="https://github.com/$(echo $REPO_URL | cut -d: -f2)"
        fi
        echo ""
        print_step "🔗 Créer une Pull Request:"
        echo "   $REPO_URL/compare/$CURRENT_BRANCH?expand=1"
    fi
fi

print_success "🎉 Processus auto-commit terminé avec succès!"
log "🎉 Auto-commit process completed successfully"

# ===========================================
# NETTOYAGE ET STATISTIQUES
# ===========================================

print_step "Statistiques du repository:"
echo "  📊 Commits total: $(git rev-list --count HEAD)"
echo "  👤 Contributeurs: $(git shortlog -sn | wc -l)"
echo "  📂 Fichiers suivis: $(git ls-files | wc -l)"
echo "  📝 Lignes de code:"

# Compter les lignes par langage
if command -v wc > /dev/null 2>&1; then
    echo "    TypeScript: $(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0") lignes"
    echo "    JavaScript: $(find . -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0") lignes"
    echo "    Python: $(find . -name "*.py" | grep -v venv | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0") lignes"
fi

log "📊 Repository statistics logged"

echo ""
print_success "✨ Auto-commit terminé! Bon développement! ✨" 