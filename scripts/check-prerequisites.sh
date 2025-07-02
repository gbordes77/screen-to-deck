#!/bin/bash

# ==============================================
# SCREEN-TO-DECK PREREQUISITES CHECKER
# Vérification avant setup infrastructure
# ==============================================

# Remove set -e to handle errors gracefully
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_TOTAL=0

# ==============================================
# HELPER FUNCTIONS
# ==============================================

check_passed() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
    ((CHECKS_TOTAL++))
}

check_failed() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_TOTAL++))
}

check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((CHECKS_TOTAL++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

header() {
    echo -e "${PURPLE}$1${NC}"
}

# Banner
clear
echo -e "${PURPLE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║                🔍 PREREQUISITES CHECKER                          ║
║              Vérification avant déploiement                      ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ==============================================
# SYSTEM REQUIREMENTS
# ==============================================

header "🖥️  SYSTEM REQUIREMENTS"
echo ""

# Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 || echo "unknown")
    if [ "$NODE_VERSION" != "unknown" ]; then
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ] 2>/dev/null; then
            check_passed "Node.js $NODE_VERSION (✓ ≥18 required)"
        else
            check_failed "Node.js $NODE_VERSION (✗ ≥18 required)"
            echo "   Install: https://nodejs.org"
        fi
    else
        check_failed "Node.js version check failed"
    fi
else
    check_failed "Node.js not installed"
    echo "   Install: https://nodejs.org"
fi

# npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version 2>/dev/null || echo "unknown")
    check_passed "npm $NPM_VERSION"
else
    check_failed "npm not installed"
fi

# Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version 2>/dev/null | cut -d' ' -f3 || echo "unknown")
    check_passed "Git $GIT_VERSION"
else
    check_failed "Git not installed"
    echo "   Install: https://git-scm.com"
fi

# Docker
if command -v docker >/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version 2>/dev/null | cut -d' ' -f3 | sed 's/,//' || echo "unknown")
    check_passed "Docker $DOCKER_VERSION"
    
    # Test Docker daemon
    if docker ps >/dev/null 2>&1; then
        check_passed "Docker daemon running"
    else
        check_warning "Docker daemon not running"
        echo "   Start: Docker Desktop or 'sudo systemctl start docker'"
    fi
else
    check_failed "Docker not installed"
    echo "   Install: https://docs.docker.com/get-docker/"
fi

# curl
if command -v curl >/dev/null 2>&1; then
    check_passed "curl available"
else
    check_failed "curl not installed"
fi

echo ""

# ==============================================
# CLI TOOLS
# ==============================================

header "🛠️  CLI TOOLS"
echo ""

# Supabase CLI
if command -v supabase >/dev/null 2>&1; then
    SUPABASE_VERSION=$(supabase --version 2>/dev/null | head -n1 | awk '{print $2}' || echo "unknown")
    check_passed "Supabase CLI $SUPABASE_VERSION"
else
    check_warning "Supabase CLI not installed (will be installed automatically)"
    echo "   Or install manually: npm install -g supabase"
fi

# Fly.io CLI
if command -v flyctl >/dev/null 2>&1; then
    FLY_VERSION=$(flyctl version 2>/dev/null | head -n1 | awk '{print $3}' || echo "unknown")
    check_passed "Fly.io CLI $FLY_VERSION"
    
    # Check if logged in
    if flyctl auth whoami >/dev/null 2>&1; then
        FLY_USER=$(flyctl auth whoami 2>/dev/null | head -n1 || echo "unknown")
        check_passed "Fly.io logged in as: $FLY_USER"
    else
        check_failed "Fly.io not logged in"
        echo "   Run: flyctl auth login"
    fi
else
    check_warning "Fly.io CLI not installed (will be installed automatically)"
    echo "   Or install manually: curl -L https://fly.io/install.sh | sh"
fi

# Wrangler (Cloudflare)
if command -v wrangler >/dev/null 2>&1; then
    WRANGLER_VERSION=$(wrangler --version 2>/dev/null | head -n1 | awk '{print $2}' || echo "unknown")
    check_passed "Wrangler CLI $WRANGLER_VERSION"
    
    # Check if logged in
    if wrangler whoami >/dev/null 2>&1; then
        CF_USER=$(wrangler whoami 2>/dev/null | grep "You are logged in" | cut -d' ' -f6 2>/dev/null || echo "unknown")
        check_passed "Cloudflare logged in as: $CF_USER"
    else
        check_failed "Cloudflare not logged in"
        echo "   Run: wrangler login"
    fi
else
    check_warning "Wrangler CLI not installed (will be installed automatically)"
    echo "   Or install manually: npm install -g wrangler"
fi

echo ""

# ==============================================
# PROJECT STATUS
# ==============================================

header "📁 PROJECT STATUS"
echo ""

# Package.json dependencies
if [ -f "package.json" ]; then
    check_passed "package.json found"
    
    if [ -d "node_modules" ]; then
        check_passed "Dependencies installed"
    else
        check_warning "Dependencies not installed"
        echo "   Run: npm install"
    fi
else
    check_failed "package.json not found (run from project root)"
fi

# Client built
if [ -f "client/dist/index.html" ]; then
    check_passed "Client built"
else
    check_warning "Client not built"
    echo "   Run: npm run build:client"
fi

# Server built
if [ -f "server/dist/index.js" ]; then
    check_passed "Server built"
else
    check_warning "Server not built"
    echo "   Run: npm run build:server"
fi

# Docker files
if [ -f "Dockerfile.saas" ]; then
    check_passed "Dockerfile.saas exists"
else
    check_failed "Dockerfile.saas missing"
fi

if [ -f "fly.toml" ]; then
    check_passed "fly.toml exists"
else
    check_failed "fly.toml missing"
fi

echo ""

# ==============================================
# ENVIRONMENT CHECK
# ==============================================

header "🔐 ENVIRONMENT"
echo ""

# Check for existing env file
if [ -f "server/.env" ]; then
    check_passed "Environment file exists"
    
    # Check key variables
    if grep -q "SUPABASE_URL" server/.env 2>/dev/null; then
        check_passed "Supabase URL configured"
    else
        check_warning "Supabase URL not configured"
    fi
    
    if grep -q "OPENAI_API_KEY" server/.env 2>/dev/null; then
        check_passed "OpenAI API Key configured"
    else
        check_warning "OpenAI API Key not configured"
    fi
else
    check_warning "Environment file not found"
    echo "   Will be created during setup"
fi

# Check if .env.example exists
if [ -f "server/.env.example" ]; then
    check_passed "Environment template exists"
else
    check_failed "Environment template missing"
fi

echo ""

# ==============================================
# ACCOUNTS STATUS
# ==============================================

header "🌐 ACCOUNTS STATUS"
echo ""

info "Accounts verification (manual check required):"
echo ""

# Supabase
echo "📊 Supabase:"
echo "   • Account: Check https://supabase.com/dashboard"
echo "   • Project: Create 'screen-to-deck-saas'"
echo "   • Keys: Settings > API > Copy keys"
echo ""

# Fly.io
echo "🚁 Fly.io:"
if command -v flyctl >/dev/null 2>&1 && flyctl auth whoami >/dev/null 2>&1; then
    check_passed "Fly.io account ready"
else
    echo "   • Account: Check https://fly.io/dashboard"
    echo "   • Login: Run 'flyctl auth login'"
fi
echo ""

# Cloudflare
echo "☁️  Cloudflare:"
echo "   • Account: Check https://dash.cloudflare.com"
echo "   • R2 Setup: Follow docs/CLOUDFLARE_SETUP_GUIDE.md"
echo "   • Bucket: Create 'screen-to-deck-storage'"
echo ""

# ==============================================
# FINAL REPORT
# ==============================================

header "📊 FINAL REPORT"
echo ""

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo ""
    echo -e "${BLUE}✅ Ready to proceed:${NC}"
    echo "   ./scripts/setup-infrastructure.sh"
elif [ $CHECKS_PASSED -ge $((CHECKS_TOTAL * 80 / 100)) ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY ($CHECKS_PASSED/$CHECKS_TOTAL checks passed)${NC}"
    echo ""
    echo -e "${BLUE}🚀 Can proceed with minor issues:${NC}"
    echo "   ./scripts/setup-infrastructure.sh"
    echo ""
    echo -e "${YELLOW}💡 Fix warnings for optimal experience${NC}"
else
    echo -e "${RED}❌ ISSUES DETECTED ($CHECKS_PASSED/$CHECKS_TOTAL checks passed)${NC}"
    echo ""
    echo -e "${YELLOW}📋 Fix required issues first:${NC}"
    echo "   1. Install missing tools"
    echo "   2. Create required accounts"
    echo "   3. Run this check again"
    echo ""
    echo -e "${BLUE}📖 Guides available:${NC}"
    echo "   • docs/SETUP_ACCOUNTS_GUIDE.md"
    echo "   • docs/CLOUDFLARE_SETUP_GUIDE.md"
fi

echo ""
echo -e "${PURPLE}🔗 Helpful links:${NC}"
echo "   • Supabase: https://supabase.com"
echo "   • Fly.io: https://fly.io"  
echo "   • Cloudflare: https://dash.cloudflare.com"
echo "   • Complete setup guide: docs/SETUP_ACCOUNTS_GUIDE.md" 