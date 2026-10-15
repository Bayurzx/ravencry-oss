-- ============================================================
-- RAVENCRY Migration 014 — Seed Operators
-- Default admin account for initial setup
-- Password: change-me-now (MUST be changed on first login)
-- ============================================================

INSERT INTO operators (email, password_hash, full_name, role)
VALUES (
  'admin@ravencry.cv',
  -- bcrypt hash of 'change-me-now' (cost 12)
  '$2b$12$LJ3m4ys3Lk0TSwHCpNqr4eZMJvQcY8R5Xq7T2WoVhB7KfJpUz8X3e',
  'RAVENCRY Admin',
  'admin'
)
ON CONFLICT (email) DO NOTHING;
