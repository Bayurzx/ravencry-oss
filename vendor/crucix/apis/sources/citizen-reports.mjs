// Citizen Reports — Aurora PostgreSQL query for pending_sweep cases
// Queries the ravencry cases table for citizen-submitted reports awaiting OSINT sweep
// Connects via the API gateway or direct pg connection
// Gracefully degrades if Aurora is unreachable

import { safeFetch } from '../utils/fetch.mjs';
import '../utils/env.mjs';

const API_BASE = process.env.RAVENCRY_API_URL || 'http://localhost:3003';

/**
 * Fetch pending sweep cases from the RAVENCRY API gateway
 * These are citizen reports that need OSINT correlation
 */
async function fetchPendingSweepCases() {
  try {
    // Try the API gateway's internal ops endpoint
    const data = await safeFetch(`${API_BASE}/api/ops/queue?status=pending_sweep`, {
      timeout: 10000,
      headers: {
        'X-Internal-Source': 'crucix-citizen-reports',
      },
    });
    if (data?.error) {
      return { error: data.error, cases: [] };
    }
    // Normalize response shape
    const cases = Array.isArray(data) ? data : (data?.cases || data?.data || []);
    return { error: null, cases };
  } catch (e) {
    return { error: e.message, cases: [] };
  }
}

/**
 * Try direct PostgreSQL connection as fallback
 * Uses environment variable DATABASE_URL if API gateway is unreachable
 */
async function fetchDirectDB() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return { error: 'DATABASE_URL not configured', cases: [] };
    }

    // Dynamic import of pg to avoid requiring it for all Crucix users
    let pg;
    try {
      pg = await import('pg');
    } catch {
      return { error: 'pg package not installed (optional dependency)', cases: [] };
    }

    const { Pool } = pg.default || pg;
    const pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      max: 2,
    });

    try {
      const result = await pool.query(
        `SELECT
          id, case_id, name, description,
          lga, state, tier, status,
          language, source_channel,
          created_at, updated_at
        FROM cases
        WHERE status = 'pending_sweep'
        ORDER BY created_at DESC
        LIMIT 50`
      );
      return {
        error: null,
        cases: result.rows,
        source: 'direct-db',
      };
    } finally {
      await pool.end();
    }
  } catch (e) {
    return { error: e.message, cases: [] };
  }
}

/**
 * Compact a case row for briefing output
 */
function compactCase(c) {
  return {
    id: c.id || c.case_id,
    name: c.name || '(unknown)',
    description: (c.description || '').substring(0, 200),
    lga: c.lga || '',
    state: c.state || '',
    tier: c.tier || 'ROUTINE',
    status: c.status || 'pending_sweep',
    language: c.language || 'en',
    sourceChannel: c.source_channel || 'unknown',
    createdAt: c.created_at || '',
    updatedAt: c.updated_at || '',
  };
}

/**
 * Briefing — main entry point called by Crucix orchestrator
 */
export async function briefing() {
  // Try API gateway first, then fall back to direct DB
  let result = await fetchPendingSweepCases();

  if (result.error) {
    console.error(`[crucix] Citizen Reports API fetch failed: ${result.error}. Trying direct DB...`);
    result = await fetchDirectDB();
  }

  const cases = (result.cases || []).map(compactCase);

  // Categorize by tier
  const flashCases = cases.filter(c => c.tier === 'FLASH');
  const priorityCases = cases.filter(c => c.tier === 'PRIORITY');
  const routineCases = cases.filter(c => c.tier === 'ROUTINE');

  return {
    source: 'Citizen Reports (Aurora pending_sweep)',
    timestamp: new Date().toISOString(),
    queryMethod: result.source || 'api-gateway',
    dbError: result.error || null,
    totalPending: cases.length,
    flashCount: flashCases.length,
    priorityCount: priorityCases.length,
    routineCount: routineCases.length,
    pendingCases: cases,
    flashCases,
    priorityCases,
    routineCases,
  };
}

// CLI standalone runner
if (process.argv[1]?.endsWith('citizen-reports.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
