#!/bin/bash

# Script de vérification santé post-déploiement
# Usage: ./health-check.sh [URL]

URL=${1:-"http://localhost:3001"}
TIMEOUT=30
MAX_RETRIES=5

echo "🩺 Health Check: $URL"

# 1. Basic connectivity test
test_connectivity() {
    echo "🔌 Test de connectivité..."
    
    if curl -f --connect-timeout $TIMEOUT "$URL" > /dev/null 2>&1; then
        echo "✅ Connexion établie"
        return 0
    else
        echo "❌ Impossible de se connecter"
        return 1
    fi
}

# 2. Health endpoint test
test_health_endpoint() {
    echo "❤️ Test endpoint santé..."
    
    HEALTH_URL="$URL/health"
    
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -f --connect-timeout $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
            echo "✅ Endpoint /health répond"
            return 0
        fi
        echo "⏳ Tentative $i/$MAX_RETRIES..."
        sleep 5
    done
    
    echo "❌ Endpoint /health ne répond pas"
    return 1
}

# 3. API endpoints test
test_api_endpoints() {
    echo "🔧 Test des endpoints API..."
    
    endpoints=("/api/status" "/api/version")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f --connect-timeout $TIMEOUT "$URL$endpoint" > /dev/null 2>&1; then
            echo "✅ $endpoint OK"
        else
            echo "⚠️ $endpoint ne répond pas"
        fi
    done
}

# 4. Performance test
test_performance() {
    echo "⚡ Test de performance..."
    
    # Mesurer le temps de réponse
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$URL")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)
    
    echo "📊 Temps de réponse: ${RESPONSE_MS}ms"
    
    if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
        echo "✅ Performance acceptable"
    else
        echo "⚠️ Performance dégradée (>2s)"
    fi
}

# 5. Database connectivity test
test_database() {
    echo "🗄️ Test connectivité base de données..."
    
    DB_HEALTH_URL="$URL/api/db/health"
    
    if curl -f --connect-timeout $TIMEOUT "$DB_HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Base de données accessible"
    else
        echo "⚠️ Problème connectivité base de données"
    fi
}

# 6. Generate health report
generate_report() {
    echo ""
    echo "📋 RAPPORT DE SANTÉ"
    echo "===================="
    echo "🌐 URL testée: $URL"
    echo "⏰ Timestamp: $(date)"
    echo ""
    
    # Test complets
    CONNECTIVITY_OK=false
    HEALTH_OK=false
    
    if test_connectivity; then
        CONNECTIVITY_OK=true
    fi
    
    if test_health_endpoint; then
        HEALTH_OK=true
    fi
    
    test_api_endpoints
    test_performance
    test_database
    
    echo ""
    echo "📊 RÉSUMÉ"
    echo "========="
    
    if $CONNECTIVITY_OK && $HEALTH_OK; then
        echo "🟢 STATUS: HEALTHY"
        echo "✅ Application opérationnelle"
        exit 0
    else
        echo "🔴 STATUS: UNHEALTHY"
        echo "❌ Problèmes détectés"
        exit 1
    fi
}

# Execution
main() {
    echo "🚀 Démarrage health check..."
    echo "🎯 Target: $URL"
    echo ""
    
    generate_report
}

main "$@" 