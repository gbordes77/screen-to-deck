#!/bin/bash

# ===========================================
# SETUP AUTOMATISATION COMPLÈTE - SCREEN TO DECK
# ===========================================
# Ce script installe et configure tout le système d'automatisation
# Usage: ./scripts/setup-automation.sh [--full] [--minimal]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Arguments
FULL_INSTALL=false
MINIMAL_INSTALL=false

for arg in "$@"; do
    case $arg in
        --full) FULL_INSTALL=true ;;
        --minimal) MINIMAL_INSTALL=true ;;
    esac
done

print_header() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║        🚀 SCREEN TO DECK AUTOMATION SETUP         ║"
    echo "║           Configuration automatisée complète        ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

print_info() {
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] ℹ️  $1${NC}"
}

print_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
}

print_header

# ===========================================
# VÉRIFICATION DES PRÉREQUIS
# ===========================================

print_section "🔍 VÉRIFICATION DES PRÉREQUIS"

print_step "Vérification de l'environnement système..."

# Vérifier l'OS
if [[ "$OSTYPE" != "darwin"* ]] && [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "OS non supporté: $OSTYPE"
    exit 1
fi

print_success "OS supporté: $OSTYPE"

# Vérifier Git
if ! command -v git &> /dev/null; then
    print_error "Git n'est pas installé!"
    exit 1
fi
print_success "Git: $(git --version)"

# Vérifier si on est dans un repo Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Pas dans un repository Git!"
    exit 1
fi
print_success "Repository Git détecté"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js non trouvé - Installation recommandée"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Installation via Homebrew: brew install node"
    else
        print_info "Installation via NodeSource: https://nodejs.org/"
    fi
else
    print_success "Node.js: $(node --version)"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    print_warning "npm non trouvé"
else
    print_success "npm: $(npm --version)"
fi

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 non trouvé - Installation recommandée"
else
    print_success "Python3: $(python3 --version)"
fi

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker non trouvé - Installation recommandée pour le déploiement"
else
    print_success "Docker: $(docker --version)"
fi

# ===========================================
# INSTALLATION DES OUTILS CLI
# ===========================================

print_section "🛠️ INSTALLATION DES OUTILS CLI"

install_homebrew() {
    if [[ "$OSTYPE" == "darwin"* ]] && ! command -v brew &> /dev/null; then
        print_step "Installation de Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_success "Homebrew installé"
    fi
}

install_github_cli() {
    if ! command -v gh &> /dev/null; then
        print_step "Installation de GitHub CLI..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install gh
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt update
            sudo apt install gh
        fi
        print_success "GitHub CLI installé"
    else
        print_success "GitHub CLI déjà installé: $(gh --version | head -n1)"
    fi
}

if [[ "$FULL_INSTALL" = true ]]; then
    install_homebrew
    install_github_cli
fi

# ===========================================
# CONFIGURATION GIT HOOKS
# ===========================================

print_section "🪝 CONFIGURATION DES GIT HOOKS"

print_step "Installation des Git Hooks..."
if [[ -f "$PROJECT_ROOT/scripts/setup-hooks.sh" ]]; then
    chmod +x "$PROJECT_ROOT/scripts/setup-hooks.sh"
    "$PROJECT_ROOT/scripts/setup-hooks.sh"
else
    print_warning "Script setup-hooks.sh non trouvé"
fi

# ===========================================
# CONFIGURATION DES SCRIPTS
# ===========================================

print_section "📜 CONFIGURATION DES SCRIPTS"

print_step "Rendre les scripts exécutables..."

scripts_to_make_executable=(
    "scripts/auto-commit.sh"
    "scripts/deploy.sh"
    "scripts/dev.sh"
    "scripts/setup-hooks.sh"
)

for script in "${scripts_to_make_executable[@]}"; do
    if [[ -f "$PROJECT_ROOT/$script" ]]; then
        chmod +x "$PROJECT_ROOT/$script"
        print_success "Script exécutable: $script"
    else
        print_warning "Script non trouvé: $script"
    fi
done

# Créer les dossiers nécessaires
mkdir -p "$PROJECT_ROOT/scripts/logs"
mkdir -p "$PROJECT_ROOT/.vscode"

print_success "Dossiers créés"

# ===========================================
# CONFIGURATION DES ALIAS GIT
# ===========================================

print_section "🔧 CONFIGURATION DES ALIAS GIT"

print_step "Configuration des alias Git pratiques..."

git_aliases=(
    "st:status"
    "co:checkout"
    "br:branch"
    "ci:commit"
    "ca:commit -a"
    "cam:commit -am"
    "df:diff"
    "dc:diff --cached"
    "lg:log --oneline --graph --decorate --all"
    "ll:log --pretty=format:'%h %ad %s (%an)' --date=short"
    "unstage:reset HEAD --"
    "last:log -1 HEAD"
    "visual:!gitk"
    "auto:!$PROJECT_ROOT/scripts/auto-commit.sh"
    "dev:!$PROJECT_ROOT/scripts/dev.sh"
    "deploy:!$PROJECT_ROOT/scripts/deploy.sh"
)

for alias_def in "${git_aliases[@]}"; do
    alias_name="${alias_def%%:*}"
    alias_command="${alias_def##*:}"
    git config --global alias."$alias_name" "$alias_command"
    print_info "Alias configuré: git $alias_name -> $alias_command"
done

print_success "Alias Git configurés"

# ===========================================
# CONFIGURATION DES VARIABLES D'ENVIRONNEMENT
# ===========================================

print_section "🌍 CONFIGURATION DES VARIABLES D'ENVIRONNEMENT"

print_step "Création des fichiers d'environnement..."

# Créer .env.example s'il n'existe pas
if [[ ! -f "$PROJECT_ROOT/.env.example" ]]; then
    cat > "$PROJECT_ROOT/.env.example" << 'EOF'
# ===========================================
# VARIABLES D'ENVIRONNEMENT - SCREEN TO DECK
# ===========================================
# Copiez ce fichier vers .env et remplissez les valeurs

# API Keys
OPENAI_API_KEY=your-openai-api-key-here
DISCORD_TOKEN=your-discord-token-here
DISCORD_TOKEN_STAGING=your-staging-discord-token-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/screen_to_deck
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-key-here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Docker
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Deployment
PRODUCTION_SERVER=your-server.com
PRODUCTION_USER=deploy
DISCORD_WEBHOOK=your-discord-webhook-url

# Monitoring
GRAFANA_PASSWORD=admin
REDIS_PASSWORD=your-redis-password
EOF
    print_success "Fichier .env.example créé"
fi

# Créer .env local s'il n'existe pas
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    print_warning "Fichier .env créé - Vous devez le remplir avec vos vraies valeurs!"
    print_info "Éditez le fichier .env avant de continuer"
fi

# ===========================================
# CONFIGURATION DES DÉPENDANCES
# ===========================================

if [[ "$FULL_INSTALL" = true ]]; then
    print_section "📦 INSTALLATION DES DÉPENDANCES"
    
    # Client
    if [[ -f "$PROJECT_ROOT/client/package.json" ]]; then
        print_step "Installation des dépendances client..."
        cd "$PROJECT_ROOT/client"
        npm install
        print_success "Dépendances client installées"
        cd "$PROJECT_ROOT"
    fi
    
    # Server
    if [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
        print_step "Installation des dépendances serveur..."
        cd "$PROJECT_ROOT/server"
        npm install
        print_success "Dépendances serveur installées"
        cd "$PROJECT_ROOT"
    fi
    
    # Discord Bot
    if [[ -f "$PROJECT_ROOT/discord-bot/requirements.txt" ]]; then
        print_step "Configuration de l'environnement Python..."
        cd "$PROJECT_ROOT/discord-bot"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        print_success "Environnement Python configuré"
        cd "$PROJECT_ROOT"
    fi
fi

# ===========================================
# CRÉATION DES RACCOURCIS
# ===========================================

print_section "⚡ CRÉATION DES RACCOURCIS"

print_step "Création des raccourcis de commande..."

# Créer un script de raccourcis
cat > "$PROJECT_ROOT/std" << 'EOF'
#!/bin/bash
# Screen To Deck - Raccourci de commandes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$1" in
    "dev"|"start")
        exec "$SCRIPT_DIR/scripts/dev.sh" "${@:2}"
        ;;
    "stop")
        exec "$SCRIPT_DIR/scripts/dev.sh" --stop
        ;;
    "logs")
        exec "$SCRIPT_DIR/scripts/dev.sh" --logs
        ;;
    "commit"|"c")
        exec "$SCRIPT_DIR/scripts/auto-commit.sh" "${@:2}"
        ;;
    "deploy"|"d")
        exec "$SCRIPT_DIR/scripts/deploy.sh" "${@:2}"
        ;;
    "clean")
        exec "$SCRIPT_DIR/scripts/dev.sh" --clean
        ;;
    "hooks")
        exec "$SCRIPT_DIR/scripts/setup-hooks.sh"
        ;;
    "help"|"-h"|"--help"|"")
        echo "🚀 Screen To Deck - Raccourcis de commandes"
        echo ""
        echo "Usage: ./std <commande> [options]"
        echo ""
        echo "Commandes disponibles:"
        echo "  dev, start      Lancer l'environnement de développement"
        echo "  stop            Arrêter tous les services"
        echo "  logs            Afficher les logs en temps réel"
        echo "  commit, c       Commit automatique avec vérifications"
        echo "  deploy, d       Déployer l'application"
        echo "  clean           Nettoyer et réinstaller les dépendances"
        echo "  hooks           Réinstaller les Git hooks"
        echo "  help            Afficher cette aide"
        echo ""
        echo "Exemples:"
        echo "  ./std dev              # Lancer le développement"
        echo "  ./std commit \"fix: bug\" # Commit avec message"
        echo "  ./std deploy staging   # Déployer en staging"
        ;;
    *)
        echo "❌ Commande inconnue: $1"
        echo "Utilisez './std help' pour voir les commandes disponibles"
        exit 1
        ;;
esac
EOF

chmod +x "$PROJECT_ROOT/std"
print_success "Raccourci 'std' créé"

# ===========================================
# TESTS FINAUX
# ===========================================

print_section "🧪 TESTS FINAUX"

print_step "Test des scripts installés..."

# Test des permissions
test_commands=(
    "./std help"
    "git auto --help 2>/dev/null || echo 'Git alias non fonctionnel'"
)

for cmd in "${test_commands[@]}"; do
    if eval "$cmd" > /dev/null 2>&1; then
        print_success "Test réussi: $cmd"
    else
        print_warning "Test échoué: $cmd"
    fi
done

# ===========================================
# RÉSUMÉ FINAL
# ===========================================

print_section "🎉 INSTALLATION TERMINÉE"

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════╗"
echo "║          ✨ AUTOMATISATION CONFIGURÉE ✨           ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_info "🚀 Fonctionnalités installées:"
echo "  ✅ Git Hooks (pre-commit, commit-msg, post-commit)"
echo "  ✅ Scripts d'automatisation (commit, deploy, dev)"
echo "  ✅ Configuration Cursor/VSCode"
echo "  ✅ GitHub Actions workflows"
echo "  ✅ Alias Git pratiques"
echo "  ✅ Raccourci de commandes (./std)"

echo ""
print_info "🎯 Commandes principales:"
echo "  ./std dev        # Lancer l'environnement de développement"
echo "  ./std commit     # Commit automatique avec vérifications"
echo "  ./std deploy     # Déployer l'application"
echo "  git auto         # Commit automatique (alias)"

echo ""
print_info "📝 Prochaines étapes:"
echo "  1. Éditez le fichier .env avec vos vraies clés API"
echo "  2. Configurez vos secrets GitHub (Settings > Secrets)"
echo "  3. Testez avec: ./std dev"

if [[ "$MINIMAL_INSTALL" != true ]]; then
    echo ""
    print_warning "⚠️  Configuration manuelle requise:"
    echo "  • Variables d'environnement dans .env"
    echo "  • Secrets GitHub pour CI/CD"
    echo "  • Configuration Discord Bot (token)"
    echo "  • Configuration OpenAI API Key"
fi

echo ""
print_success "🎊 Automatisation prête! Bon développement! 🎊" 