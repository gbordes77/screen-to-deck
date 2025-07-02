#!/bin/bash

# Configuration infrastructure complète pour tout projet
# Usage: ./setup-infrastructure.sh [project-name] [environment]

PROJECT_NAME=${1:-"my-saas"}
ENVIRONMENT=${2:-"production"}

echo "🚀 Setup Infrastructure: $PROJECT_NAME ($ENVIRONMENT)"

# 1. Validation prérequis
check_prerequisites() {
    echo "🔍 Vérification des prérequis..."
    
    commands=("docker" "fly" "git" "npm")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            echo "❌ $cmd n'est pas installé"
            exit 1
        fi
    done
    echo "✅ Tous les prérequis sont installés"
}

# 2. Setup secrets et variables
setup_secrets() {
    echo "🔐 Configuration des secrets..."
    
    # GitHub Secrets via CLI
    gh secret set DATABASE_URL --body "$DATABASE_URL" --repo "$GITHUB_REPO"
    gh secret set FLY_API_TOKEN --body "$FLY_API_TOKEN" --repo "$GITHUB_REPO"
    gh secret set SLACK_WEBHOOK_URL --body "$SLACK_WEBHOOK_URL" --repo "$GITHUB_REPO"
    
    echo "✅ Secrets configurés"
}

# 3. Setup monitoring
setup_monitoring() {
    echo "📊 Déploiement du monitoring..."
    
    # Créer stack monitoring
    docker-compose -f docker-compose.monitoring.yml up -d
    
    # Attendre que Grafana soit prêt
    echo "⏳ Attente de Grafana..."
    sleep 30
    
    # Importer les dashboards
    for dashboard in monitoring/grafana/dashboards/*.json; do
        curl -X POST \
            -H "Content-Type: application/json" \
            -d @"$dashboard" \
            http://admin:admin@localhost:3000/api/dashboards/db
    done
    
    echo "✅ Monitoring configuré"
}

# 4. Setup déploiement cloud
setup_deployment() {
    echo "☁️ Configuration déploiement cloud..."
    
    # Fly.io
    if [ -f "fly.toml" ]; then
        fly apps create "$PROJECT_NAME-$ENVIRONMENT" || true
        fly secrets set DATABASE_URL="$DATABASE_URL" -a "$PROJECT_NAME-$ENVIRONMENT"
    fi
    
    # Railway
    if [ -f "railway.json" ]; then
        railway login
        railway new "$PROJECT_NAME-$ENVIRONMENT"
    fi
    
    echo "✅ Déploiement cloud configuré"
}

# 5. Setup backup
setup_backup() {
    echo "💾 Configuration backup automatique..."
    
    # Cron job pour backup quotidien
    (crontab -l 2>/dev/null; echo "0 2 * * * $PWD/scripts/backup.sh") | crontab -
    
    # Premier backup de test
    ./scripts/backup.sh test
    
    echo "✅ Backup configuré"
}

# Exécution
main() {
    check_prerequisites
    setup_secrets
    setup_monitoring
    setup_deployment
    setup_backup
    
    echo ""
    echo "🎉 Infrastructure $PROJECT_NAME configurée avec succès !"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Vérifiez Grafana: http://localhost:3000"
    echo "   2. Testez le déploiement: ./scripts/deploy-complete.sh"
    echo "   3. Configurez les alertes Slack"
    echo ""
}

main "$@" 