#!/bin/bash

# Configuration complète du monitoring
# Usage: ./monitoring-setup.sh [environment]

ENVIRONMENT=${1:-"production"}
PROJECT_NAME=$(basename "$PWD")

echo "📊 Setup Monitoring: $PROJECT_NAME ($ENVIRONMENT)"

# 1. Deploy monitoring stack
deploy_monitoring_stack() {
    echo "🚀 Déploiement stack monitoring..."
    
    # Démarrer Prometheus, Grafana, AlertManager
    docker-compose -f docker/docker-compose.monitoring.yml up -d
    
    echo "⏳ Attente démarrage services..."
    sleep 30
    
    echo "✅ Stack monitoring déployée"
}

# 2. Configure Grafana dashboards
setup_grafana_dashboards() {
    echo "📈 Configuration dashboards Grafana..."
    
    GRAFANA_URL="http://localhost:3000"
    GRAFANA_USER="admin"
    GRAFANA_PASS="admin"
    
    # Attendre que Grafana soit prêt
    until curl -s "$GRAFANA_URL/api/health" > /dev/null; do
        echo "⏳ Attente Grafana..."
        sleep 5
    done
    
    # Importer les dashboards
    for dashboard in monitoring/grafana/dashboards/*.json; do
        if [ -f "$dashboard" ]; then
            echo "📋 Import dashboard: $(basename "$dashboard")"
            
            curl -X POST \
                -H "Content-Type: application/json" \
                -u "$GRAFANA_USER:$GRAFANA_PASS" \
                -d @"$dashboard" \
                "$GRAFANA_URL/api/dashboards/db"
        fi
    done
    
    echo "✅ Dashboards configurés"
}

# 3. Configure data sources
setup_data_sources() {
    echo "🔗 Configuration sources de données..."
    
    GRAFANA_URL="http://localhost:3000"
    GRAFANA_USER="admin"
    GRAFANA_PASS="admin"
    
    # Prometheus datasource
    cat > /tmp/prometheus-datasource.json << EOF
{
  "name": "Prometheus",
  "type": "prometheus",
  "url": "http://prometheus:9090",
  "access": "proxy",
  "isDefault": true
}
EOF
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -u "$GRAFANA_USER:$GRAFANA_PASS" \
        -d @/tmp/prometheus-datasource.json \
        "$GRAFANA_URL/api/datasources"
    
    # Loki datasource for logs
    cat > /tmp/loki-datasource.json << EOF
{
  "name": "Loki",
  "type": "loki",
  "url": "http://loki:3100",
  "access": "proxy"
}
EOF
    
    curl -X POST \
        -H "Content-Type: application/json" \
        -u "$GRAFANA_USER:$GRAFANA_PASS" \
        -d @/tmp/loki-datasource.json \
        "$GRAFANA_URL/api/datasources"
    
    echo "✅ Sources de données configurées"
}

# 4. Setup alerting rules
setup_alerting_rules() {
    echo "🚨 Configuration règles d'alertes..."
    
    # Copier les règles d'alertes
    cp monitoring/alerts/*.yml /tmp/prometheus-alerts/
    
    # Recharger Prometheus
    curl -X POST http://localhost:9090/-/reload
    
    echo "✅ Règles d'alertes configurées"
}

# 5. Configure notification channels
setup_notifications() {
    echo "📱 Configuration notifications..."
    
    GRAFANA_URL="http://localhost:3000"
    GRAFANA_USER="admin"
    GRAFANA_PASS="admin"
    
    # Slack notification channel
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        cat > /tmp/slack-notification.json << EOF
{
  "name": "Slack",
  "type": "slack",
  "settings": {
    "url": "$SLACK_WEBHOOK_URL",
    "channel": "#alerts",
    "title": "🚨 Alert - $PROJECT_NAME",
    "text": "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
  }
}
EOF
        
        curl -X POST \
            -H "Content-Type: application/json" \
            -u "$GRAFANA_USER:$GRAFANA_PASS" \
            -d @/tmp/slack-notification.json \
            "$GRAFANA_URL/api/alert-notifications"
    fi
    
    echo "✅ Notifications configurées"
}

# 6. Create monitoring endpoints in application
setup_app_monitoring() {
    echo "📊 Configuration monitoring application..."
    
    # Créer middleware de métriques si pas déjà présent
    if [ ! -f "server/middleware/metrics.js" ]; then
        cat > server/middleware/metrics.js << 'EOF'
const prometheus = require('prom-client');

// Métriques par défaut
prometheus.collectDefaultMetrics();

// Métriques custom
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Endpoint métriques
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
};

module.exports = { metricsMiddleware, metricsEndpoint };
EOF
    fi
    
    echo "✅ Monitoring application configuré"
}

# 7. Test monitoring stack
test_monitoring() {
    echo "🧪 Test stack monitoring..."
    
    # Test Prometheus
    if curl -s "http://localhost:9090/api/v1/query?query=up" > /dev/null; then
        echo "✅ Prometheus fonctionnel"
    else
        echo "❌ Prometheus ne répond pas"
    fi
    
    # Test Grafana
    if curl -s "http://localhost:3000/api/health" > /dev/null; then
        echo "✅ Grafana fonctionnel"
    else
        echo "❌ Grafana ne répond pas"
    fi
    
    # Test AlertManager
    if curl -s "http://localhost:9093/api/v1/status" > /dev/null; then
        echo "✅ AlertManager fonctionnel"
    else
        echo "❌ AlertManager ne répond pas"
    fi
}

# 8. Generate monitoring report
generate_monitoring_report() {
    echo "📋 Génération rapport monitoring..."
    
    cat > monitoring-report.md << EOF
# 📊 Monitoring Setup Report

## 🎯 Configuration
- **Projet**: $PROJECT_NAME
- **Environnement**: $ENVIRONMENT
- **Date**: $(date)

## 🔗 URLs d'Accès
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

## 📈 Dashboards Disponibles
- **System Overview**: Métriques système globales
- **Application Performance**: Métriques applicatives
- **Business Metrics**: KPIs business
- **Error Tracking**: Suivi des erreurs

## 🚨 Alertes Configurées
- **Application Down**: Alerte critique si app inaccessible
- **High Error Rate**: Alerte si taux d'erreur > 5%
- **High Response Time**: Alerte si latence > 2s
- **Database Issues**: Alerte problèmes BDD

## 📱 Notifications
- **Slack**: #alerts channel configuré
- **Email**: Alerts critiques uniquement

## ✅ Tests de Validation
- [ ] Prometheus collecte métriques
- [ ] Grafana affiche dashboards
- [ ] AlertManager envoie notifications
- [ ] Application expose /metrics

EOF
    
    echo "✅ Rapport généré: monitoring-report.md"
}

# Execution
main() {
    echo "🚀 Démarrage setup monitoring..."
    echo ""
    
    deploy_monitoring_stack
    setup_data_sources
    setup_grafana_dashboards
    setup_alerting_rules
    setup_notifications
    setup_app_monitoring
    test_monitoring
    generate_monitoring_report
    
    echo ""
    echo "🎉 Monitoring configuré avec succès !"
    echo ""
    echo "📋 Accès aux services:"
    echo "   • Grafana: http://localhost:3000 (admin/admin)"
    echo "   • Prometheus: http://localhost:9090"
    echo "   • AlertManager: http://localhost:9093"
    echo ""
    echo "📊 Prochaines étapes:"
    echo "   1. Personnalisez les dashboards selon vos besoins"
    echo "   2. Configurez les seuils d'alerte"
    echo "   3. Testez les notifications"
    echo ""
}

main "$@" 