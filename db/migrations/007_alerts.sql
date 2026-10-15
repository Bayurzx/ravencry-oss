-- ============================================================
-- RAVENCRY Migration 007 — Alerts
-- Every alert broadcast record
-- Depends on: cases (005), operators (010) — cross-reference OK, FK checked at runtime
-- ============================================================

CREATE TABLE alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id             TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tier                alert_tier NOT NULL,
  status              alert_status NOT NULL DEFAULT 'pending',

  approved_by         UUID,                      -- references operators(id), FK added in 013
  approved_at         TIMESTAMPTZ,
  suppressed_by       UUID,                      -- references operators(id), FK added in 013
  suppression_reason  TEXT,

  channels            TEXT[],
  sms_count           INTEGER DEFAULT 0,
  telegram_sent       BOOLEAN DEFAULT FALSE,
  whatsapp_sent       BOOLEAN DEFAULT FALSE,
  naptip_sent         BOOLEAN DEFAULT FALSE,
  push_sent           INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  broadcast_at        TIMESTAMPTZ
);

CREATE INDEX idx_alerts_case ON alerts (case_id);
CREATE INDEX idx_alerts_status ON alerts (status);
CREATE INDEX idx_alerts_created ON alerts (created_at DESC);
