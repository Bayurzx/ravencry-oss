-- ============================================================
-- RAVENCRY Migration 002 — Enums
-- All custom enum types used across the schema
-- ============================================================

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM (
    'pending_triage',     -- just received, awaiting Qwen processing
    'in_triage',          -- Qwen is processing
    'pending_review',     -- ROUTINE / low confidence: waiting for operator
    'active',             -- alert issued, case open
    'broadcast_complete', -- FLASH broadcast sent
    'cold',               -- no leads in 30 days
    'resolved',           -- person found
    'false_report'        -- confirmed fake, suppressed
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- pending_sweep added for citizen-reports and n8n OSINT ingestion pipeline
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'pending_sweep' BEFORE 'in_triage';

DO $$ BEGIN
  CREATE TYPE alert_tier AS ENUM ('FLASH', 'PRIORITY', 'ROUTINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('pending', 'approved', 'suppressed', 'broadcast');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE input_channel AS ENUM (
    'whatsapp', 'telegram', 'ussd', 'sms', 'pwa', 'osint', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE language_code AS ENUM (
    'en', 'ha', 'yo', 'ig', 'pcm', 'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('male', 'female', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE circumstance AS ENUM (
    'abduction', 'missing', 'witnessed_kidnapping', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sighting_status AS ENUM (
    'unprocessed', 'under_review', 'confirmed', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE operator_role AS ENUM (
    'moderator', 'senior_moderator', 'admin', 'investigator'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
