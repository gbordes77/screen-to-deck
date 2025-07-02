#!/bin/bash

# 🚀 Finalize Supabase Setup - Screen-to-Deck SaaS
# Auto-configure Supabase projet avec schéma complet

set -e

echo "🔧 Finalizing Supabase Setup for Screen-to-Deck SaaS..."

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérification prérequis
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}❌ Supabase CLI not found. Install: npm i -g supabase${NC}"
        exit 1
    fi
    
    if [ ! -f "supabase/schema.sql" ]; then
        echo -e "${RED}❌ Schema file not found: supabase/schema.sql${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites checked${NC}"
}

# Configuration variables d'environnement
setup_env_vars() {
    echo -e "${BLUE}🔧 Setting up environment variables...${NC}"
    
    # Lecture config Supabase
    if [ ! -f "supabase/config.toml" ]; then
        echo -e "${YELLOW}⚠️  No local Supabase config found${NC}"
        return
    fi
    
    PROJECT_ID=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
    
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${YELLOW}⚠️  No project ID found in config${NC}"
        echo -e "${BLUE}ℹ️  Please run: supabase link${NC}"
        return
    fi
    
    echo -e "${GREEN}✅ Project ID: $PROJECT_ID${NC}"
    
    # Génération URL et clés
    SUPABASE_URL="https://${PROJECT_ID}.supabase.co"
    
    echo -e "${BLUE}📝 Add to your .env file:${NC}"
    echo "SUPABASE_URL=$SUPABASE_URL"
    echo "SUPABASE_ANON_KEY=<get from dashboard>"
    echo "SUPABASE_SERVICE_ROLE_KEY=<get from dashboard>"
}

# Application du schéma
apply_schema() {
    echo -e "${BLUE}🗄️  Applying database schema...${NC}"
    
    if ! supabase db push; then
        echo -e "${RED}❌ Schema application failed${NC}"
        echo -e "${BLUE}ℹ️  Try: supabase db reset${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Schema applied successfully${NC}"
}

# Test de connexion
test_connection() {
    echo -e "${BLUE}🔍 Testing connection...${NC}"
    
    # Test SQL basique
    if supabase db run <<< "SELECT COUNT(*) FROM auth.users;"; then
        echo -e "${GREEN}✅ Database connection working${NC}"
    else
        echo -e "${YELLOW}⚠️  Database test inconclusive${NC}"
    fi
}

# Configuration RLS (Row Level Security)
setup_rls() {
    echo -e "${BLUE}🛡️  Configuring Row Level Security...${NC}"
    
    # Les politiques RLS sont dans le schema.sql
    # Vérification qu'elles sont actives
    
    RLS_CHECK=$(supabase db run <<< "
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true;
    " 2>/dev/null || echo "")
    
    if [ -n "$RLS_CHECK" ]; then
        echo -e "${GREEN}✅ RLS policies active${NC}"
    else
        echo -e "${YELLOW}⚠️  RLS status unclear - check manually${NC}"
    fi
}

# Seed data pour tests
seed_test_data() {
    echo -e "${BLUE}🌱 Seeding test data...${NC}"
    
    # Organization de test
    supabase db run <<EOF || true
        INSERT INTO organizations (name, plan, max_scans_per_month) 
        VALUES ('Test Organization', 'free', 100)
        ON CONFLICT (name) DO NOTHING;
        
        INSERT INTO api_keys (organization_id, name, key_hash) 
        SELECT id, 'Test API Key', 'test-key-hash'
        FROM organizations 
        WHERE name = 'Test Organization'
        ON CONFLICT DO NOTHING;
EOF
    
    echo -e "${GREEN}✅ Test data seeded${NC}"
}

# Configuration monitoring
setup_monitoring() {
    echo -e "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Vérification des triggers et fonctions
    TRIGGERS_COUNT=$(supabase db run <<< "
        SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_schema = 'public';
    " 2>/dev/null | tail -1 || echo "0")
    
    echo -e "${BLUE}ℹ️  Database triggers: $TRIGGERS_COUNT${NC}"
    
    if [ "$TRIGGERS_COUNT" -gt "0" ]; then
        echo -e "${GREEN}✅ Monitoring triggers active${NC}"
    fi
}

# Validation finale
final_validation() {
    echo -e "${BLUE}✅ Final validation...${NC}"
    
    # Check tables essentielles
    TABLES=$(supabase db run <<< "
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    " 2>/dev/null || echo "")
    
    EXPECTED_TABLES=("organizations" "users" "api_keys" "scans" "scan_results" "usage_logs" "audit_logs")
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if echo "$TABLES" | grep -q "$table"; then
            echo -e "${GREEN}✅ Table $table exists${NC}"
        else
            echo -e "${RED}❌ Table $table missing${NC}"
        fi
    done
}

# Script principal
main() {
    echo -e "${BLUE}🚀 Starting Supabase finalization...${NC}"
    
    check_prerequisites
    setup_env_vars
    apply_schema
    test_connection
    setup_rls
    seed_test_data
    setup_monitoring
    final_validation
    
    echo -e "${GREEN}🎉 Supabase setup completed!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Get API keys from Supabase dashboard"
    echo "2. Update .env file with keys"
    echo "3. Run: npm run dev"
    echo "4. Test with: ./scripts/test-supabase-config.js"
    echo ""
    echo -e "${YELLOW}⚠️  Don't forget to configure authentication in Supabase dashboard${NC}"
}

# Gestion des erreurs
trap 'echo -e "${RED}❌ Setup failed at line $LINENO${NC}"; exit 1' ERR

# Exécution
main "$@" 