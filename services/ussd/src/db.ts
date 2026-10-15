/**
 * RAVENCRY USSD Service — Aurora PostgreSQL Client
 *
 * Handles all database operations for the USSD handler:
 *   - Create missing person reports (persons + cases)
 *   - Record sightings
 *   - Look up latest alerts by LGA
 *   - Subscribe / unsubscribe from alerts
 */

import pg from 'pg';

const { Pool } = pg;

// ── Connection Pool ─────────────────────────────────────────────────────────

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // Aurora PostgreSQL SSL
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    });

    _pool.on('error', (err) => {
      console.error('[ussd] Unexpected pool error:', err);
    });
  }
  return _pool;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CreateCaseInput {
  name: string;
  age: number | null;
  lastSeenLGA: string;
  lastSeenWhen: string;
  phoneHash: string;
}

export interface CreateSightingInput {
  caseId: string;
  location: string;
  phoneHash: string;
}

export interface AlertResult {
  case_id: string;
  full_name: string;
  age_estimate: number | null;
  last_seen_lga: string | null;
  alert_tier: string | null;
  last_seen_time: string | null;
}

// ── Case Creation ───────────────────────────────────────────────────────────

/**
 * Create a missing person report: INSERT into persons + cases.
 * Returns the generated case_id (e.g. NR-2026-000042).
 */
export async function createCase(input: CreateCaseInput): Promise<string> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert person
    const personResult = await client.query(
      `INSERT INTO persons (full_name, age_estimate)
       VALUES ($1, $2)
       RETURNING id`,
      [input.name, input.age],
    );
    const personId = personResult.rows[0].id;

    // 2. Insert case
    const caseResult = await client.query(
      `INSERT INTO cases (
        person_id,
        status,
        last_seen_lga,
        raw_report,
        input_channel,
        reporter_phone,
        language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        personId,
        'pending_triage',
        input.lastSeenLGA,
        `USSD report: ${input.name}, age ${input.age ?? 'unknown'}, last seen ${input.lastSeenLGA}, ${input.lastSeenWhen}`,
        'ussd',
        input.phoneHash,
        'en', // USSD is English-only (no language detection needed for structured input)
      ],
    );

    await client.query('COMMIT');
    return caseResult.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Sightings ───────────────────────────────────────────────────────────────

/**
 * Check if a case ID exists and is active.
 */
export async function caseExists(caseId: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT 1 FROM cases WHERE id = $1 AND status NOT IN ('false_report', 'resolved')`,
    [caseId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Create a sighting record for an existing case.
 */
export async function createSighting(input: CreateSightingInput): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO sightings (case_id, description, sighting_location, input_channel, reporter_phone)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.caseId,
      `USSD sighting at: ${input.location}`,
      input.location,
      'ussd',
      input.phoneHash,
    ],
  );
}

// ── Alert Lookup ────────────────────────────────────────────────────────────

/**
 * Get the latest active FLASH or PRIORITY alert for a given LGA.
 * Returns null if no active alerts.
 */
export async function getLatestAlertByLGA(lga: string): Promise<AlertResult | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT c.id AS case_id, p.full_name, p.age_estimate,
            c.last_seen_lga, c.alert_tier, c.last_seen_time
     FROM cases c
     JOIN persons p ON c.person_id = p.id
     WHERE c.last_seen_lga ILIKE $1
       AND c.status IN ('active', 'broadcast_complete')
       AND c.alert_tier IN ('FLASH', 'PRIORITY')
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [`%${lga}%`],
  );

  if (result.rows.length === 0) return null;
  return result.rows[0] as AlertResult;
}

// ── Subscribers ─────────────────────────────────────────────────────────────

/**
 * Subscribe a phone to alerts for a given LGA.
 * Uses phone_hash for dedup (UPSERT on phone_hash).
 *
 * Note: The subscribers table requires `phone_encrypted` (BYTEA NOT NULL).
 * For USSD, we store a placeholder since we don't have the encryption key
 * in this service. The SMS service handles actual encrypted phone storage.
 * We store a SHA-256 marker so the subscription can be matched later.
 */
export async function upsertSubscriber(phoneHash: string, lga: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO subscribers (phone_encrypted, phone_hash, lga, active, subscribed_at)
     VALUES ($1, $2, $3, true, NOW())
     ON CONFLICT (phone_hash)
     DO UPDATE SET lga = $3, active = true, last_active_at = NOW(), unsubscribed_at = NULL`,
    [
      Buffer.from(phoneHash, 'utf-8'), // placeholder — real encryption done at API layer
      phoneHash,
      lga,
    ],
  );
}

/**
 * Unsubscribe a phone from alerts (soft delete).
 */
export async function removeSubscriber(phoneHash: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE subscribers SET active = false, unsubscribed_at = NOW()
     WHERE phone_hash = $1 AND active = true`,
    [phoneHash],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ── Health Check ────────────────────────────────────────────────────────────

/**
 * Test Aurora connectivity.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ── Test Helpers ────────────────────────────────────────────────────────────

/**
 * Replace the connection pool (for testing).
 */
export function _setPoolForTesting(pool: pg.Pool | null): void {
  _pool = pool;
}

/**
 * Close the connection pool (for graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
