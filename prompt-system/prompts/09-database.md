# Prompt 09 — Database Schema & AWS Data Layer
## RDS PostgreSQL (standard) + DynamoDB + S3
## Optimized by Opus review — June 2026

---

## INSTRUCTION TO AI

Produce the complete database setup for RAVENCRY: Aurora PostgreSQL schema with PostGIS, DynamoDB table definitions, S3 bucket policy, and all migration scripts.

Everything here must be production-ready — correct types, indexes, constraints, and RLS policies.

---

## RDS POSTGRESQL: FULL SCHEMA

```sql
-- ============================================================
-- RAVENCRY Database Schema
-- RDS PostgreSQL 15 (standard) + PostGIS 3
-- Run in order — dependencies respected
-- Opus optimization applied: June 2026
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- fuzzy text search on names
-- CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector: enable at V2 for face_embedding

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE case_status AS ENUM (
  'pending_triage',     -- just received, awaiting Qwen processing
  'in_triage',          -- Qwen is processing
  'pending_review',     -- ROUTINE / low confidence: waiting for operator
  'active',             -- alert issued, case open
  'broadcast_complete', -- FLASH broadcast sent
  'cold',               -- no leads in 30 days
  'resolved',           -- person found
  'false_report'        -- confirmed fake, suppressed
);

CREATE TYPE alert_tier AS ENUM ('FLASH', 'PRIORITY', 'ROUTINE');

CREATE TYPE input_channel AS ENUM (
  'whatsapp', 'telegram', 'ussd', 'sms', 'pwa', 'osint', 'manual'
);

CREATE TYPE language_code AS ENUM (
  'en', 'ha', 'yo', 'ig', 'pcm', 'mixed'
);

CREATE TYPE gender AS ENUM ('male', 'female', 'unknown');

CREATE TYPE circumstance AS ENUM (
  'abduction', 'missing', 'witnessed_kidnapping', 'unknown'
);

CREATE TYPE sighting_status AS ENUM (
  'unprocessed', 'under_review', 'confirmed', 'rejected'
);

CREATE TYPE operator_role AS ENUM (
  'moderator', 'senior_moderator', 'admin', 'investigator'
);

-- ============================================================
-- PERSONS
-- Core profile of the missing individual
-- ============================================================

CREATE TABLE persons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name        TEXT NOT NULL,
  age_estimate     SMALLINT CHECK (age_estimate BETWEEN 0 AND 120),
  gender           gender NOT NULL DEFAULT 'unknown',
  clothing_desc    TEXT,
  distinguishing   TEXT,
  photo_s3_key     TEXT,                          -- S3 key for display photo
  -- face_embedding VECTOR(512),                  -- V2: requires pgvector extension
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_persons_name_trgm ON persons USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_persons_created ON persons (created_at DESC);

-- ============================================================
-- CASES
-- Each reported incident
-- ============================================================

-- Sequence MUST be created before the table that references it
CREATE SEQUENCE case_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_id() RETURNS TEXT AS $$
BEGIN
  RETURN 'NR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('case_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE cases (
  id                    TEXT PRIMARY KEY DEFAULT generate_case_id(),
  person_id             UUID REFERENCES persons(id),
  status                case_status NOT NULL DEFAULT 'pending_triage',
  alert_tier            alert_tier,
  circumstance          circumstance NOT NULL DEFAULT 'unknown',

  -- Location
  last_seen_location    TEXT,
  last_seen_lga         TEXT,
  last_seen_state       TEXT,
  last_seen_coords      GEOGRAPHY(POINT, 4326),   -- PostGIS point
  last_seen_time        TIMESTAMPTZ,

  -- Intake
  input_channel         input_channel NOT NULL,
  reporter_phone        TEXT,                      -- hashed: SHA256(phone) — for dedup only
  language              language_code NOT NULL DEFAULT 'en',
  raw_report            TEXT,                      -- original submission text

  -- AI processing
  qwen_confidence       FLOAT CHECK (qwen_confidence BETWEEN 0 AND 1),
  qwen_severity_reason  TEXT,
  trust_score           FLOAT CHECK (trust_score BETWEEN 0 AND 1),
  antifake_verdict      TEXT,

  -- Broadcast
  broadcast_at          TIMESTAMPTZ,
  broadcast_channels    TEXT[],
  sms_recipients_count  INTEGER DEFAULT 0,
  naptip_notified       BOOLEAN DEFAULT FALSE,

  -- Lifecycle
  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  operator_id           UUID,                      -- last operator to touch this case
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_tier ON cases (alert_tier);
CREATE INDEX idx_cases_created ON cases (created_at DESC);
CREATE INDEX idx_cases_state ON cases (last_seen_state);
CREATE INDEX idx_cases_lga ON cases (last_seen_lga);
CREATE INDEX idx_cases_coords ON cases USING GIST (last_seen_coords);

-- Phone is stored hashed — never plain text
-- Hash on insert: sha256(normalize_phone(reporter_phone))
COMMENT ON COLUMN cases.reporter_phone IS 'SHA-256 hash of E.164 phone number';

-- ============================================================
-- SIGHTINGS
-- Community tip submissions about a specific case
-- ============================================================

CREATE TABLE sightings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id          TEXT REFERENCES cases(id) ON DELETE CASCADE,
  status           sighting_status NOT NULL DEFAULT 'unprocessed',

  -- What they saw
  description      TEXT NOT NULL,
  sighting_time    TIMESTAMPTZ,
  sighting_location TEXT,
  sighting_coords  GEOGRAPHY(POINT, 4326),
  photo_s3_key     TEXT,

  -- Who reported it
  reporter_phone   TEXT,                           -- hashed
  input_channel    input_channel NOT NULL,
  trust_score      FLOAT CHECK (trust_score BETWEEN 0 AND 1),

  -- Review
  reviewed_by      UUID,
  reviewed_at      TIMESTAMPTZ,
  review_notes     TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sightings_case ON sightings (case_id);
CREATE INDEX idx_sightings_status ON sightings (status);
CREATE INDEX idx_sightings_coords ON sightings USING GIST (sighting_coords);

-- ============================================================
-- ALERTS
-- Every alert broadcast record
-- ============================================================

CREATE TYPE alert_status AS ENUM ('pending', 'approved', 'suppressed', 'broadcast');

CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id          TEXT REFERENCES cases(id),
  tier             alert_tier NOT NULL,
  status           alert_status NOT NULL DEFAULT 'pending',
  
  approved_by      UUID,
  approved_at      TIMESTAMPTZ,
  suppressed_by    UUID,
  suppression_reason TEXT,

  channels         TEXT[],
  sms_count        INTEGER DEFAULT 0,
  telegram_sent    BOOLEAN DEFAULT FALSE,
  whatsapp_sent    BOOLEAN DEFAULT FALSE,
  naptip_sent      BOOLEAN DEFAULT FALSE,
  push_sent        INTEGER DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  broadcast_at     TIMESTAMPTZ
);

CREATE INDEX idx_alerts_case ON alerts (case_id);
CREATE INDEX idx_alerts_status ON alerts (status);
CREATE INDEX idx_alerts_created ON alerts (created_at DESC);

-- ============================================================
-- SUBSCRIBERS
-- People who opted in to receive alerts for their area
-- ============================================================

CREATE TABLE subscribers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_encrypted  BYTEA NOT NULL,                 -- AES-256-GCM encrypted (needed for SMS delivery)
  phone_hash       TEXT UNIQUE NOT NULL,           -- SHA-256 for dedup lookups only
  lga              TEXT,
  state            TEXT,
  location         GEOGRAPHY(POINT, 4326),          -- if they shared GPS
  
  whatsapp_opted_in BOOLEAN DEFAULT FALSE,
  
  active           BOOLEAN DEFAULT TRUE,
  subscribed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at   TIMESTAMPTZ,
  unsubscribed_at  TIMESTAMPTZ
);

COMMENT ON COLUMN subscribers.phone_encrypted IS 'AES-256-GCM encrypted E.164 phone. Decrypt key in AWS Secrets Manager.';
COMMENT ON COLUMN subscribers.phone_hash IS 'SHA-256 of E.164 phone. For dedup only — cannot be reversed.';

CREATE INDEX idx_subscribers_location ON subscribers USING GIST (location) WHERE active = TRUE;
CREATE INDEX idx_subscribers_state ON subscribers (state) WHERE active = TRUE;
CREATE INDEX idx_subscribers_lga ON subscribers (lga) WHERE active = TRUE;

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- Web Push requires full subscription JSON (endpoint + keys)
-- ============================================================

CREATE TABLE push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id    UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subs_subscriber ON push_subscriptions (subscriber_id);

-- ============================================================
-- LGA COORDINATES CACHE
-- Pre-populated with all 774 Nigerian LGA centroids
-- Used for geocoding text locations without external API
-- ============================================================

CREATE TABLE lga_coords (
  lga              TEXT NOT NULL,
  state            TEXT NOT NULL,
  lat              FLOAT NOT NULL,
  lng              FLOAT NOT NULL,
  PRIMARY KEY (lga, state)
);

-- ============================================================
-- OPERATORS
-- Internal ops staff accounts
-- ============================================================

CREATE TABLE operators (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,                  -- bcrypt
  full_name        TEXT NOT NULL,
  role             operator_role NOT NULL DEFAULT 'moderator',
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at    TIMESTAMPTZ
);

-- ============================================================
-- SOURCES
-- Crucix source module health registry
-- ============================================================

CREATE TABLE sources (
  id               TEXT PRIMARY KEY,               -- e.g. 'naptip-rss', 'gdelt-nigeria'
  display_name     TEXT NOT NULL,
  last_sweep_at    TIMESTAMPTZ,
  last_event_at    TIMESTAMPTZ,
  events_24h       INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'unknown',         -- healthy|degraded|error|unknown
  error_message    TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persons_updated BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- GEOFENCE HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_subscribers_in_radius(
  p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT DEFAULT 160, p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  subscriber_id UUID, phone_encrypted BYTEA, whatsapp_opted_in BOOLEAN
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
```

---

## DYNAMODB TABLE DEFINITIONS

### Table 1: `ravencry-alerts` (primary event log)
```
Partition key: alert_id (String)
Sort key: created_at (String, ISO 8601)

Attributes:
  case_id (S), tier (S), channels (L), sms_count (N),
  operator_id (S), broadcast_at (S), status (S)

GSI: case-index
  Partition key: case_id
  Sort key: created_at
  Projection: ALL

TTL: none (alerts are permanent record)
```

### Table 2: `ravencry-sweep-log` (Crucix sweep audit)
```
Partition key: sweep_id (String, uuid)
Sort key: swept_at (String, ISO 8601)

Attributes:
  source (S), events_found (N), new_events (N), duration_ms (N),
  status (S: ok|error), error_message (S)

GSI: source-index
  Partition key: source
  Sort key: swept_at

TTL: sweep_ttl (Number) — auto-delete after 90 days
```

### Table 3: `ravencry-sessions` (WhatsApp + USSD conversation state)
```
Partition key: session_key (String, e.g. "whatsapp:+2348012345678")
Sort key: none (single record per session)

Attributes:
  state (S), data (M: JSON), started_at (S), updated_at (S)

TTL: expires_at (Number, Unix timestamp) — 30 min WhatsApp, 5 min USSD
```

---

## S3 BUCKET CONFIGURATION

### Bucket: `ravencry-media-{env}`

**Folder structure:**
```
ravencry-media-prod/
  cases/
    {case_id}/
      original/     ← raw upload (deleted after 72h via lifecycle)
      display/      ← compressed/watermarked version (permanent)
      thumbnail/    ← 150x150 for alert cards
  sightings/
    {sighting_id}/
      original/     ← deleted after 72h
  audio/
    {case_id}/
      voice_note.ogg  ← deleted after transcription (24h lifecycle)
```

**Lifecycle policy (JSON):**
```json
{
  "Rules": [
    {
      "Id": "delete-originals",
      "Status": "Enabled",
      "Filter": { "Prefix": "cases/*/original/" },
      "Expiration": { "Days": 3 }
    },
    {
      "Id": "delete-audio",
      "Status": "Enabled",
      "Filter": { "Prefix": "audio/" },
      "Expiration": { "Days": 1 }
    },
    {
      "Id": "delete-sighting-originals",
      "Status": "Enabled",
      "Filter": { "Prefix": "sightings/*/original/" },
      "Expiration": { "Days": 3 }
    }
  ]
}
```

**Bucket policy:** No public access. Pre-signed URLs only.
```javascript
// Generate pre-signed upload URL (5 minute expiry)
const uploadUrl = await s3.getSignedUrlPromise('putObject', {
  Bucket: process.env.S3_BUCKET,
  Key: `cases/${caseId}/original/${filename}`,
  Expires: 300,
  ContentType: 'image/jpeg',
  Conditions: [['content-length-range', 0, 5242880]]  // max 5MB
})

// Generate pre-signed display URL (1 hour expiry)
const displayUrl = await s3.getSignedUrlPromise('getObject', {
  Bucket: process.env.S3_BUCKET,
  Key: `cases/${caseId}/display/${filename}`,
  Expires: 3600
})
```

---

## MIGRATION RUNNER: `db/migrate.mjs`

```javascript
// Run all .sql files in db/migrations/ in order
// Tracks applied migrations in a _migrations table
// Usage: node db/migrate.mjs
```

Produce migrations as numbered files:
```
db/migrations/
  001_extensions.sql       ← uuid-ossp, postgis, pg_trgm
  002_enums.sql            ← all CREATE TYPE statements incl. alert_status
  003_sequences.sql        ← case_seq + generate_case_id()
  004_persons.sql
  005_cases.sql
  006_sightings.sql
  007_alerts.sql
  008_subscribers.sql      ← includes phone_encrypted BYTEA
  009_push_subscriptions.sql
  010_operators.sql
  011_sources.sql
  012_lga_coords.sql       ← 774 Nigerian LGA centroids
  013_functions.sql        ← get_subscribers_in_radius (with state fallback)
  014_seed_operators.sql   ← Insert default admin account for hackathon
```

---

## SEED DATA: `db/seed.sql`

Insert realistic Nigerian test data:
- 3 open FLASH cases (one in Kano, one in Kaduna, one in Lagos)
- 1 resolved case
- 50 subscribers across Lagos, Abuja, Kano
- 1 admin operator account (email: admin@ravencry.ng, password: change-me-now)

---

## VERIFICATION CHECKLIST

- [ ] `psql $DATABASE_URL -c "\dx"` shows postgis and pg_trgm active
- [ ] All 11 tables exist: `\dt` (persons, cases, sightings, alerts, subscribers, push_subscriptions, lga_coords, operators, sources)
- [ ] `SELECT get_subscribers_in_radius(12.0022, 8.5920, 160, 'Kano')` returns Kano subscribers
- [ ] `INSERT INTO cases (person_id, input_channel...) ...` — case ID generates as `NR-2026-000001`
- [ ] PostGIS spatial index: `EXPLAIN SELECT * FROM cases WHERE ST_DWithin(...)` shows index scan
- [ ] Partial index: `EXPLAIN SELECT * FROM subscribers WHERE active = TRUE AND ...` uses partial GIST
- [ ] `SELECT COUNT(*) FROM lga_coords` returns 774 (or initial seed subset)
- [ ] DynamoDB: all 3 tables visible in AWS console
- [ ] S3: lifecycle rules active in bucket properties
- [ ] S3 pre-signed upload URL works (curl PUT succeeds)
- [ ] Seed data: 3 FLASH cases visible in cases table
- [ ] Seed: admin login works in Appsmith
