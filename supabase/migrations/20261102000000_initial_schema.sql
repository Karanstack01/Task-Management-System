-- ============================================================================
-- STACKDROVE CTMS ENTERPRISE - DATABASE SCHEMA DEFINITION (POSTGRESQL 16)
-- Target Platform: Supabase PostgreSQL with Row Level Security (RLS) & pg_cron
-- Multi-Tier Role Governance: SUPERADMIN, COMPANY_ADMIN, ADMIN, BOSS, DELEGATOR, DELEGATEE
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPERADMIN',     -- Platform Owner / StackDrove Master
        'COMPANY_ADMIN',  -- Tenant Owner / First Organization Head
        'ADMIN',          -- Delegated Operational Administrator
        'BOSS',           -- Executive / C-Suite Cross-Department View
        'DELEGATOR',      -- Manager / Assigner & Reviewer
        'DELEGATEE'       -- Assignee / Task Executor
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE org_subscription_status AS ENUM (
        'TRIAL',
        'ACTIVE',
        'PAST_DUE',
        'SUSPENDED',
        'EXPIRED',
        'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'STARTER',
        'PROFESSIONAL',
        'ENTERPRISE',
        'CUSTOM'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM (
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'PENDING',
        'IN_PROGRESS',
        'AWAITING_VERIFICATION',
        'DONE',
        'CANCELLED',
        'OVERDUE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_frequency AS ENUM (
        'ONE_TIME',
        'DAILY',
        'WEEKLY',
        'MONTHLY',
        'CUSTOM_INTERVAL'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attachment_type AS ENUM (
        'PROOF_OF_WORK',
        'BRIEF_DOCUMENT',
        'REVISION_JUSTIFICATION'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- 3.1 ORGANIZATIONS (Tenant Isolation Root with Domain Whitelist & Platform Kill Switch)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    support_email VARCHAR(255) DEFAULT 'support@stackdrove.com',
    
    -- Domain Governance (e.g. ARRAY['acmecorp.com', 'acme-group.com'])
    allowed_domains TEXT[] NOT NULL DEFAULT '{}',
    primary_contact_email VARCHAR(255) NOT NULL,
    
    -- Subscription & Plan Control
    subscription_plan subscription_tier DEFAULT 'PROFESSIONAL',
    subscription_status org_subscription_status DEFAULT 'ACTIVE',
    subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
    subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    max_users INT DEFAULT 50,
    
    -- Master Platform Kill Switch (Superadmin Control)
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orgs_allowed_domains ON organizations USING GIN (allowed_domains);
CREATE INDEX IF NOT EXISTS idx_orgs_status ON organizations(subscription_status, is_suspended);

-- 3.2 DEPARTMENTS (Organizational Hierarchy)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    head_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(org_id);

-- 3.3 PROFILES (Synchronized with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- References auth.users(id) in Supabase
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for Superadmin
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    role user_role NOT NULL DEFAULT 'DELEGATEE',
    is_primary_owner BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON profiles(org_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3.4 TASKS (Core Transactional Task Table - 40 Column Google Sheet Equivalence)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no BIGSERIAL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    delegator_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    delegatee_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'MEDIUM',
    status task_status DEFAULT 'PENDING',
    frequency task_frequency DEFAULT 'ONE_TIME',
    
    -- Timeline & Date Controls
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_target_date TIMESTAMPTZ NOT NULL,
    current_target_date TIMESTAMPTZ NOT NULL,
    completion_date TIMESTAMPTZ,
    revision_count INT DEFAULT 0,
    max_revision_allowed INT DEFAULT 3,
    
    -- Verification & Governance
    verification_needed BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    
    -- Punctuality & Performance Scoring
    allocated_score NUMERIC(5,2) DEFAULT 10.00,
    actual_score NUMERIC(5,2) DEFAULT 0.00,
    delay_days INT DEFAULT 0,
    score_remarks TEXT,
    
    -- External Deliverables & Recurrence Link
    short_link TEXT,
    recurring_template_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_delegatee ON tasks(delegatee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_delegator ON tasks(delegator_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_target_date ON tasks(current_target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(org_id, status);

-- 3.5 TASK ATTACHMENTS (Cloudinary Deliverables & Proofs)
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cloudinary_public_id TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    attachment_type attachment_type DEFAULT 'PROOF_OF_WORK',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);

-- 3.6 TASK REVISIONS (Audit Trail of Target Date Extensions)
CREATE TABLE IF NOT EXISTS task_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    previous_target_date TIMESTAMPTZ NOT NULL,
    new_target_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisions_task ON task_revisions(task_id);

-- 3.7 TASK VERIFICATIONS (Review History & Score Awards)
CREATE TABLE IF NOT EXISTS task_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    status_awarded task_status NOT NULL,
    score_awarded NUMERIC(5,2) NOT NULL,
    feedback_notes TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_task ON task_verifications(task_id);

-- 3.8 RECURRING TEMPLATES (Master Schedules for Daily, Weekly, Monthly Cron)
CREATE TABLE IF NOT EXISTS recurring_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    delegator_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    delegatee_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    priority task_priority DEFAULT 'MEDIUM',
    frequency task_frequency NOT NULL,
    cron_expression VARCHAR(100),
    recur_delay_days INT DEFAULT 0,
    verification_needed BOOLEAN DEFAULT TRUE,
    allocated_score NUMERIC(5,2) DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    ends_on DATE,
    last_spawned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.9 HOLIDAY CALENDAR (Corporate & Public Blackout Dates)
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'PUBLIC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, holiday_date)
);

-- 3.10 SYSTEM SETTINGS (Integration Credentials & Column Permission Matrix)
CREATE TABLE IF NOT EXISTS system_settings (
    org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- WhatsApp Gateway Settings
    enable_official_wa BOOLEAN DEFAULT FALSE,
    wa_official_phone_id VARCHAR(100),
    wa_official_api_token TEXT,
    wa_official_template_name VARCHAR(150),
    wa_gateway_username VARCHAR(150),
    wa_gateway_password TEXT,
    test_mobile_number VARCHAR(50),
    
    -- Microsoft 365 Email Settings
    smtp_host VARCHAR(150) DEFAULT 'smtp.office365.com',
    smtp_port INT DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_app_password TEXT,
    sender_display_name VARCHAR(150) DEFAULT 'StackDrove CTMS',
    
    -- Cloudinary Settings
    cloudinary_cloud_name VARCHAR(100),
    cloudinary_api_key VARCHAR(100),
    cloudinary_api_secret TEXT,
    cloudinary_upload_preset VARCHAR(100),
    
    -- Rules & SLA Parameters
    default_task_score NUMERIC(5,2) DEFAULT 10.00,
    daily_reminder_hour INT DEFAULT 9,
    skip_holiday_in_sla BOOLEAN DEFAULT TRUE,
    max_revision_gap_days INT DEFAULT 5,
    
    -- Role Column Visibility Permissions Matrix (JSONB)
    column_permissions JSONB DEFAULT '{
        "title": {"boss": true, "delegator": true, "delegatee": true},
        "description": {"boss": true, "delegator": true, "delegatee": true},
        "priority": {"boss": true, "delegator": true, "delegatee": true},
        "allocated_score": {"boss": true, "delegator": true, "delegatee": true},
        "actual_score": {"boss": true, "delegator": true, "delegatee": true},
        "revisions": {"boss": true, "delegator": true, "delegatee": true}
    }'::jsonb,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 NOTIFICATION LOGS (Audit Trail of WhatsApp & Microsoft Emails)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    channel VARCHAR(50) NOT NULL, -- 'MICROSOFT_EMAIL', 'META_OFFICIAL_WA', 'CEOITBOX_GATEWAY'
    template_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SENT', 'FAILED', 'QUEUED'
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRIGGERS & FUNCTIONS

-- 4.1 Auto Update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orgs_updated_at ON organizations;
CREATE TRIGGER trigger_orgs_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4.2 Security Definer: Organization Active Kill Switch Check
CREATE OR REPLACE FUNCTION public.is_org_active(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations
        WHERE id = check_org_id
        AND is_suspended = FALSE
        AND subscription_status IN ('TRIAL', 'ACTIVE')
        AND subscription_expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Superadmin Policy: Unrestricted access across all tables
CREATE POLICY "Superadmin full access on tasks" ON tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN')
);

CREATE POLICY "Superadmin full access on orgs" ON organizations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'SUPERADMIN')
);

-- Company Admin & Operational Admin Policies
CREATE POLICY "Company Admins and Admins manage tasks" ON tasks FOR ALL USING (
    public.is_org_active(org_id) AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = tasks.org_id AND profiles.role IN ('COMPANY_ADMIN', 'ADMIN'))
);

-- Boss View Policy
CREATE POLICY "Boss views org tasks" ON tasks FOR SELECT USING (
    public.is_org_active(org_id) AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = tasks.org_id AND profiles.role = 'BOSS')
);

-- Delegator Policy
CREATE POLICY "Delegators manage their delegated tasks" ON tasks FOR ALL USING (
    public.is_org_active(org_id) AND
    delegator_id = auth.uid()
);

-- Delegatee Policy
CREATE POLICY "Delegatees view assigned tasks" ON tasks FOR SELECT USING (
    public.is_org_active(org_id) AND
    delegatee_id = auth.uid()
);

CREATE POLICY "Delegatees update assigned tasks" ON tasks FOR UPDATE USING (
    public.is_org_active(org_id) AND
    delegatee_id = auth.uid()
) WITH CHECK (
    delegator_id = (SELECT delegator_id FROM tasks t WHERE t.id = tasks.id)
);

