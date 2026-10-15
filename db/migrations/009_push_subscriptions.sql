-- ============================================================
-- RAVENCRY Migration 009 — Push Subscriptions
-- Web Push requires full subscription JSON (endpoint + keys)
-- Depends on: subscribers (008)
-- ============================================================

CREATE TABLE push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_subscriber ON push_subscriptions (subscriber_id);
