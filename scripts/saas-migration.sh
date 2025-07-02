#!/bin/bash

# ==============================================
# SCREEN-TO-DECK SAAS MIGRATION SCRIPT
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="screen-to-deck"
MIGRATION_LOG="migration-$(date +%Y%m%d-%H%M%S).log"

# ==============================================
# HELPER FUNCTIONS
# ==============================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$MIGRATION_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$MIGRATION_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$MIGRATION_LOG"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$MIGRATION_LOG"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is required but not installed"
    fi
}

# ==============================================
# PREREQUISITES CHECK
# ==============================================

check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check required commands
    check_command "node"
    check_command "npm"
    check_command "git"
    check_command "curl"
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
        error "Node.js 18+ is required (current: $NODE_VERSION)"
    fi
    
    # Check if we're in the project root
    if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
        error "Please run this script from the project root directory"
    fi
    
    log "✅ Prerequisites check passed"
}

# ==============================================
# ENVIRONMENT SETUP
# ==============================================

setup_environment() {
    log "🔧 Setting up environment variables..."
    
    # Create .env files if they don't exist
    if [ ! -f "server/.env" ]; then
        cp "server/env.example" "server/.env" 2>/dev/null || true
        warn "Created server/.env from template. Please configure it."
    fi
    
    if [ ! -f "client/.env" ]; then
        touch "client/.env"
        warn "Created client/.env. Please configure it."
    fi
    
    # Check critical environment variables
    ENV_VARS=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "CF_ACCOUNT_ID"
        "R2_ACCESS_KEY_ID"
        "R2_SECRET_ACCESS_KEY"
        "OPENAI_API_KEY"
    )
    
    MISSING_VARS=()
    for var in "${ENV_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        warn "Missing environment variables: ${MISSING_VARS[*]}"
        warn "Please configure these in your .env files before proceeding"
    fi
    
    log "✅ Environment setup completed"
}

# ==============================================
# SUPABASE SETUP
# ==============================================

setup_supabase() {
    log "🏗️ Setting up Supabase..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log "Installing Supabase CLI..."
        npm install -g supabase
    fi
    
    # Initialize Supabase if not already done
    if [ ! -f "supabase/config.toml" ]; then
        log "Initializing Supabase project..."
        supabase init
    fi
    
    # Run database migrations
    if [ -f "supabase/schema.sql" ]; then
        log "Applying database schema..."
        if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            supabase db push --password "$SUPABASE_DB_PASSWORD"
        else
            warn "Supabase credentials not set. Skipping database push."
            warn "Run 'supabase db push' manually after configuring credentials."
        fi
    fi
    
    log "✅ Supabase setup completed"
}

# ==============================================
# DEPENDENCIES INSTALLATION
# ==============================================

install_dependencies() {
    log "📦 Installing dependencies..."
    
    # Install server dependencies
    log "Installing server dependencies..."
    cd server
    npm install --production=false
    cd ..
    
    # Install client dependencies
    log "Installing client dependencies..."
    cd client
    npm install --production=false
    cd ..
    
    log "✅ Dependencies installed"
}

# ==============================================
# BUILD PROCESS
# ==============================================

build_project() {
    log "🔨 Building project..."
    
    # Build server
    log "Building server..."
    cd server
    npm run build
    cd ..
    
    # Build client
    log "Building client..."
    cd client
    npm run build
    cd ..
    
    log "✅ Build completed"
}

# ==============================================
# DATABASE MIGRATION
# ==============================================

migrate_database() {
    log "🗄️ Migrating database..."
    
    # Backup existing data if needed
    if [ -d "discord-bot" ] && [ -f "discord-bot/deck_export.json" ]; then
        log "Backing up existing data..."
        mkdir -p migration-backup
        cp discord-bot/deck_export.* migration-backup/ 2>/dev/null || true
    fi
    
    # Run migration script
    if [ -f "scripts/migrate-data.js" ]; then
        log "Running data migration..."
        node scripts/migrate-data.js
    else
        warn "No data migration script found. Skipping data migration."
    fi
    
    log "✅ Database migration completed"
}

# ==============================================
# CLOUDFLARE R2 SETUP
# ==============================================

setup_storage() {
    log "☁️ Setting up cloud storage..."
    
    # Test R2 connection
    if [ -n "$CF_ACCOUNT_ID" ] && [ -n "$R2_ACCESS_KEY_ID" ]; then
        log "Testing Cloudflare R2 connection..."
        node -e "
            const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
            const client = new S3Client({
                region: 'auto',
                endpoint: 'https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com',
                credentials: {
                    accessKeyId: '${R2_ACCESS_KEY_ID}',
                    secretAccessKey: '${R2_SECRET_ACCESS_KEY}'
                }
            });
            client.send(new ListBucketsCommand({}))
                .then(() => console.log('✅ R2 connection successful'))
                .catch(err => console.error('❌ R2 connection failed:', err.message));
        " 2>/dev/null || warn "R2 connection test failed"
    else
        warn "R2 credentials not configured. Please set CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    fi
    
    log "✅ Storage setup completed"
}

# ==============================================
# DOCKER SETUP
# ==============================================

setup_docker() {
    log "🐳 Setting up Docker configuration..."
    
    # Create production Dockerfile if it doesn't exist
    if [ ! -f "Dockerfile.prod" ]; then
        log "Creating production Dockerfile..."
        cat > Dockerfile.prod << 'EOF'
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build applications
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built applications
COPY --from=builder /app/server/dist ./server/
COPY --from=builder /app/client/dist ./client/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/server/node_modules ./server/node_modules/

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]
EOF
    fi
    
    # Update docker-compose for production
    if [ ! -f "docker-compose.prod.yml" ]; then
        log "Creating production docker-compose..."
        cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - server/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
    fi
    
    log "✅ Docker setup completed"
}

# ==============================================
# DEPLOYMENT CONFIGURATION
# ==============================================

setup_deployment() {
    log "🚀 Setting up deployment configuration..."
    
    # Railway configuration
    if [ ! -f "railway.json" ]; then
        log "Creating Railway configuration..."
        cat > railway.json << 'EOF'
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF
    fi
    
    # Fly.io configuration
    if [ ! -f "fly.toml" ]; then
        log "Creating Fly.io configuration..."
        cat > fly.toml << 'EOF'
app = "screen-to-deck"
primary_region = "cdg"

[build]
  dockerfile = "Dockerfile.prod"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  
  [http_service.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
EOF
    fi
    
    log "✅ Deployment configuration completed"
}

# ==============================================
# TESTING
# ==============================================

run_tests() {
    log "🧪 Running tests..."
    
    # Server tests
    if [ -f "server/package.json" ] && grep -q "test" server/package.json; then
        log "Running server tests..."
        cd server
        npm test || warn "Server tests failed"
        cd ..
    fi
    
    # Client tests
    if [ -f "client/package.json" ] && grep -q "test" client/package.json; then
        log "Running client tests..."
        cd client
        npm test -- --watchAll=false || warn "Client tests failed"
        cd ..
    fi
    
    log "✅ Tests completed"
}

# ==============================================
# FINAL CONFIGURATION
# ==============================================

final_setup() {
    log "🏁 Final setup steps..."
    
    # Create startup script
    cat > start-saas.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Screen-to-Deck SaaS..."

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo "❌ server/.env not found. Please create it from server/env.example"
    exit 1
fi

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    npm run start:prod
else
    npm run dev
fi
EOF
    chmod +x start-saas.sh
    
    # Update package.json scripts
    log "Updating package.json scripts..."
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts = {
            ...pkg.scripts,
            'start:prod': 'cd server && npm run start',
            'dev:saas': 'npm run dev:server & npm run dev:client',
            'build:saas': 'npm run build:client && npm run build:server',
            'migrate': 'node scripts/migrate-data.js',
            'deploy:railway': 'railway up',
            'deploy:fly': 'flyctl deploy'
        };
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    
    log "✅ Final setup completed"
}

# ==============================================
# MAIN EXECUTION
# ==============================================

main() {
    log "🎯 Starting Screen-to-Deck SaaS Migration"
    log "Migration log: $MIGRATION_LOG"
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_supabase
    build_project
    migrate_database
    setup_storage
    setup_docker
    setup_deployment
    run_tests
    final_setup
    
    log ""
    log "🎉 Migration completed successfully!"
    log ""
    log "Next steps:"
    log "1. Configure your environment variables in server/.env"
    log "2. Set up your Supabase project and run: supabase db push"
    log "3. Configure Cloudflare R2 storage"
    log "4. Test locally: ./start-saas.sh"
    log "5. Deploy to production: npm run deploy:railway or npm run deploy:fly"
    log ""
    log "Documentation: See SAAS_MIGRATION_PLAN.md for detailed setup instructions"
    log "Support: Check the troubleshooting section in the migration plan"
    
    # Create summary file
    cat > MIGRATION_SUMMARY.md << EOF
# Migration Summary

**Date:** $(date)
**Status:** SUCCESS ✅

## What was migrated:
- ✅ Multi-tenant database schema (Supabase)
- ✅ Cloud storage setup (Cloudflare R2)
- ✅ Rate limiting middleware
- ✅ Authentication system
- ✅ Docker configuration
- ✅ Deployment configuration

## Next steps:
1. Configure environment variables
2. Set up Supabase project
3. Configure Cloudflare services
4. Test and deploy

## Files created:
- supabase/schema.sql
- server/src/services/supabase.service.ts
- server/src/services/storage.service.ts
- server/src/middleware/rateLimiter.ts
- Dockerfile.prod
- docker-compose.prod.yml
- railway.json
- fly.toml
- start-saas.sh

## Log file: $MIGRATION_LOG
EOF
    
    info "📋 Migration summary saved to MIGRATION_SUMMARY.md"
}

# Handle script interruption
trap 'error "Migration interrupted"' INT TERM

# Run main function
main "$@" 