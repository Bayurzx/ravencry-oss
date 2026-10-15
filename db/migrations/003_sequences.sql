-- ============================================================
-- RAVENCRY Migration 003 — Sequences & ID Generation
-- Case ID sequence and human-readable ID generator function
-- Format: NR-YYYY-NNNNNN (e.g., NR-2026-000001)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS case_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'NR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('case_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
