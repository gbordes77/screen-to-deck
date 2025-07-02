-- ==============================================
-- SCREEN-TO-DECK SAAS DATABASE SCHEMA
-- Multi-tenant SaaS with RLS security
-- ==============================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ==============================================
-- ORGANIZATIONS (Multi-tenancy root)
-- ==============================================
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    -- Billing & Plans
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    billing_email TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    webhook_url TEXT,
    webhook_secret TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- USERS (Organization members)
-- ==============================================
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Auth (Supabase Auth integration)
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Organization role
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '[]', -- granular permissions
    
    -- Activity tracking
    last_active TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- API KEYS (Programmatic access)
-- ==============================================
CREATE TABLE api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    -- Key data
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- bcrypt hashed
    key_preview TEXT NOT NULL, -- Last 4 chars for display (e.g., "...a1b2")
    
    -- Access control
    permissions JSONB DEFAULT '["scan", "export"]', -- ["scan", "export", "admin"]
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    allowed_ips TEXT[], -- IP whitelist
    
    -- Usage tracking
    last_used TIMESTAMPTZ,
    requests_count INTEGER DEFAULT 0,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- PROJECTS (Deck collections/workspaces)
-- ==============================================
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    -- Project data
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6', -- Hex color for UI
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]', -- Array of user IDs with access
    
    -- Settings
    settings JSONB DEFAULT '{
        "auto_validate": true,
        "default_format": "standard",
        "export_formats": ["mtga", "moxfield"]
    }',
    
    -- Stats
    scans_count INTEGER DEFAULT 0,
    last_scan_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- SCANS (Processing history & results)
-- ==============================================
CREATE TABLE scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    
    -- Image data
    image_url TEXT NOT NULL,
    image_filename TEXT,
    image_size INTEGER, -- bytes
    image_hash TEXT, -- SHA-256 for deduplication
    
    -- Processing state
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_time INTEGER, -- milliseconds
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- AI Processing data
    ocr_raw_text TEXT, -- Raw OCR output for debugging
    ai_corrections JSONB DEFAULT '[]', -- Array of corrections made
    
    -- Results
    cards_detected JSONB DEFAULT '[]', -- Detected cards with quantities
    deck_analysis JSONB DEFAULT '{}', -- Format, commander, colors, price, etc.
    formats_exported TEXT[] DEFAULT '{}', -- Exported formats
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Source tracking
    source TEXT DEFAULT 'web' CHECK (source IN ('web', 'api', 'discord', 'mobile')),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- USAGE LOGS (Billing & analytics)
-- ==============================================
CREATE TABLE usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    
    -- Action tracking
    action TEXT NOT NULL, -- scan, export, api_call, webhook
    resource_type TEXT, -- image, deck, project
    resource_id UUID,
    
    -- Billing data (for usage-based pricing)
    tokens_used INTEGER DEFAULT 0, -- AI tokens consumed
    processing_time INTEGER DEFAULT 0, -- milliseconds
    storage_bytes INTEGER DEFAULT 0,
    
    -- Request data
    endpoint TEXT, -- API endpoint called
    method TEXT, -- HTTP method
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- AUDIT LOGS (Security & compliance)
-- ==============================================
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action TEXT NOT NULL, -- user_created, project_deleted, plan_changed, etc.
    resource_type TEXT NOT NULL, -- user, project, organization, api_key
    resource_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    source TEXT DEFAULT 'web', -- web, api, system
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Organizations: Users can only access their own org
CREATE POLICY "Users can access their organization" ON organizations
    FOR ALL USING (id = auth.jwt()->>'org_id'::UUID);

-- Users: Can see users in their organization
CREATE POLICY "Users can see org members" ON users
    FOR SELECT USING (org_id = auth.jwt()->>'org_id'::UUID);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- API Keys: Organization-scoped
CREATE POLICY "API Keys scoped to organization" ON api_keys
    FOR ALL USING (org_id = auth.jwt()->>'org_id'::UUID);

-- Projects: Organization-scoped with sharing
CREATE POLICY "Projects visible to org members" ON projects
    FOR SELECT USING (
        org_id = auth.jwt()->>'org_id'::UUID OR 
        is_public = TRUE OR
        shared_with ? auth.uid()::TEXT
    );

CREATE POLICY "Projects writable by org members" ON projects
    FOR INSERT WITH CHECK (org_id = auth.jwt()->>'org_id'::UUID);

CREATE POLICY "Projects updatable by creator or admins" ON projects
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND org_id = projects.org_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Scans: Organization-scoped
CREATE POLICY "Scans visible to org members" ON scans
    FOR ALL USING (org_id = auth.jwt()->>'org_id'::UUID);

-- Usage logs: Organization-scoped (read-only for most users)
CREATE POLICY "Usage logs visible to org" ON usage_logs
    FOR SELECT USING (org_id = auth.jwt()->>'org_id'::UUID);

-- Audit logs: Admin-only visibility
CREATE POLICY "Audit logs visible to admins" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND org_id = audit_logs.org_id 
            AND role IN ('owner', 'admin')
        )
    );

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Users
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_active ON users(last_active DESC);

-- API Keys
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_active ON api_keys(org_id) WHERE is_active = TRUE;

-- Projects
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_creator ON projects(created_by);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);

-- Scans
CREATE INDEX idx_scans_org_created ON scans(org_id, created_at DESC);
CREATE INDEX idx_scans_project ON scans(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_scans_status ON scans(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_scans_hash ON scans(image_hash); -- For deduplication
CREATE INDEX idx_scans_user ON scans(user_id);

-- Usage logs
CREATE INDEX idx_usage_logs_org_created ON usage_logs(org_id, created_at DESC);
CREATE INDEX idx_usage_logs_action ON usage_logs(action, created_at DESC);
CREATE INDEX idx_usage_logs_billing ON usage_logs(org_id, created_at) WHERE action IN ('scan', 'export');

-- Audit logs
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ==============================================
-- FUNCTIONS & TRIGGERS
-- ==============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scans_updated_at
    BEFORE UPDATE ON scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit log trigger
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, old_values, ip_address)
        VALUES (
            OLD.org_id,
            auth.uid(),
            TG_TABLE_NAME || '_deleted',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD),
            inet_client_addr()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address)
        VALUES (
            NEW.org_id,
            auth.uid(),
            TG_TABLE_NAME || '_updated',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            inet_client_addr()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, new_values, ip_address)
        VALUES (
            NEW.org_id,
            auth.uid(),
            TG_TABLE_NAME || '_created',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW),
            inet_client_addr()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ==============================================
-- SAMPLE DATA (Development)
-- ==============================================

-- Create sample organization
INSERT INTO organizations (id, name, slug, plan) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Acme MTG Decks',
    'acme-mtg',
    'pro'
);

-- Create sample user
INSERT INTO users (id, org_id, email, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'admin@acme-mtg.com',
    'John Planeswalker',
    'owner'
);

-- Create sample project
INSERT INTO projects (id, org_id, created_by, name, description)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Commander Decks Collection',
    'My favorite EDH decks for competitive play'
);

-- ==============================================
-- VIEWS FOR ANALYTICS
-- ==============================================

-- Organization stats view
CREATE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    o.plan,
    COUNT(DISTINCT u.id) as users_count,
    COUNT(DISTINCT p.id) as projects_count,
    COUNT(DISTINCT s.id) as scans_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.created_at >= NOW() - INTERVAL '30 days') as scans_last_30_days,
    SUM(ul.tokens_used) as total_tokens_used,
    o.created_at
FROM organizations o
LEFT JOIN users u ON u.org_id = o.id
LEFT JOIN projects p ON p.org_id = o.id
LEFT JOIN scans s ON s.org_id = o.id
LEFT JOIN usage_logs ul ON ul.org_id = o.id
GROUP BY o.id, o.name, o.plan, o.created_at;

-- Daily usage stats
CREATE VIEW daily_usage_stats AS
SELECT 
    org_id,
    DATE(created_at) as date,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE action = 'scan') as scans,
    COUNT(*) FILTER (WHERE action = 'export') as exports,
    SUM(tokens_used) as tokens_used,
    AVG(response_time) as avg_response_time
FROM usage_logs
GROUP BY org_id, DATE(created_at)
ORDER BY date DESC;

-- ==============================================
-- COMPLETION
-- ==============================================

-- Grant necessary permissions for Supabase functions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

COMMENT ON DATABASE postgres IS 'Screen-to-Deck SaaS Database - Multi-tenant MTG deck scanner with RLS security'; 