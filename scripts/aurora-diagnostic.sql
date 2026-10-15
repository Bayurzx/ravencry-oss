-- =============================================================================
-- RAVENCRY — Aurora PostgreSQL Diagnostic & Fix Script
-- Run via EC2 bastion: psql "$DATABASE_URL" -f aurora-diagnostic.sql
-- 
-- This script:
--   1. Diagnoses what is missing on Aurora
--   2. Reports discrepancies vs expected schema
--   3. Provides the exact fix commands (copy-paste to terminal)
-- =============================================================================

-- Turn on verbose output so we can see what's happening
\echo '========================================'
\echo 'STEP 0: Connection Info'
\echo '========================================'
SELECT current_database() AS db, current_user AS usr, version();


-- =============================================================================
-- STEP 1: Extensions (migration 001)
-- =============================================================================
\echo '========================================'
\echo 'STEP 1: Extensions'
\echo '========================================'
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm')
ORDER BY extname;
-- Expected: postgis, pg_trgm, uuid-ossp (3 rows)


-- =============================================================================
-- STEP 2: All Enum Values (migration 002)
-- =============================================================================
\echo '========================================'
\echo 'STEP 2: Enums — case_status (expects 9 values, incl. pending_sweep)'
\echo '========================================'
SELECT unnest(enum_range(NULL::case_status)) AS case_status ORDER BY enum_range_order(NULL::case_status, unnest(enum_range(NULL::case_status)));

\echo 'alert_tier (expects FLASH, PRIORITY, ROUTINE)'
SELECT unnest(enum_range(NULL::alert_tier));

\echo 'alert_status (expects pending, approved, suppressed, broadcast)'
SELECT unnest(enum_range(NULL::alert_status));

\echo 'input_channel (expects whatsapp, telegram, ussd, sms, pwa, osint, manual)'
SELECT unnest(enum_range(NULL::input_channel));

\echo 'language_code (expects en, ha, yo, ig, pcm, mixed)'
SELECT unnest(enum_range(NULL::language_code));

\echo 'gender (expects male, female, unknown)'
SELECT unnest(enum_range(NULL::gender));

\echo 'circumstance (expects abduction, missing, witnessed_kidnapping, unknown)'
SELECT unnest(enum_range(NULL::circumstance));

\echo 'sighting_status (expects unprocessed, under_review, confirmed, rejected)'
SELECT unnest(enum_range(NULL::sighting_status));

\echo 'operator_role (expects moderator, senior_moderator, admin, investigator)'
SELECT unnest(enum_range(NULL::operator_role));


-- =============================================================================
-- STEP 3: Sequences (migration 003)
-- =============================================================================
\echo '========================================'
\echo 'STEP 3: Sequences'
\echo '========================================'
SELECT sequence_name, last_value, is_called 
FROM information_schema.sequences 
WHERE sequence_name = 'case_seq';


-- =============================================================================
-- STEP 4: Tables Existence Check (migrations 004–012)
-- =============================================================================
\echo '========================================'
\echo 'STEP 4: Tables — expected 9 user tables (10 rows with PostGIS spatial_ref_sys)'
\echo '========================================'
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c 
        WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS col_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check each critical table individually (so we know which one is missing)
\echo '--- Critical table checks ---'
DO $$
DECLARE
  tbl TEXT;
  exists BOOLEAN;
  expected_tables TEXT[] := ARRAY[
    'persons', 'cases', 'sightings', 'alerts', 
    'subscribers', 'push_subscriptions', 'operators', 
    'sources', 'lga_coords'
  ];
BEGIN
  FOREACH tbl IN ARRAY expected_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) INTO exists;
    IF exists THEN
      RAISE NOTICE '✅ % — EXISTS', tbl;
    ELSE
      RAISE NOTICE '❌ % — MISSING', tbl;
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 5: Table Row Counts
-- =============================================================================
\echo '========================================'
\echo 'STEP 5: Row Counts'
\echo '========================================'
DO $$
DECLARE
  tbl TEXT;
  cnt BIGINT;
  expected_tables TEXT[] := ARRAY[
    'persons', 'cases', 'sightings', 'alerts', 
    'subscribers', 'push_subscriptions', 'operators', 
    'sources', 'lga_coords'
  ];
BEGIN
  FOREACH tbl IN ARRAY expected_tables LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM %I', tbl) INTO cnt;
      RAISE NOTICE '% — % rows', tbl, cnt;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE '% — TABLE DOES NOT EXIST', tbl;
    END;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 6: Row Detail Checks
-- =============================================================================
\echo '========================================'
\echo 'STEP 6: Detail Checks'
\echo '========================================'

\echo '--- operators (expects admin@ravencry.cv) ---'
SELECT email, full_name, role FROM operators;

\echo '--- persons (expects 4 from seed: Fatima, Yusuf, Chioma, Babajide) ---'
SELECT id, full_name, age_estimate, gender FROM persons ORDER BY full_name;

\echo '--- cases (expects 4: NR-2026-000001 through 000004) ---'
SELECT id, status, alert_tier, circumstance, last_seen_state, left(raw_report, 60) AS raw_report_preview
FROM cases ORDER BY id;

\echo '--- lga_coords (expects 8 LGAs) ---'
SELECT lga, state FROM lga_coords ORDER BY state, lga;

\echo '--- subscribers (expects 50) ---'
SELECT count(*) AS subscriber_count, state FROM subscribers 
WHERE active = TRUE GROUP BY state ORDER BY state;


-- =============================================================================
-- STEP 7: Functions (migration 013)
-- =============================================================================
\echo '========================================'
\echo 'STEP 7: Functions & Triggers'
\echo '========================================'
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_case_id', 'set_updated_at', 'get_subscribers_in_radius')
ORDER BY routine_name;
-- Expected: generate_case_id, get_subscribers_in_radius, set_updated_at

\echo '--- Triggers ---'
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table;


-- =============================================================================
-- STEP 8: Foreign Key Constraints (migration 013)
-- =============================================================================
\echo '========================================'
\echo 'STEP 8: FK Constraints'
\echo '========================================'
SELECT tc.table_name, tc.constraint_name, 
       ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
-- Expected: 4 FKs (cases→operators, sightings→operators, alerts→operators ×2)


-- =============================================================================
-- STEP 9: The Exact Query That Failed
-- =============================================================================
\echo '========================================'
\echo 'STEP 9: Test the failing Dedup Query'
\echo '========================================'
-- This is the exact query from n8n WF-03 Node 6 (Postgres — Dedup Check)
-- If this fails with "relation cases does not exist" → cases table is missing
-- If this fails with "function similarity() does not exist" → pg_trgm is missing
SELECT
  id,
  similarity(raw_report, 'Kidnappers abduct 5 students in Zamfara Gusau, Zamfara State') AS sim_score
FROM cases
WHERE
  status IN ('pending_triage', 'pending_review', 'pending_sweep')
  AND raw_report IS NOT NULL
  AND similarity(raw_report, 'Kidnappers abduct 5 students in Zamfara Gusau, Zamfara State') > 0.35
ORDER BY sim_score DESC
LIMIT 1;


-- =============================================================================
-- STEP 10: Schema Comparison Summary
-- =============================================================================
\echo '========================================'
\echo 'STEP 10: Summary — What Needs Fixing'
\echo '========================================'

DO $$
DECLARE
  missing_extensions TEXT := '';
  missing_enum_value BOOLEAN := FALSE;
  missing_tables TEXT := '';
  missing_functions TEXT := '';
  row_issues TEXT := '';
  ext_count INT;
  tbl_rec RECORD;
  fn_rec RECORD;
BEGIN
  -- Check extensions
  SELECT count(*) INTO ext_count FROM pg_extension WHERE extname = 'pg_trgm';
  IF ext_count = 0 THEN missing_extensions := missing_extensions || 'pg_trgm '; END IF;
  
  SELECT count(*) INTO ext_count FROM pg_extension WHERE extname = 'postgis';
  IF ext_count = 0 THEN missing_extensions := missing_extensions || 'postgis '; END IF;
  
  SELECT count(*) INTO ext_count FROM pg_extension WHERE extname = 'uuid-ossp';
  IF ext_count = 0 THEN missing_extensions := missing_extensions || 'uuid-ossp '; END IF;

  -- Check tables
  FOR tbl_rec IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    NULL; -- just checking
  END LOOP;

  -- Check for cases specifically
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'cases') THEN
    RAISE NOTICE '🔴 CRITICAL: cases table MISSING — this is why n8n Dedup Check fails';
    RAISE NOTICE '   → Run: psql $DATABASE_URL -f db/migrations/005_cases.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'persons') THEN
    RAISE NOTICE '🔴 persons table MISSING — run migration 004 first';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'subscribers') THEN
    RAISE NOTICE '🟡 subscribers table MISSING';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'alerts') THEN
    RAISE NOTICE '🟡 alerts table MISSING';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'sightings') THEN
    RAISE NOTICE '🟡 sightings table MISSING';
  END IF;

  -- Check pending_sweep enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum 
                 WHERE enumtypid = 'case_status'::regtype 
                 AND enumlabel = 'pending_sweep') THEN
    RAISE NOTICE '🔴 pending_sweep missing from case_status enum (Fix 1 in pending_fix.md)';
  END IF;

  -- Check functions
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_case_id') THEN
    RAISE NOTICE '🟡 generate_case_id() function missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_subscribers_in_radius') THEN
    RAISE NOTICE '🟡 get_subscribers_in_radius() function missing';
  END IF;

  IF missing_extensions != '' THEN
    RAISE NOTICE '🔴 Missing extensions: %', missing_extensions;
  ELSE
    RAISE NOTICE '✅ All extensions present';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== If tables are missing, run ALL migrations in order: ===';
  RAISE NOTICE 'cd db/migrations && for f in *.sql; do psql $DATABASE_URL -f $f; done';
END $$;


-- =============================================================================
-- APPENDIX: Fix Commands (copy-paste after diagnostic)
-- =============================================================================
\echo ''
\echo '╔══════════════════════════════════════════════════════════════╗'
\echo '║  FIX COMMANDS — apply based on what STEP 10 reports        ║'
\echo '╚══════════════════════════════════════════════════════════════╝'
\echo ''
\echo '--- If pending_sweep enum is missing (Fix 1): ---'
\echo 'ALTER TYPE case_status ADD VALUE IF NOT EXISTS ''pending_sweep'' BEFORE ''in_triage'';'
\echo ''
\echo '--- If pg_trgm is missing (Fix 4): ---'
\echo 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
\echo ''
\echo '--- If tables are missing — re-run ALL migrations (safest): ---'
\echo 'Get-ChildItem db/migrations/*.sql | Sort-Object Name | ForEach-Object {'
\echo '  Get-Content $_.FullName | psql $env:DATABASE_URL -f -'
\echo '}'
\echo ''
\echo '--- If tables exist but are empty — run seeds: ---'
\echo 'psql $DATABASE_URL -f db/seed-lga-coords.sql'
\echo 'psql $DATABASE_URL -f db/seed.sql'
\echo ''
\echo '--- Verify after fix: ---'
\echo 'psql $DATABASE_URL -c "SELECT count(*) FROM cases;"          # expects 4'
\echo 'psql $DATABASE_URL -c "SELECT count(*) FROM subscribers;"   # expects 50'
\echo 'psql $DATABASE_URL -c "SELECT count(*) FROM lga_coords;"    # expects 8'
