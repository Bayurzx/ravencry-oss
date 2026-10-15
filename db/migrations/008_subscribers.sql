-- ============================================================
-- RAVENCRY Migration 008 — Subscribers
-- People who opted in to receive alerts for their area
-- Phone is stored AES-256-GCM encrypted (needed for SMS delivery)
-- Phone hash (SHA-256) is used for dedup lookups only — cannot be reversed
-- ============================================================

CREATE TABLE subscribers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_encrypted     BYTEA NOT NULL,              -- AES-256-GCM encrypted (needed for SMS delivery)
  phone_hash          TEXT UNIQUE NOT NULL,        -- SHA-256 for dedup lookups only
  lga                 TEXT,
  state               TEXT,
  location            GEOGRAPHY(POINT, 4326),      -- if they shared GPS

  whatsapp_opted_in   BOOLEAN DEFAULT FALSE,

  active              BOOLEAN DEFAULT TRUE,
  subscribed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ,
  unsubscribed_at     TIMESTAMPTZ
);

COMMENT ON COLUMN subscribers.phone_encrypted IS 'AES-256-GCM encrypted E.164 phone. Decrypt key in AWS Secrets Manager.';
COMMENT ON COLUMN subscribers.phone_hash IS 'SHA-256 of E.164 phone. For dedup only — cannot be reversed.';

CREATE INDEX idx_subscribers_location ON subscribers USING GIST (location) WHERE active = TRUE;
CREATE INDEX idx_subscribers_state ON subscribers (state) WHERE active = TRUE;
CREATE INDEX idx_subscribers_lga ON subscribers (lga) WHERE active = TRUE;
