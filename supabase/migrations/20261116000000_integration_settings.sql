-- =============================================================
-- StackDrove CTMS - Per-organization integration settings
-- Stores Email (Google / Microsoft 365), WhatsApp and Cloudinary
-- credentials. Secret values are encrypted by the application
-- (AES-256-GCM) before they are written here.
--
-- org_id is TEXT so it works with both UUID and slug-style org ids.
-- Access is via the service-role key from server code only;
-- RLS is enabled with NO policies, so anon/authenticated clients
-- can never read or write this table.
-- =============================================================

CREATE TABLE IF NOT EXISTS integration_settings (
    org_id     TEXT PRIMARY KEY,
    settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE integration_settings IS
  'Encrypted per-organization integration credentials. Service-role access only.';
