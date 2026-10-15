-- ============================================================
-- RAVENCRY Migration 012 — LGA Coordinates Cache
-- Pre-populated with all 774 Nigerian LGA centroids
-- Used for geocoding text locations without external API
-- Seed data loaded from db/seed-lga-coords.sql
-- ============================================================

CREATE TABLE lga_coords (
  lga     TEXT NOT NULL,
  state   TEXT NOT NULL,
  lat     FLOAT NOT NULL,
  lng     FLOAT NOT NULL,
  PRIMARY KEY (lga, state)
);

CREATE INDEX idx_lga_coords_state ON lga_coords (state);
