-- ============================================================
-- RAVENCRY Migration 013 — Functions, Triggers & Late FK Constraints
-- Helper functions and ALTER TABLE statements for FKs that depend
-- on tables created in later migrations (e.g. operators at 010)
-- ============================================================

-- --------------------------------------------------
-- Add FK constraints that cross-reference later tables
-- (operators table created in 010, referenced by 005/006/007)
-- --------------------------------------------------
ALTER TABLE cases
  ADD CONSTRAINT fk_cases_operator
  FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL;

ALTER TABLE sightings
  ADD CONSTRAINT fk_sightings_reviewed_by
  FOREIGN KEY (reviewed_by) REFERENCES operators(id) ON DELETE SET NULL;

ALTER TABLE alerts
  ADD CONSTRAINT fk_alerts_approved_by
  FOREIGN KEY (approved_by) REFERENCES operators(id) ON DELETE SET NULL;

ALTER TABLE alerts
  ADD CONSTRAINT fk_alerts_suppressed_by
  FOREIGN KEY (suppressed_by) REFERENCES operators(id) ON DELETE SET NULL;

-- --------------------------------------------------
-- Updated-at auto-set trigger function
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name IN ('persons', 'cases')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %I;
       CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- --------------------------------------------------
-- Geofence helper: find subscribers within radius
-- Falls back to state-level matching for subscribers
-- without GPS coordinates
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION get_subscribers_in_radius(
  p_lat FLOAT,
  p_lng FLOAT,
  p_radius_km FLOAT DEFAULT 160,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  subscriber_id       UUID,
  phone_encrypted     BYTEA,
  whatsapp_opted_in   BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.phone_encrypted, s.whatsapp_opted_in
  FROM subscribers s
  WHERE s.active = TRUE
    AND (
      -- Coordinate-based geofence (primary)
      (s.location IS NOT NULL AND ST_DWithin(
        s.location::geography,
        ST_MakePoint(p_lng, p_lat)::geography,
        p_radius_km * 1000
      ))
      OR
      -- State-level fallback (subscribers without GPS coordinates)
      (s.location IS NULL AND p_state IS NOT NULL AND s.state = p_state)
    );
END;
$$ LANGUAGE plpgsql;
