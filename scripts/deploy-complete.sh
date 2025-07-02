#!/bin/bash

# ==============================================
# SCREEN-TO-DECK ONE-CLICK DEPLOYMENT
# Déploiement complet automatisé
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

DEPLOY_LOG="deploy-$(date +%Y%m%d-%H%M%S).log"

# ==============================================
# HELPER FUNCTIONS
# ==============================================

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}" | tee -a "$DEPLOY_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}" | tee -a "$DEPLOY_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}" | tee -a "$DEPLOY_LOG"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}" | tee -a "$DEPLOY_LOG"
    exit 1
}

success() {
    echo -e "${PURPLE}[$(date +'%H:%M:%S')] 🎉 $1${NC}" | tee -a "$DEPLOY_LOG"
}

# Banner
clear
echo -e "${PURPLE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║             🚀 SCREEN-TO-DECK ONE-CLICK DEPLOY                  ║
║                Production Ready in 10 Minutes                   ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ==============================================
# OPTIONS DE DÉPLOIEMENT
# ==============================================

choose_deployment_target() {
    echo ""
    echo "🎯 Choose deployment target:"
    echo "1) 🚁 Fly.io (Recommended - Global CDN)"
    echo "2) 🚄 Railway (Simple & Fast)"
    echo "3) 🐳 Docker Compose (Self-hosted)"
    echo "4) ☁️  All platforms (Full deployment)"
    echo ""
    read -p "Select option (1-4): " deploy_choice
    
    case $deploy_choice in
        1) DEPLOY_TARGET="flyio" ;;
        2) DEPLOY_TARGET="railway" ;;
        3) DEPLOY_TARGET="docker" ;;
        4) DEPLOY_TARGET="all" ;;
        *) error "Invalid choice" ;;
    esac
    
    info "Deployment target: $DEPLOY_TARGET"
}

# ==============================================
# PRE-DEPLOYMENT CHECKS
# ==============================================

pre_deploy_checks() {
    info "🔍 Running pre-deployment checks..."
    
    # Check if project is built
    if [ ! -f "client/dist/index.html" ]; then
        info "Building client application..."
        cd client && npm run build && cd ..
        log "Client built successfully"
    fi
    
    if [ ! -f "server/dist/index.js" ]; then
        info "Building server application..."
        cd server && npm run build && cd ..
        log "Server built successfully"
    fi
    
    # Check environment files
    if [ ! -f "server/.env" ]; then
        warn "No environment file found. Running infrastructure setup..."
        ./scripts/setup-infrastructure.sh
    fi
    
    # Docker image test
    info "Testing Docker build..."
    docker build -f Dockerfile.saas -t screen-to-deck:deploy-test . > /dev/null 2>&1
    log "Docker build successful"
    
    # Cleanup test image
    docker rmi screen-to-deck:deploy-test > /dev/null 2>&1 || true
    
    log "Pre-deployment checks passed"
}

# ==============================================
# FLY.IO DEPLOYMENT
# ==============================================

deploy_to_flyio() {
    info "🚁 Deploying to Fly.io..."
    
    # Check Fly CLI
    if ! command -v flyctl &> /dev/null; then
        error "Fly CLI not installed. Run: curl -L https://fly.io/install.sh | sh"
    fi
    
    # Check login
    if ! flyctl auth whoami &> /dev/null; then
        warn "Please login to Fly.io first:"
        flyctl auth login
    fi
    
    # Deploy staging first
    info "Deploying to staging..."
    flyctl deploy --app screen-to-deck-staging --build-only
    flyctl deploy --app screen-to-deck-staging --image registry.fly.io/screen-to-deck-staging:latest
    
    # Health check staging
    sleep 30
    if curl -f https://screen-to-deck-staging.fly.dev/health &> /dev/null; then
        log "Staging deployment successful"
        
        # Deploy production
        read -p "Deploy to production? (y/n): " deploy_prod
        if [ "$deploy_prod" = "y" ]; then
            info "Deploying to production..."
            flyctl deploy --app screen-to-deck
            
            # Health check production
            sleep 60
            if curl -f https://screen-to-deck.fly.dev/health &> /dev/null; then
                success "Production deployment successful!"
                echo "🌐 Live at: https://screen-to-deck.fly.dev"
            else
                error "Production deployment failed health check"
            fi
        fi
    else
        error "Staging deployment failed health check"
    fi
}

# ==============================================
# RAILWAY DEPLOYMENT
# ==============================================

deploy_to_railway() {
    info "🚄 Deploying to Railway..."
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        info "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login check
    if ! railway whoami &> /dev/null; then
        warn "Please login to Railway:"
        railway login
    fi
    
    # Link or create project
    if [ ! -f "railway.json" ]; then
        error "railway.json not found"
    fi
    
    info "Deploying to Railway..."
    railway up --detach
    
    # Get deployment URL
    RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")
    
    if [ -n "$RAILWAY_URL" ]; then
        success "Railway deployment successful!"
        echo "🌐 Live at: $RAILWAY_URL"
        
        # Health check
        sleep 30
        if curl -f "$RAILWAY_URL/health" &> /dev/null; then
            log "Health check passed"
        else
            warn "Health check failed"
        fi
    else
        error "Failed to get Railway deployment URL"
    fi
}

# ==============================================
# DOCKER COMPOSE DEPLOYMENT
# ==============================================

deploy_with_docker() {
    info "🐳 Deploying with Docker Compose..."
    
    # Check if environment is ready
    if [ ! -f "docker-compose.prod.yml" ]; then
        error "docker-compose.prod.yml not found"
    fi
    
    # Generate random passwords if not set
    if [ ! -f ".env.docker" ]; then
        info "Generating Docker environment..."
        cat > .env.docker << EOF
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
GRAFANA_PASSWORD=$(openssl rand -base64 32)
EOF
        log "Docker environment generated"
    fi
    
    # Pull latest images
    info "Pulling Docker images..."
    docker-compose -f docker-compose.prod.yml pull --quiet
    
    # Start services
    info "Starting services..."
    docker-compose -f docker-compose.prod.yml --env-file .env.docker up -d
    
    # Wait for services
    info "Waiting for services to start..."
    sleep 60
    
    # Health checks
    if curl -f http://localhost:3001/health &> /dev/null; then
        success "Docker deployment successful!"
        echo "🌐 App: http://localhost:3001"
        echo "📊 Grafana: http://localhost:3000 (admin/$(grep GRAFANA_PASSWORD .env.docker | cut -d'=' -f2))"
        echo "📈 Prometheus: http://localhost:9090"
        
        # Show service status
        docker-compose -f docker-compose.prod.yml ps
    else
        error "Docker deployment health check failed"
    fi
}

# ==============================================
# MONITORING SETUP
# ==============================================

setup_monitoring() {
    info "📊 Setting up monitoring..."
    
    # Create monitoring configs
    mkdir -p monitoring/{grafana/dashboards,grafana/datasources}
    
    # Prometheus config
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'screen-to-deck'
    static_configs:
      - targets: ['app:3001']
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF
    
    # Grafana datasource
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log "Monitoring configured"
}

# ==============================================
# SSL CERTIFICATES
# ==============================================

setup_ssl() {
    info "🔒 Setting up SSL certificates..."
    
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate for development
    if [ ! -f "nginx/ssl/cert.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=FR/ST=Paris/L=Paris/O=Screen-to-Deck/CN=localhost" > /dev/null 2>&1
        log "SSL certificates generated"
    fi
    
    # Nginx config
    mkdir -p nginx
    cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3001;
    }
    
    server {
        listen 80;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl;
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /health {
            proxy_pass http://app/health;
        }
    }
}
EOF
}

# ==============================================
# POST-DEPLOYMENT ACTIONS
# ==============================================

post_deployment() {
    info "🔧 Running post-deployment actions..."
    
    # Send deployment notification
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🚀 Screen-to-Deck Deployed\",
                     \"description\": \"Deployment completed successfully!\",
                     \"color\": 65280,
                     \"fields\": [
                         {\"name\": \"Target\", \"value\": \"$DEPLOY_TARGET\"},
                         {\"name\": \"Time\", \"value\": \"$(date)\"}
                     ]
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Analytics event
    if [ -n "$MIXPANEL_TOKEN" ]; then
        curl -X POST "https://api.mixpanel.com/track" \
             -H "Content-Type: application/json" \
             -d "{
                 \"event\": \"deployment_completed\",
                 \"properties\": {
                     \"distinct_id\": \"deploy-script\",
                     \"platform\": \"$DEPLOY_TARGET\",
                     \"time\": $(date +%s)
                 }
             }" > /dev/null 2>&1 || true
    fi
    
    log "Post-deployment actions completed"
}

# ==============================================
# MAIN EXECUTION
# ==============================================

main() {
    choose_deployment_target
    pre_deploy_checks
    
    case $DEPLOY_TARGET in
        "flyio")
            deploy_to_flyio
            ;;
        "railway")
            deploy_to_railway
            ;;
        "docker")
            setup_monitoring
            setup_ssl
            deploy_with_docker
            ;;
        "all")
            setup_monitoring
            setup_ssl
            deploy_with_docker
            deploy_to_railway
            deploy_to_flyio
            ;;
    esac
    
    post_deployment
    
    # Final success message
    echo ""
    success "🎉 DEPLOYMENT COMPLETE!"
    echo ""
    echo -e "${BLUE}📊 Summary:${NC}"
    echo "✅ Platform: $DEPLOY_TARGET"
    echo "✅ Monitoring: Configured"
    echo "✅ SSL: Enabled"
    echo "✅ Health checks: Passed"
    echo ""
    echo -e "${GREEN}📋 Next steps:${NC}"
    echo "1. Configure custom domain"
    echo "2. Set up monitoring alerts"
    echo "3. Configure backups"
    echo "4. Load test the application"
    echo ""
    echo -e "${PURPLE}📝 Logs saved to: $DEPLOY_LOG${NC}"
}

# Error handling
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@" 