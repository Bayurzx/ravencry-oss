// =============================================================================
// RAVENCRY API — Health Route
// GET /api/health — Returns service status (public, no rate limit)
// =============================================================================

import { Router } from 'express';
import type { HealthResponse } from '../../../../packages/shared/src/types';
import { query } from '../db/pool';

const router = Router();

router.get('/api/health', async (_req, res) => {
  const services: HealthResponse['services'] = {
    api: 'healthy',
    database: 'healthy',
  };

  // Quick DB connectivity check
  try {
    await query('SELECT 1');
    services.database = 'healthy';
  } catch {
    services.database = 'degraded';
  }

  const status: HealthResponse['status'] =
    Object.values(services).every((s) => s === 'healthy') ? 'ok' : 'degraded';

  res.json({
    status,
    uptime_seconds: Math.floor(process.uptime()),
    services,
    timestamp: new Date().toISOString(),
  } satisfies HealthResponse);
});

export default router;
