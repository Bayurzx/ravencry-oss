// =============================================================================
// RAVENCRY API — Sightings Route
// POST /api/sightings — Community member reports a sighting of a missing person.
// Rate limit: 10 per minute per IP
// =============================================================================

import { Router } from 'express';
import type { CreateSightingRequest, SightingResponse, InputChannel } from '../../../../packages/shared/src/types';
import { sightingLimiter } from '../middleware/rateLimit';
import { badRequest, notFound } from '../middleware/errorHandler';
import { query } from '../db/pool';

const router = Router();

const VALID_CHANNELS: InputChannel[] = [
  'whatsapp',
  'telegram',
  'ussd',
  'sms',
  'pwa',
  'osint',
  'manual',
];

router.post('/api/sightings', sightingLimiter, async (req, res, next) => {
  try {
    const body = req.body as Partial<CreateSightingRequest>;

    // ---- Validate required fields ----
    if (!body.case_id) throw badRequest('missing_required_fields', ['case_id']);
    if (!body.description) throw badRequest('missing_required_fields', ['description']);

    // ---- Verify case exists ----
    const caseCheck = await query<{ id: string }>(
      'SELECT id FROM cases WHERE id = $1',
      [body.case_id],
    );
    if (caseCheck.rowCount === 0) {
      throw notFound('case', body.case_id);
    }

    // ---- Hash phone if provided ----
    let reporterPhoneHash: string | null = null;
    if (body.reporter_phone) {
      const crypto = await import('crypto');
      reporterPhoneHash = crypto
        .createHash('sha256')
        .update(body.reporter_phone)
        .digest('hex');
    }

    // ---- Insert sighting ----
    const result = await query<{ id: string }>(
      `INSERT INTO sightings (
        case_id, description, sighting_time, sighting_location,
        reporter_phone, input_channel, photo_s3_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        body.case_id,
        body.description,
        body.sighting_time ?? null,
        body.sighting_location ?? null,
        reporterPhoneHash,
        body.reporter_phone ? 'pwa' : 'pwa', // default channel for direct API
        body.photo_url ?? null,
      ],
    );

    res.status(202).json({
      sighting_id: result.rows[0].id,
      status: 'received',
    } satisfies SightingResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
