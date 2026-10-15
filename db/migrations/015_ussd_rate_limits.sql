-- =============================================================================
-- Migration 015: USSD Rate Limiting Table
-- Replaces DynamoDB ravencry-sessions for USSD rate limiting.
-- Strategy: Rate limit per phone hash (SHA-256), 24-hour sliding window.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ussd_rate_limits (
    phone_hash      TEXT PRIMARY KEY,            -- SHA-256 of E.164 phone
    report_count    INTEGER NOT NULL DEFAULT 1,  -- Reports in current window
    first_report_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_expires  TIMESTAMPTZ NOT NULL         -- Current 24h window expiry
);

COMMENT ON TABLE ussd_rate_limits IS 'USSD rate limiting — 3 reports per phone per 24h. Replaces DynamoDB ravencry-sessions.';
COMMENT ON COLUMN ussd_rate_limits.phone_hash IS 'SHA-256 hash of E.164 phone number';
COMMENT ON COLUMN ussd_rate_limits.window_expires IS '24-hour sliding window expiry. On expiry, counter resets.';

-- Index for cleanup jobs (not required for runtime)
CREATE INDEX idx_ussd_rl_expires ON ussd_rate_limits (window_expires)
    WHERE window_expires < NOW();
