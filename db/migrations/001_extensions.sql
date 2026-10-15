-- ============================================================
-- RAVENCRY Migration 001 — Extensions
-- Aurora PostgreSQL 16.4
-- Required extensions for UUID generation, geospatial, and text search
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search on names
-- CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector: enable at V2 for face_embedding
