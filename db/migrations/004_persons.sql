-- ============================================================
-- RAVENCRY Migration 004 — Persons
-- Core profile of the missing individual
-- ============================================================

CREATE TABLE persons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  age_estimate    SMALLINT CHECK (age_estimate BETWEEN 0 AND 120),
  gender          gender NOT NULL DEFAULT 'unknown',
  clothing_desc   TEXT,
  distinguishing  TEXT,
  photo_s3_key    TEXT,                        -- S3 key for display photo
  -- face_embedding VECTOR(512),              -- V2: requires pgvector extension
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persons_name_trgm ON persons USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_persons_created ON persons (created_at DESC);
