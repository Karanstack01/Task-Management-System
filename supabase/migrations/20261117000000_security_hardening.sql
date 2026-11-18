-- =============================================================
-- StackDrove CTMS - Security hardening
--
-- 1. Four tables were created WITHOUT row-level security. On Supabase every
--    table in `public` is reachable through the REST API using the public
--    "anon" key that ships in the browser, so with RLS off anyone could read
--    (and change) them. RLS is switched on here; with no policy the default
--    is "deny", and the server-side service-role key (which bypasses RLS) is
--    unaffected.
-- 2. The anonymous role never needs to touch application data (sign-in goes
--    through Supabase Auth, not these tables), so its privileges are removed
--    as a second layer of defence.
--
-- Tenant-scoped policies for signed-in users are added together with the
-- Supabase data layer.
-- =============================================================

ALTER TABLE task_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- `anon` exists on Supabase; guarded so the migration also runs on plain Postgres.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;
END $$;
