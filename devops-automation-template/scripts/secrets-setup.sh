#!/bin/bash

# Configuration sécurisée des secrets pour tout projet
# Usage: ./secrets-setup.sh [environment]

ENVIRONMENT=${1:-"production"}
PROJECT_NAME=$(basename "$PWD")

echo "🔐 Configuration des secrets pour $PROJECT_NAME ($ENVIRONMENT)"

# 1. Génération de secrets sécurisés
generate_secrets() {
    echo "🎲 Génération de secrets sécurisés..."
    
    # JWT Secret (256 bits)
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Session Secret (256 bits)
    SESSION_SECRET=$(openssl rand -hex 32)
    
    # Database Password (strong)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    echo "✅ Secrets générés"
}

# 2. Configuration GitHub Secrets
setup_github_secrets() {
    echo "📝 Configuration GitHub Secrets..."
    
    if ! command -v gh &> /dev/null; then
        echo "⚠️ GitHub CLI non installé, configuration manuelle requise"
        return
    fi
    
    # Core secrets
    gh secret set JWT_SECRET --body "$JWT_SECRET"
    gh secret set SESSION_SECRET --body "$SESSION_SECRET"
    gh secret set DATABASE_URL --body "$DATABASE_URL"
    
    # Environment specific
    if [ "$ENVIRONMENT" = "production" ]; then
        gh secret set PRODUCTION_URL --body "https://$PROJECT_NAME.fly.dev"
    else
        gh secret set STAGING_URL --body "https://$PROJECT_NAME-staging.fly.dev"
    fi
    
    echo "✅ GitHub Secrets configurés"
}

# 3. Configuration Fly.io secrets
setup_fly_secrets() {
    echo "🪂 Configuration Fly.io secrets..."
    
    if ! command -v fly &> /dev/null; then
        echo "⚠️ Fly CLI non installé, configuration manuelle requise"
        return
    fi
    
    APP_NAME="$PROJECT_NAME$([ "$ENVIRONMENT" != "production" ] && echo "-$ENVIRONMENT")"
    
    fly secrets set \
        JWT_SECRET="$JWT_SECRET" \
        SESSION_SECRET="$SESSION_SECRET" \
        DATABASE_URL="$DATABASE_URL" \
        --app "$APP_NAME"
    
    echo "✅ Fly.io secrets configurés"
}

# 4. Validation sécurité
security_validation() {
    echo "🔍 Validation sécurité..."
    
    # Check pour secrets par défaut
    if grep -r "your-secret-here" . --exclude-dir=node_modules 2>/dev/null; then
        echo "⚠️ Secrets par défaut détectés dans le code"
    fi
    
    # Check pour API keys hardcodées
    if grep -r "sk_\|pk_\|api_key" . --exclude-dir=node_modules --exclude="*.md" 2>/dev/null; then
        echo "⚠️ Possible API keys hardcodées détectées"
    fi
    
    # Check permissions .env
    if [ -f ".env" ]; then
        PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null)
        if [ "$PERMS" != "600" ]; then
            chmod 600 .env
            echo "🔒 Permissions .env corrigées (600)"
        fi
    fi
    
    echo "✅ Validation sécurité terminée"
}

# Exécution
main() {
    generate_secrets
    setup_github_secrets
    setup_fly_secrets
    security_validation
    
    echo ""
    echo "🎉 Configuration des secrets terminée !"
    echo ""
    echo "📋 Secrets générés:"
    echo "   • JWT_SECRET: ✅"
    echo "   • SESSION_SECRET: ✅"
    echo "   • DB_PASSWORD: ✅"
    echo ""
    echo "⚠️ IMPORTANT:"
    echo "   • Sauvegardez ces secrets dans un gestionnaire de mots de passe"
    echo "   • Ne committez jamais les vraies valeurs"
    echo "   • Rotez les secrets régulièrement"
}

main "$@" 