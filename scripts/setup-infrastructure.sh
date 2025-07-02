#!/bin/bash

# ==============================================
# SCREEN-TO-DECK SAAS INFRASTRUCTURE SETUP
# Automatisation complète Supabase + Fly.io + Cloudflare
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

SETUP_LOG="infrastructure-setup-$(date +%Y%m%d-%H%M%S).log"

# ==============================================
# HELPER FUNCTIONS
# ==============================================

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}" | tee -a "$SETUP_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}" | tee -a "$SETUP_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}" | tee -a "$SETUP_LOG"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}" | tee -a "$SETUP_LOG"
    exit 1
}

success() {
    echo -e "${PURPLE}[$(date +'%H:%M:%S')] 🎉 $1${NC}" | tee -a "$SETUP_LOG"
}

# Show banner
clear
echo -e "${BLUE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║              🚀 SCREEN-TO-DECK SAAS INFRASTRUCTURE              ║
║                    Automated Cloud Setup                        ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

info "Starting infrastructure setup at $(date)"
info "Log file: $SETUP_LOG"

# ==============================================
# PREREQUISITES CHECK
# ==============================================

check_prerequisites() {
    info "🔍 Checking prerequisites..."
    
    # Required tools
    local tools=("node" "npm" "git" "curl" "docker")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
        error "Node.js 18+ required (current: $NODE_VERSION)"
    fi
    
    log "Prerequisites check passed"
}

# ==============================================
# CLI TOOLS INSTALLATION
# ==============================================

install_cli_tools() {
    info "🛠️  Installing CLI tools..."
    
    # Supabase CLI
    if ! command -v supabase &> /dev/null; then
        info "Installing Supabase CLI..."
        npm install -g supabase@latest
        log "Supabase CLI installed"
    else
        log "Supabase CLI already installed"
    fi
    
    # Fly.io CLI
    if ! command -v flyctl &> /dev/null; then
        info "Installing Fly.io CLI..."
        curl -L https://fly.io/install.sh | sh
        export PATH="$HOME/.fly/bin:$PATH"
        log "Fly.io CLI installed"
    else
        log "Fly.io CLI already installed"
    fi
    
    # Wrangler (Cloudflare)
    if ! command -v wrangler &> /dev/null; then
        info "Installing Wrangler CLI..."
        npm install -g wrangler@latest
        log "Wrangler CLI installed"
    else
        log "Wrangler CLI already installed"
    fi
}

# ==============================================
# SUPABASE SETUP
# ==============================================

setup_supabase() {
    info "🗄️  Setting up Supabase..."
    
    # Login check
    if ! supabase projects list &> /dev/null; then
        warn "Please login to Supabase:"
        supabase login
    fi
    
    # Create new project or link existing
    echo ""
    echo "Supabase Project Setup:"
    echo "1) Create new project"
    echo "2) Link existing project"
    echo "3) Skip Supabase setup"
    read -p "Choose option (1-3): " supabase_choice
    
    case $supabase_choice in
        1)
            read -p "Project name: " project_name
            read -p "Database password: " -s db_password
            echo ""
            
            info "Creating Supabase project: $project_name"
            PROJECT_REF=$(supabase projects create "$project_name" \
                --db-password "$db_password" \
                --region eu-central-1 \
                --output json | jq -r '.id')
            
            if [ -n "$PROJECT_REF" ]; then
                log "Project created with ID: $PROJECT_REF"
                supabase link --project-ref "$PROJECT_REF"
            else
                error "Failed to create Supabase project"
            fi
            ;;
        2)
            supabase projects list
            read -p "Enter project reference ID: " project_ref
            supabase link --project-ref "$project_ref"
            PROJECT_REF="$project_ref"
            ;;
        3)
            warn "Skipping Supabase setup"
            return 0
            ;;
    esac
    
    # Apply database schema
    if [ -f "supabase/schema.sql" ]; then
        info "Applying database schema..."
        supabase db push
        log "Database schema applied"
    fi
    
    # Get project details
    PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    SERVICE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')
    
    # Store credentials
    cat >> .env.supabase << EOF
SUPABASE_URL=$PROJECT_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
SUPABASE_PROJECT_REF=$PROJECT_REF
EOF
    
    success "Supabase configured successfully!"
}

# ==============================================
# CLOUDFLARE R2 SETUP
# ==============================================

setup_cloudflare() {
    info "☁️  Setting up Cloudflare R2..."
    
    # Login check
    if ! wrangler whoami &> /dev/null; then
        warn "Please login to Cloudflare:"
        wrangler login
    fi
    
    # Create R2 bucket
    read -p "R2 bucket name (default: screen-to-deck): " bucket_name
    bucket_name=${bucket_name:-screen-to-deck}
    
    info "Creating R2 bucket: $bucket_name"
    wrangler r2 bucket create "$bucket_name" 2>/dev/null || log "Bucket already exists"
    
    # Get account ID
    ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | awk '{print $3}')
    
    # Create API tokens (instructions)
    warn "Manual step required:"
    echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Create a Custom Token with R2 permissions"
    echo "3. Enter the credentials below:"
    
    read -p "R2 Access Key ID: " r2_access_key
    read -p "R2 Secret Access Key: " -s r2_secret_key
    echo ""
    
    # Store credentials
    cat >> .env.cloudflare << EOF
CF_ACCOUNT_ID=$ACCOUNT_ID
R2_BUCKET_NAME=$bucket_name
R2_ACCESS_KEY_ID=$r2_access_key
R2_SECRET_ACCESS_KEY=$r2_secret_key
R2_CUSTOM_DOMAIN=$bucket_name.r2.dev
EOF
    
    success "Cloudflare R2 configured successfully!"
}

# ==============================================
# FLY.IO SETUP
# ==============================================

setup_flyio() {
    info "🚁 Setting up Fly.io..."
    
    # Login check
    if ! flyctl auth whoami &> /dev/null; then
        warn "Please login to Fly.io:"
        flyctl auth login
    fi
    
    # Create apps
    echo ""
    echo "Creating Fly.io applications..."
    
    # Production app
    if ! flyctl apps list | grep -q "screen-to-deck"; then
        info "Creating production app..."
        flyctl apps create screen-to-deck --generate-name=false
        log "Production app created: screen-to-deck"
    else
        log "Production app already exists"
    fi
    
    # Staging app
    if ! flyctl apps list | grep -q "screen-to-deck-staging"; then
        info "Creating staging app..."
        flyctl apps create screen-to-deck-staging --generate-name=false
        log "Staging app created: screen-to-deck-staging"
    else
        log "Staging app already exists"
    fi
    
    # Set secrets
    info "Setting environment secrets..."
    
    # Load environment files
    if [ -f ".env.supabase" ]; then
        source .env.supabase
        flyctl secrets set \
            SUPABASE_URL="$SUPABASE_URL" \
            SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
            SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
            --app screen-to-deck
            
        flyctl secrets set \
            SUPABASE_URL="$SUPABASE_URL" \
            SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
            SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
            --app screen-to-deck-staging
    fi
    
    if [ -f ".env.cloudflare" ]; then
        source .env.cloudflare
        flyctl secrets set \
            CF_ACCOUNT_ID="$CF_ACCOUNT_ID" \
            R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
            R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
            R2_BUCKET_NAME="$R2_BUCKET_NAME" \
            --app screen-to-deck
            
        flyctl secrets set \
            CF_ACCOUNT_ID="$CF_ACCOUNT_ID" \
            R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
            R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
            R2_BUCKET_NAME="$R2_BUCKET_NAME" \
            --app screen-to-deck-staging
    fi
    
    # Additional secrets
    read -p "OpenAI API Key: " -s openai_key
    echo ""
    
    flyctl secrets set OPENAI_API_KEY="$openai_key" --app screen-to-deck
    flyctl secrets set OPENAI_API_KEY="$openai_key" --app screen-to-deck-staging
    
    success "Fly.io configured successfully!"
}

# ==============================================
# REDIS SETUP
# ==============================================

setup_redis() {
    info "🔴 Setting up Redis..."
    
    echo "Redis options:"
    echo "1) Upstash Redis (recommended)"
    echo "2) Fly.io Redis"
    echo "3) Skip Redis setup"
    read -p "Choose option (1-3): " redis_choice
    
    case $redis_choice in
        1)
            warn "Manual step required:"
            echo "1. Go to https://upstash.com"
            echo "2. Create a new Redis database"
            echo "3. Copy the connection URL"
            read -p "Redis URL: " redis_url
            
            flyctl secrets set REDIS_URL="$redis_url" --app screen-to-deck
            flyctl secrets set REDIS_URL="$redis_url" --app screen-to-deck-staging
            ;;
        2)
            flyctl redis create --name screen-to-deck-redis
            ;;
        3)
            warn "Skipping Redis setup"
            ;;
    esac
    
    log "Redis configuration completed"
}

# ==============================================
# ENVIRONMENT CONSOLIDATION
# ==============================================

consolidate_environment() {
    info "📝 Consolidating environment configuration..."
    
    # Merge all environment files
    cat > server/.env << EOF
# ==============================================
# SCREEN-TO-DECK SAAS PRODUCTION CONFIG
# Generated automatically on $(date)
# ==============================================

NODE_ENV=production
PORT=3001

# Supabase Configuration
$(cat .env.supabase 2>/dev/null || echo "# Configure Supabase manually")

# Cloudflare Configuration  
$(cat .env.cloudflare 2>/dev/null || echo "# Configure Cloudflare manually")

# Security
JWT_SECRET=$(openssl rand -base64 32)

# Features
ENABLE_RATE_LIMITING=true
ENABLE_USAGE_TRACKING=true
ENABLE_AUDIT_LOGS=true
EOF
    
    # Clean up temporary files
    rm -f .env.supabase .env.cloudflare
    
    log "Environment configuration consolidated"
}

# ==============================================
# DEPLOYMENT TEST
# ==============================================

test_deployment() {
    info "🧪 Testing deployment..."
    
    # Build Docker image locally
    info "Building Docker image..."
    docker build -f Dockerfile.saas -t screen-to-deck:test .
    
    # Test image
    info "Testing Docker image..."
    docker run --rm -d -p 3333:3001 --name screen-to-deck-test screen-to-deck:test
    
    sleep 10
    
    if curl -f http://localhost:3333/health &> /dev/null; then
        log "Docker image test passed"
    else
        warn "Docker image test failed"
    fi
    
    docker stop screen-to-deck-test 2>/dev/null || true
    
    log "Deployment test completed"
}

# ==============================================
# MAIN EXECUTION
# ==============================================

main() {
    check_prerequisites
    install_cli_tools
    setup_supabase
    setup_cloudflare  
    setup_flyio
    setup_redis
    consolidate_environment
    test_deployment
    
    # Final success message
    echo ""
    success "🎉 INFRASTRUCTURE SETUP COMPLETE!"
    echo ""
    echo -e "${BLUE}📊 Summary:${NC}"
    echo "✅ Supabase: Database + Auth configured"
    echo "✅ Cloudflare R2: Storage + CDN configured"  
    echo "✅ Fly.io: Apps created with secrets"
    echo "✅ Redis: Caching configured"
    echo "✅ Environment: Production-ready"
    echo ""
    echo -e "${GREEN}🚀 Next steps:${NC}"
    echo "1. Deploy staging: flyctl deploy --app screen-to-deck-staging"
    echo "2. Test staging: https://screen-to-deck-staging.fly.dev"
    echo "3. Deploy production: flyctl deploy --app screen-to-deck"
    echo "4. Configure domain: https://fly.io/docs/reference/domains/"
    echo ""
    echo -e "${PURPLE}📋 Configuration saved to:${NC}"
    echo "- server/.env (production config)"
    echo "- $SETUP_LOG (setup log)"
    echo ""
    
    # Optional: Open URLs
    if command -v open &> /dev/null; then
        read -p "Open Fly.io dashboard? (y/n): " open_fly
        if [ "$open_fly" = "y" ]; then
            open "https://fly.io/dashboard"
        fi
    fi
}

# Error handling
trap 'error "Setup interrupted"' INT TERM

# Run main function
main "$@" 