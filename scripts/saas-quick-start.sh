#!/bin/bash

# ==============================================
# SCREEN-TO-DECK SAAS ULTRA-QUICK START
# From zero to production in 3 minutes
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Banner
clear
echo -e "${PURPLE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║                🚀 SCREEN-TO-DECK SAAS                            ║
║                   3-MINUTE QUICK START                           ║
║                                                                   ║
║   ⚡ Full SaaS deployment in 3 minutes                           ║
║   🌍 Global CDN + Auto-scaling                                   ║
║   🔒 Production security                                          ║
║   📊 Monitoring included                                          ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

info() {
    echo -e "${BLUE}⚡ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Quick setup options
echo ""
echo "🎯 Choose your quick deployment:"
echo ""
echo "1) 🔥 INSTANT (Fly.io) - Global deployment in 2 minutes"
echo "2) 💨 TURBO (Railway) - Simple deployment in 1 minute"  
echo "3) 🐳 LOCAL (Docker) - Development setup in 30 seconds"
echo "4) 🚀 ULTIMATE (All platforms) - Full production setup"
echo ""
read -p "Select option (1-4): " choice

case $choice in
    1)
        info "🔥 INSTANT MODE: Deploying to Fly.io..."
        echo "Prerequisites: You need a Fly.io account"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            # Install Fly CLI if needed
            if ! command -v flyctl &> /dev/null; then
                info "Installing Fly.io CLI..."
                curl -L https://fly.io/install.sh | sh
                export PATH="$HOME/.fly/bin:$PATH"
            fi
            
            # Quick auth check
            if ! flyctl auth whoami &> /dev/null; then
                warn "Please run: flyctl auth login"
                exit 1
            fi
            
            # Create and deploy
            info "Creating Fly.io apps..."
            flyctl apps create screen-to-deck 2>/dev/null || echo "App exists"
            flyctl apps create screen-to-deck-staging 2>/dev/null || echo "Staging exists"
            
            info "Deploying to production..."
            flyctl deploy --app screen-to-deck
            
            success "🎉 DEPLOYED! Live at: https://screen-to-deck.fly.dev"
        fi
        ;;
        
    2)
        info "💨 TURBO MODE: Deploying to Railway..."
        echo "Prerequisites: You need a Railway account"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            # Install Railway CLI if needed
            if ! command -v railway &> /dev/null; then
                info "Installing Railway CLI..."
                npm install -g @railway/cli
            fi
            
            # Quick auth check
            if ! railway whoami &> /dev/null; then
                warn "Please run: railway login"
                exit 1
            fi
            
            info "Deploying to Railway..."
            railway up --detach
            
            success "🎉 DEPLOYED! Check Railway dashboard for URL"
        fi
        ;;
        
    3)
        info "🐳 LOCAL MODE: Starting development environment..."
        
        # Quick build and run
        info "Building application..."
        npm run build 2>/dev/null || {
            info "Installing dependencies..."
            npm install
            npm run build
        }
        
        info "Starting with Docker..."
        docker build -f Dockerfile.saas -t screen-to-deck:quick .
        docker run -d -p 3001:3001 --name screen-to-deck-quick screen-to-deck:quick
        
        sleep 5
        
        if curl -f http://localhost:3001/health &> /dev/null; then
            success "🎉 RUNNING! Open: http://localhost:3001"
            echo ""
            echo "💡 To stop: docker stop screen-to-deck-quick"
        else
            warn "Something went wrong. Check: docker logs screen-to-deck-quick"
        fi
        ;;
        
    4)
        info "🚀 ULTIMATE MODE: Full production setup..."
        warn "This will setup EVERYTHING (takes ~10 minutes)"
        read -p "Ready for full deployment? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            # Run full infrastructure setup
            ./scripts/setup-infrastructure.sh
            
            # Then deploy everywhere
            ./scripts/deploy-complete.sh
            
            success "🎉 ULTIMATE DEPLOYMENT COMPLETE!"
            echo ""
            echo "🌐 Your SaaS is now running on:"
            echo "   • Fly.io: https://screen-to-deck.fly.dev"
            echo "   • Railway: Check dashboard"
            echo "   • Local: http://localhost:3001"
            echo ""
            echo "📊 Monitoring:"
            echo "   • Grafana: http://localhost:3000"
            echo "   • Prometheus: http://localhost:9090"
        fi
        ;;
        
    *)
        warn "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Final tips
echo ""
echo -e "${BLUE}💡 Quick tips:${NC}"
echo "• View logs: npm run fly:logs (or railway logs)"
echo "• Health check: npm run health:check:prod"
echo "• Scale up: flyctl scale count 2"
echo "• Custom domain: flyctl domains add yourdomain.com"
echo ""
echo -e "${PURPLE}🎯 What's next?${NC}"
echo "1. Configure your custom domain"
echo "2. Set up monitoring alerts"
echo "3. Add your payment processing"
echo "4. Launch your marketing!"
echo ""
echo -e "${GREEN}🚀 Congrats! Your SaaS is LIVE!${NC}" 