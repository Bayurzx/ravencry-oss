-- ============================================================
-- RAVENCRY Migration 006 — Sightings
-- Community tip submissions about a specific case
-- Depends on: cases (005)
-- ============================================================

CREATE TABLE sightings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id           TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status            sighting_status NOT NULL DEFAULT 'unprocessed',

  -- What they saw
  description       TEXT NOT NULL,
  sighting_time     TIMESTAMPTZ,
  sighting_location TEXT,
  sighting_coords   GEOGRAPHY(POINT, 4326),
  photo_s3_key      TEXT,

  -- Who reported it
  reporter_phone    TEXT,                           -- hashed
  input_channel     input_channel NOT NULL,
  trust_score       FLOAT CHECK (trust_score BETWEEN 0 AND 1),

  -- Review
  reviewed_by       UUID,                           -- references operators(id), FK added in 013
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sightings_case ON sightings (case_id);
CREATE INDEX idx_sightings_status ON sightings (status);
CREATE INDEX idx_sightings_coords ON sightings USING GIST (sighting_coords);
