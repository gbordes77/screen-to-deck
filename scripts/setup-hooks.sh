#!/bin/bash

# ===========================================
# SETUP GIT HOOKS - SCREEN TO DECK
# ===========================================
# Ce script installe automatiquement les Git hooks pour le projet
# Usage: ./scripts/setup-hooks.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

echo "🎯 Installation des Git Hooks pour Screen to Deck"
echo "================================================"

# Vérifier qu'on est dans un repo Git
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    echo "❌ Erreur: Pas dans un repository Git"
    exit 1
fi

print_step "Installation des Git Hooks..."

# ===========================================
# PRE-COMMIT HOOK
# ===========================================

print_step "Création du hook pre-commit..."

cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook pour Screen to Deck
# Exécute les vérifications avant chaque commit

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérifications pre-commit...${NC}"

# Vérifier s'il y a des fichiers stagés
if [[ -z "$STAGED_FILES" ]]; then
    echo -e "${YELLOW}⚠️  Aucun fichier stagé${NC}"
    exit 0
fi

# ===========================================
# VÉRIFICATIONS GÉNÉRALES
# ===========================================

# Vérifier les conflits de merge non résolus
if git diff --cached --name-only | xargs grep -l "^<<<<<<< \|^======= \|^>>>>>>> " 2>/dev/null; then
    echo -e "${RED}❌ Conflits de merge non résolus détectés!${NC}"
    echo "Résolvez les conflits avant de commiter."
    exit 1
fi

# Vérifier les TODO/FIXME critiques
if echo "$STAGED_FILES" | xargs grep -n "TODO:\|FIXME:\|XXX:" 2>/dev/null | grep -i "critical\|urgent\|important"; then
    echo -e "${YELLOW}⚠️  TODO/FIXME critiques détectés${NC}"
    read -p "Continuer quand même? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ===========================================
# VÉRIFICATIONS TYPESCRIPT/JAVASCRIPT
# ===========================================

TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)
if [[ -n "$TS_FILES" ]]; then
    echo -e "${BLUE}🔍 Vérification TypeScript/JavaScript...${NC}"
    
    # Lint des fichiers client
    if echo "$TS_FILES" | grep -q "^client/"; then
        echo "  📱 Lint client..."
        cd "$PROJECT_ROOT/client"
        if ! npm run lint:staged --silent; then
            echo -e "${RED}❌ Erreurs de lint dans le client!${NC}"
            echo "Exécutez 'npm run lint:fix' pour corriger automatiquement."
            exit 1
        fi
        cd "$PROJECT_ROOT"
    fi
    
    # Lint des fichiers server
    if echo "$TS_FILES" | grep -q "^server/"; then
        echo "  🖥️  Lint serveur..."
        cd "$PROJECT_ROOT/server"
        if ! npm run lint:staged --silent; then
            echo -e "${RED}❌ Erreurs de lint dans le serveur!${NC}"
            echo "Exécutez 'npm run lint:fix' pour corriger automatiquement."
            exit 1
        fi
        cd "$PROJECT_ROOT"
    fi
    
    echo -e "${GREEN}✅ TypeScript/JavaScript: OK${NC}"
fi

# ===========================================
# VÉRIFICATIONS PYTHON
# ===========================================

PY_FILES=$(echo "$STAGED_FILES" | grep '\.py$' || true)
if [[ -n "$PY_FILES" ]]; then
    echo -e "${BLUE}🔍 Vérification Python...${NC}"
    
    cd "$PROJECT_ROOT/discord-bot"
    if [[ -d "venv" ]]; then
        source venv/bin/activate
        
        # Vérification syntaxe
        for file in $PY_FILES; do
            if [[ $file == discord-bot/* ]]; then
                local_file="${file#discord-bot/}"
                if ! python -m py_compile "$local_file" 2>/dev/null; then
                    echo -e "${RED}❌ Erreur de syntaxe dans $file${NC}"
                    exit 1
                fi
            fi
        done
        
        # Black formatting check
        if ! black --check $PY_FILES 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Formatage Python non conforme${NC}"
            echo "Exécutez 'black .' pour corriger le formatage."
            read -p "Appliquer le formatage automatiquement? (Y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                black $PY_FILES
                git add $PY_FILES
            fi
        fi
    fi
    cd "$PROJECT_ROOT"
    
    echo -e "${GREEN}✅ Python: OK${NC}"
fi

# ===========================================
# VÉRIFICATIONS PACKAGE.JSON
# ===========================================

if echo "$STAGED_FILES" | grep -q "package\.json$"; then
    echo -e "${BLUE}🔍 Vérification package.json...${NC}"
    
    # Vérifier la validité JSON
    for file in $(echo "$STAGED_FILES" | grep "package\.json$"); do
        if ! python -m json.tool "$file" > /dev/null 2>&1; then
            echo -e "${RED}❌ JSON invalide dans $file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ package.json: OK${NC}"
fi

# ===========================================
# VÉRIFICATIONS DOCKER
# ===========================================

if echo "$STAGED_FILES" | grep -qE "(Dockerfile|docker-compose\.ya?ml)$"; then
    echo -e "${BLUE}🔍 Vérification Docker...${NC}"
    
    # Vérifier la syntaxe des fichiers Docker Compose
    for file in $(echo "$STAGED_FILES" | grep "docker-compose\.ya\?ml$"); do
        if ! docker-compose -f "$file" config > /dev/null 2>&1; then
            echo -e "${RED}❌ Syntaxe invalide dans $file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Docker: OK${NC}"
fi

# ===========================================
# VÉRIFICATIONS DE SÉCURITÉ
# ===========================================

echo -e "${BLUE}🔒 Vérifications de sécurité...${NC}"

# Vérifier les secrets/tokens accidentels
SECRETS_PATTERN="(password|secret|token|key|api_key).*[=:]\s*['\"]?[a-zA-Z0-9]{8,}['\"]?"
if echo "$STAGED_FILES" | xargs grep -iE "$SECRETS_PATTERN" 2>/dev/null | grep -v "example\|test\|dummy"; then
    echo -e "${RED}❌ Secrets potentiels détectés!${NC}"
    echo "Vérifiez que vous ne commitez pas de vraies clés/tokens."
    exit 1
fi

# Vérifier les URLs hardcodées
if echo "$STAGED_FILES" | xargs grep -E "https?://[^/]*\.(com|org|net|io)" 2>/dev/null | grep -v "example\|localhost\|github\|npmjs"; then
    echo -e "${YELLOW}⚠️  URLs hardcodées détectées${NC}"
    echo "Considérez l'utilisation de variables d'environnement."
fi

echo -e "${GREEN}✅ Sécurité: OK${NC}"

echo -e "${GREEN}🎉 Toutes les vérifications sont passées!${NC}"
EOF

chmod +x "$HOOKS_DIR/pre-commit"
print_success "Hook pre-commit installé"

# ===========================================
# COMMIT-MSG HOOK
# ===========================================

print_step "Création du hook commit-msg..."

cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# Commit-msg hook pour Screen to Deck
# Valide le format des messages de commit

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Patterns valides pour les commits conventionnels
CONVENTIONAL_PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,50}"
EMOJI_PATTERN="^(🎉|✨|🐛|📚|💄|♻️|🧪|🔧|⚡|👷|🏗️|⏪|🔀|📦|🚀|🔖|🚨|🚑|💚|⬇️|⬆️|📌|👷|📈|🔒|🔐|🔑|🏷️|🌐|💡|💩|⚗️|🏁|🚩|🔁|🔇|🔊|📱|💥|🍱|♿|💬|💡|🍺|💸|👽|🚚|📄|📜|🗃️|📂|🎨|🎬|🎤|🎵|🔍|🌱|🚩|💫|🎯|🔥|❄️|🌶️|🔒|⚖️|🎌|🏴|🏳️)"

echo -e "${GREEN}🔍 Validation du message de commit...${NC}"

# Vérifier la longueur minimale
if [[ ${#COMMIT_MSG} -lt 10 ]]; then
    echo -e "${RED}❌ Message de commit trop court (minimum 10 caractères)${NC}"
    echo "Message actuel: '$COMMIT_MSG'"
    exit 1
fi

# Vérifier la longueur maximale de la première ligne
FIRST_LINE=$(echo "$COMMIT_MSG" | head -n1)
if [[ ${#FIRST_LINE} -gt 72 ]]; then
    echo -e "${RED}❌ Première ligne trop longue (maximum 72 caractères)${NC}"
    echo "Ligne actuelle (${#FIRST_LINE} caractères): '$FIRST_LINE'"
    exit 1
fi

# Vérifier le format conventionnel ou emoji
if [[ "$COMMIT_MSG" =~ $CONVENTIONAL_PATTERN ]] || [[ "$COMMIT_MSG" =~ $EMOJI_PATTERN ]]; then
    echo -e "${GREEN}✅ Format de commit valide${NC}"
else
    echo -e "${YELLOW}⚠️  Format de commit non conventionnel${NC}"
    echo "Message: '$FIRST_LINE'"
    echo ""
    echo "Formats recommandés:"
    echo "  🎯 Conventional: 'feat: add new feature'"
    echo "  😊 Emoji: '✨ Add new feature'"
    echo ""
    echo "Types conventionnels: feat, fix, docs, style, refactor, test, chore, perf, ci, build"
    
    # Permettre quand même le commit avec avertissement
    read -p "Continuer avec ce message? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}🎉 Message de commit validé!${NC}"
EOF

chmod +x "$HOOKS_DIR/commit-msg"
print_success "Hook commit-msg installé"

# ===========================================
# POST-COMMIT HOOK
# ===========================================

print_step "Création du hook post-commit..."

cat > "$HOOKS_DIR/post-commit" << 'EOF'
#!/bin/bash

# Post-commit hook pour Screen to Deck
# Actions après chaque commit

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo -e "${GREEN}✅ Commit réussi!${NC}"
echo -e "${BLUE}📦 $COMMIT_HASH - $COMMIT_MSG${NC}"

# Statistiques rapides
FILES_CHANGED=$(git diff --name-only HEAD~1..HEAD | wc -l)
INSERTIONS=$(git diff --stat HEAD~1..HEAD | tail -n1 | grep -o '[0-9]\+ insertion' | cut -d' ' -f1 || echo "0")
DELETIONS=$(git diff --stat HEAD~1..HEAD | tail -n1 | grep -o '[0-9]\+ deletion' | cut -d' ' -f1 || echo "0")

echo "📊 Statistiques: $FILES_CHANGED fichier(s), +$INSERTIONS -$DELETIONS lignes"

# Si on n'est pas sur main/master, suggérer un push
if [[ "$BRANCH" != "main" ]] && [[ "$BRANCH" != "master" ]]; then
    echo -e "${BLUE}💡 Suggestion: git push origin $BRANCH${NC}"
fi
EOF

chmod +x "$HOOKS_DIR/post-commit"
print_success "Hook post-commit installé"

# ===========================================
# CONFIGURATION SUPPLÉMENTAIRE
# ===========================================

print_step "Configuration Git supplémentaire..."

# Activer les hooks personnalisés
git config core.hooksPath .git/hooks

# Configuration recommandée pour le projet
git config pull.rebase true
git config push.default current
git config branch.autosetupmerge always
git config branch.autosetuprebase always

print_success "Configuration Git mise à jour"

# ===========================================
# RÉSUMÉ
# ===========================================

echo ""
echo "🎉 Installation des Git Hooks terminée!"
echo "======================================"
print_info "Hooks installés:"
echo "  • pre-commit: Vérifications avant chaque commit"
echo "  • commit-msg: Validation des messages de commit"
echo "  • post-commit: Actions après chaque commit"
echo ""
print_info "Configuration Git mise à jour:"
echo "  • Rebase automatique lors des pulls"
echo "  • Push vers la branche courante par défaut"
echo "  • Setup automatique des branches"
echo ""
print_success "✨ Vos commits sont maintenant sécurisés! ✨" 