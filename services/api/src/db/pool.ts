// =============================================================================
// RAVENCRY API — PostgreSQL Connection Pool
// Single shared pool for all database queries.
// =============================================================================

import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_MS || '10000', 10),
  // Required for Aurora PostgreSQL with SSL
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('🔴 Database pool error:', err.message);
});

pool.on('connect', () => {
  console.log('🟢 Database pool connected');
});

/**
 * Execute a single query with parameterized arguments.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 500) {
    console.warn(`⚠️  Slow query (${duration}ms): ${text.substring(0, 80)}...`);
  }

  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

/**
 * Get a dedicated client from the pool for transactions.
 */
export async function getClient() {
  return pool.connect();
}

/**
 * Graceful shutdown — close all idle connections.
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('🟡 Database pool closed');
}

export default pool;
