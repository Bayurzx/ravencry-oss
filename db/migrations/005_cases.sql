-- ============================================================
-- RAVENCRY Migration 005 — Cases
-- Each reported incident — the central entity
-- Depends on: persons (004), sequences (003), enums (002)
-- ============================================================

CREATE TABLE cases (
  id                    TEXT PRIMARY KEY DEFAULT generate_case_id(),
  person_id             UUID REFERENCES persons(id) ON DELETE SET NULL,
  status                case_status NOT NULL DEFAULT 'pending_triage',
  alert_tier            alert_tier,
  circumstance          circumstance NOT NULL DEFAULT 'unknown',

  -- Location
  last_seen_location    TEXT,
  last_seen_lga         TEXT,
  last_seen_state       TEXT,
  last_seen_coords      GEOGRAPHY(POINT, 4326),   -- PostGIS point
  last_seen_time        TIMESTAMPTZ,

  -- Intake
  input_channel         input_channel NOT NULL,
  reporter_phone        TEXT,                      -- hashed: SHA256(phone) — for dedup only
  language              language_code NOT NULL DEFAULT 'en',
  raw_report            TEXT,                      -- original submission text

  -- AI processing
  qwen_confidence       FLOAT CHECK (qwen_confidence BETWEEN 0 AND 1),
  qwen_severity_reason  TEXT,
  trust_score           FLOAT CHECK (trust_score BETWEEN 0 AND 1),
  antifake_verdict      TEXT,

  -- Broadcast
  broadcast_at          TIMESTAMPTZ,
  broadcast_channels    TEXT[],
  sms_recipients_count  INTEGER DEFAULT 0,
  naptip_notified       BOOLEAN DEFAULT FALSE,

  -- Lifecycle
  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  operator_id           UUID,                      -- references operators(id), FK added in 013
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_tier ON cases (alert_tier);
CREATE INDEX idx_cases_created ON cases (created_at DESC);
CREATE INDEX idx_cases_state ON cases (last_seen_state);
CREATE INDEX idx_cases_lga ON cases (last_seen_lga);
CREATE INDEX idx_cases_coords ON cases USING GIST (last_seen_coords);

COMMENT ON COLUMN cases.reporter_phone IS 'SHA-256 hash of E.164 phone number';
