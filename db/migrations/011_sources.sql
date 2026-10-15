-- ============================================================
-- RAVENCRY Migration 011 — Sources
-- Crucix source module health registry
-- ============================================================

CREATE TABLE sources (
  id              TEXT PRIMARY KEY,                -- e.g. 'naptip-rss', 'gdelt-nigeria'
  display_name    TEXT NOT NULL,
  last_sweep_at   TIMESTAMPTZ,
  last_event_at   TIMESTAMPTZ,
  events_24h      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'unknown',          -- healthy|degraded|error|unknown
  error_message   TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
