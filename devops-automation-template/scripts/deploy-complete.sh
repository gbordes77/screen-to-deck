#!/bin/bash

# Déploiement complet multi-environnement
# Usage: ./deploy-complete.sh [staging|production]

ENVIRONMENT=${1:-"staging"}
PROJECT_NAME=$(basename "$PWD")

echo "🚀 Déploiement $PROJECT_NAME vers $ENVIRONMENT"

# 1. Pre-deployment checks
pre_deployment_checks() {
    echo "🔍 Vérifications pré-déploiement..."
    
    # Tests
    npm run test || {
        echo "❌ Tests échoués"
        exit 1
    }
    
    # Security audit
    npm audit --audit-level=high || {
        echo "⚠️ Vulnérabilités détectées"
        read -p "Continuer malgré tout? (y/N): " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    }
    
    # Build test
    npm run build || {
        echo "❌ Build échoué"
        exit 1
    }
    
    echo "✅ Vérifications passées"
}

# 2. Database migration
run_migrations() {
    echo "🗄️ Migration base de données..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Backup avant migration production
        ./scripts/backup.sh "pre-deploy-$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Run migrations (adapter selon votre ORM)
    npm run db:migrate
    
    echo "✅ Migrations terminées"
}

# 3. Deploy to cloud
deploy_to_cloud() {
    echo "☁️ Déploiement vers $ENVIRONMENT..."
    
    case "$ENVIRONMENT" in
        "staging")
            # Fly.io staging
            fly deploy --app "$PROJECT_NAME-staging" --build-arg ENV=staging
            ;;
        "production")
            # Déploiement blue-green pour zéro downtime
            fly deploy --app "$PROJECT_NAME" --build-arg ENV=production --strategy=canary
            ;;
        *)
            echo "❌ Environnement invalide: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    echo "✅ Déploiement cloud terminé"
}

# 4. Health checks
post_deployment_health_checks() {
    echo "🩺 Vérifications post-déploiement..."
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        URL="https://$PROJECT_NAME-staging.fly.dev"
    else
        URL="https://$PROJECT_NAME.fly.dev"
    fi
    
    # Health check endpoint
    for i in {1..10}; do
        if curl -f "$URL/health" > /dev/null 2>&1; then
            echo "✅ Application en ligne"
            break
        fi
        echo "⏳ Tentative $i/10..."
        sleep 10
    done
    
    # Test fonctionnel de base
    if curl -f "$URL/api/status" > /dev/null 2>&1; then
        echo "✅ API fonctionnelle"
    else
        echo "⚠️ API ne répond pas"
    fi
}

# 5. Update monitoring
update_monitoring() {
    echo "📊 Mise à jour monitoring..."
    
    # Redémarrer Prometheus pour nouvelle config
    docker-compose -f docker-compose.prod.yml restart prometheus
    
    # Notification Grafana
    curl -X POST \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"🚀 Déploiement $PROJECT_NAME $ENVIRONMENT terminé\"}" \
        "$SLACK_WEBHOOK_URL" || true
    
    echo "✅ Monitoring mis à jour"
}

# Exécution principale
main() {
    echo "📋 Déploiement $PROJECT_NAME vers $ENVIRONMENT"
    echo "⏰ Début: $(date)"
    
    pre_deployment_checks
    run_migrations
    deploy_to_cloud
    post_deployment_health_checks
    update_monitoring
    
    echo ""
    echo "🎉 Déploiement terminé avec succès !"
    echo "🌐 URL: https://$PROJECT_NAME$([ "$ENVIRONMENT" = "staging" ] && echo "-staging").fly.dev"
    echo "📊 Monitoring: http://localhost:3000"
    echo "⏰ Fin: $(date)"
}

main "$@" 