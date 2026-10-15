-- ============================================================
-- RAVENCRY Migration 010 — Operators
-- Internal ops staff accounts
-- ============================================================

CREATE TABLE operators (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,                   -- bcrypt
  full_name       TEXT NOT NULL,
  role            operator_role NOT NULL DEFAULT 'moderator',
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_operators_email ON operators (email);
CREATE INDEX idx_operators_role ON operators (role);
