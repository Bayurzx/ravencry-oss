// =============================================================================
// RAVENCRY API — Alerts Route
// GET /api/alerts/active — Public alert feed with optional geofence.
// GET /api/cases/:id — Public case detail (safe view, no PII).
// =============================================================================

import { Router } from 'express';
import type {
  AlertCard,
  ActiveAlertsResponse,
  CaseDetailResponse,
} from '../../../../packages/shared/src/types';
import { notFound, badRequest } from '../middleware/errorHandler';
import { query } from '../db/pool';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/alerts/active
// Query params: lat, lng, radius_km (default 160), limit (default 10)
// ---------------------------------------------------------------------------
router.get('/api/alerts/active', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat((req.query.radius_km as string) || '160');
    const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);

    let sql: string;
    let params: unknown[];
    let geofenced = false;

    if (!isNaN(lat) && !isNaN(lng)) {
      // Geofenced query using PostGIS
      geofenced = true;
      sql = `
        SELECT
          c.id AS case_id,
          p.full_name AS person_name,
          p.age_estimate,
          p.gender::text,
          c.last_seen_location,
          c.last_seen_time,
          c.alert_tier::text,
          p.photo_s3_key,
          (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id)::int AS sightings_count
        FROM cases c
        JOIN persons p ON c.person_id = p.id
        WHERE c.status IN ('active', 'broadcast_complete')
          AND c.last_seen_coords IS NOT NULL
          AND ST_DWithin(
            c.last_seen_coords,
            ST_SetSRID(ST_MakePoint($1, $2), 4326),
            $3 * 1000
          )
        ORDER BY
          CASE c.alert_tier WHEN 'FLASH' THEN 0 WHEN 'PRIORITY' THEN 1 ELSE 2 END,
          c.created_at DESC
        LIMIT $4
      `;
      params = [lng, lat, radiusKm, limit];
    } else {
      // No geofence — return all active alerts sorted by tier
      sql = `
        SELECT
          c.id AS case_id,
          p.full_name AS person_name,
          p.age_estimate,
          p.gender::text,
          c.last_seen_location,
          c.last_seen_time,
          c.alert_tier::text,
          p.photo_s3_key,
          (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id)::int AS sightings_count
        FROM cases c
        JOIN persons p ON c.person_id = p.id
        WHERE c.status IN ('active', 'broadcast_complete')
          AND c.alert_tier IN ('FLASH', 'PRIORITY')
        ORDER BY
          CASE c.alert_tier WHEN 'FLASH' THEN 0 WHEN 'PRIORITY' THEN 1 ELSE 2 END,
          c.created_at DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const result = await query<AlertCard>(sql, params);

    res.json({
      alerts: result.rows,
      total: result.rowCount,
      geofenced,
    } satisfies ActiveAlertsResponse);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/cases/:id — Public case detail (safe view)
// ---------------------------------------------------------------------------
router.get('/api/cases/:id', async (req, res, next) => {
  try {
    const caseId = req.params.id;

    // Validate case ID format: NR-YYYY-NNNNNN
    if (!/^NR-\d{4}-\d{6}$/.test(caseId)) {
      throw badRequest('invalid_case_id_format');
    }

    const result = await query<CaseDetailResponse>(
      `SELECT
        c.id AS case_id,
        p.full_name AS person_name,
        p.age_estimate,
        p.gender::text,
        c.last_seen_location,
        c.last_seen_time,
        p.photo_s3_key AS photo_url,
        c.status::text,
        c.alert_tier::text,
        c.circumstance::text,
        (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id)::int AS sightings_count,
        c.created_at::text
      FROM cases c
      JOIN persons p ON c.person_id = p.id
      WHERE c.id = $1`,
      [caseId],
    );

    if (result.rowCount === 0) {
      throw notFound('case', caseId);
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
