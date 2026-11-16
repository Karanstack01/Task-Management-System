-- ====================================================================
-- STACKDROVE ENTERPRISE CTMS: DUAL EMAIL INTEGRATION (GOOGLE & MICROSOFT)
-- Adds Google Workspace / Gmail SMTP columns to system_settings table
-- ====================================================================

ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS email_provider VARCHAR(30) DEFAULT 'MICROSOFT_365',
ADD COLUMN IF NOT EXISTS google_smtp_user VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_smtp_app_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_sender_display_name VARCHAR(255) DEFAULT 'StackDrove CTMS (Google)';

COMMENT ON COLUMN system_settings.email_provider IS 'Active transactional email dispatch provider: MICROSOFT_365 or GOOGLE';
COMMENT ON COLUMN system_settings.google_smtp_user IS 'Google Workspace / Gmail Account Email ID';
COMMENT ON COLUMN system_settings.google_smtp_app_password IS 'Google 16-character App Password (from 2-Step Verification)';
COMMENT ON COLUMN system_settings.google_sender_display_name IS 'Sender display name for Google Workspace emails';

