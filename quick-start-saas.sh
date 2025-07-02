#!/bin/bash

# ==============================================
# SCREEN-TO-DECK SAAS QUICK START
# ==============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                🚀 SCREEN-TO-DECK SAAS MIGRATION               ║
║                      Quick Start Script                       ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# ==============================================
# QUICK CHECKS
# ==============================================

info "Checking prerequisites..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    error "Please run this script from the Screen-to-Deck project root"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is required but not installed"
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
    error "Node.js 18+ is required (current: $NODE_VERSION)"
fi

log "Prerequisites check passed"

# ==============================================
# MIGRATION TYPE SELECTION
# ==============================================

echo ""
echo -e "${BLUE}Select migration type:${NC}"
echo "1) 🔧 Full Migration (Complete SaaS transformation)"
echo "2) ⚡ Quick Setup (Essential files only)"
echo "3) 🧪 Development Mode (Local testing)"
echo "4) 📖 Show Documentation"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        MIGRATION_TYPE="full"
        ;;
    2)
        MIGRATION_TYPE="quick"
        ;;
    3)
        MIGRATION_TYPE="dev"
        ;;
    4)
        echo ""
        info "Opening SaaS Migration Plan..."
        if command -v open &> /dev/null; then
            open SAAS_MIGRATION_PLAN.md
        elif command -v xdg-open &> /dev/null; then
            xdg-open SAAS_MIGRATION_PLAN.md
        else
            info "Please open SAAS_MIGRATION_PLAN.md to read the documentation"
        fi
        exit 0
        ;;
    *)
        error "Invalid choice"
        ;;
esac

# ==============================================
# ENVIRONMENT SETUP
# ==============================================

info "Setting up environment..."

# Create server .env if it doesn't exist
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.saas.example" ]; then
        cp "server/.env.saas.example" "server/.env"
        log "Created server/.env from SaaS template"
    elif [ -f "server/env.example" ]; then
        cp "server/env.example" "server/.env"
        log "Created server/.env from existing template"
    else
        touch "server/.env"
        log "Created empty server/.env"
    fi
    warn "Please configure server/.env with your API keys and settings"
fi

# Create client .env if it doesn't exist
if [ ! -f "client/.env" ]; then
    cat > "client/.env" << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_ENVIRONMENT=development
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF
    log "Created client/.env"
    warn "Please configure client/.env with your Supabase settings"
fi

# ==============================================
# DEPENDENCY INSTALLATION
# ==============================================

info "Installing dependencies..."

# Install required SaaS packages
SAAS_PACKAGES=(
    "@supabase/supabase-js"
    "@aws-sdk/client-s3"
    "@aws-sdk/s3-request-presigner"
    "ioredis"
    "bcryptjs"
    "sharp"
)

info "Installing SaaS packages..."
cd server
for package in "${SAAS_PACKAGES[@]}"; do
    if ! npm list "$package" &> /dev/null; then
        npm install "$package"
        log "Installed $package"
    fi
done
cd ..

# Install client dependencies if needed
if [ ! -d "client/node_modules" ]; then
    info "Installing client dependencies..."
    cd client && npm install && cd ..
    log "Client dependencies installed"
fi

# Install server dependencies if needed
if [ ! -d "server/node_modules" ]; then
    info "Installing server dependencies..."
    cd server && npm install && cd ..
    log "Server dependencies installed"
fi

# ==============================================
# MIGRATION EXECUTION
# ==============================================

case $MIGRATION_TYPE in
    "full")
        info "Running full migration..."
        if [ -f "scripts/saas-migration.sh" ]; then
            bash scripts/saas-migration.sh
        else
            warn "Full migration script not found, continuing with quick setup"
        fi
        ;;
    
    "quick")
        info "Setting up essential SaaS files..."
        
        # Update package.json scripts
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts = {
            ...pkg.scripts,
            'dev:saas': 'npm run dev:server & npm run dev:client',
            'build:saas': 'npm run build:client && npm run build:server',
            'start:saas': 'cd server && npm run start'
        };
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        "
        log "Updated package.json with SaaS scripts"
        ;;
    
    "dev")
        info "Setting up development environment..."
        # Just ensure basic setup for development
        ;;
esac

# ==============================================
# FINAL SETUP
# ==============================================

# Create quick start script
cat > "start-saas-dev.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting Screen-to-Deck SaaS (Development)"

# Check environment
if [ ! -f "server/.env" ]; then
    echo "❌ server/.env not found. Run ./quick-start-saas.sh first"
    exit 1
fi

# Start development servers
echo "Starting servers..."
npm run dev:saas
EOF

chmod +x "start-saas-dev.sh"
log "Created start-saas-dev.sh"

# ==============================================
# SUCCESS MESSAGE
# ==============================================

echo ""
echo -e "${GREEN}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                    🎉 MIGRATION COMPLETE!                     ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. 🔧 Configure your environment:"
echo "   - Edit server/.env with your API keys"
echo "   - Edit client/.env with your Supabase settings"
echo ""
echo "2. 🏗️  Set up your services:"
echo "   - Create a Supabase project: https://supabase.com"
echo "   - Set up Cloudflare R2: https://dash.cloudflare.com"
echo "   - Get OpenAI API key: https://platform.openai.com"
echo ""
echo "3. 🚀 Start development:"
echo "   ./start-saas-dev.sh"
echo ""
echo "4. 📖 Read the documentation:"
echo "   - SAAS_MIGRATION_PLAN.md (Complete migration guide)"
echo "   - AUTOMATION_GUIDE.md (Existing automation docs)"
echo ""

if [ "$MIGRATION_TYPE" = "quick" ] || [ "$MIGRATION_TYPE" = "dev" ]; then
    echo -e "${YELLOW}💡 For full SaaS features, run: ./quick-start-saas.sh and choose option 1${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Your Screen-to-Deck SaaS migration is ready!${NC}"
echo ""

# Open relevant files for editing
if command -v code &> /dev/null; then
    info "Opening VS Code with SaaS files..."
    code server/.env client/.env SAAS_MIGRATION_PLAN.md &
fi 