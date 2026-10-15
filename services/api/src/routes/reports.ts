// =============================================================================
// RAVENCRY API — Reports Route
// POST /api/reports — Citizen submits a missing person report.
// Rate limit: 3 per 15min per IP (NFR-005)
// =============================================================================

import { Router } from 'express';
import type {
  CreateReportRequest,
  ReportResponse,
  InputChannel,
} from '../../../../packages/shared/src/types';
import { reportLimiter } from '../middleware/rateLimit';
import { badRequest } from '../middleware/errorHandler';
import { query } from '../db/pool';

const router = Router();

// Required fields for a valid report
const REQUIRED_FIELDS: (keyof CreateReportRequest)[] = [
  'channel',
  'person_name',
  'last_seen_location',
];

const VALID_CHANNELS: InputChannel[] = [
  'whatsapp',
  'telegram',
  'ussd',
  'sms',
  'pwa',
  'osint',
  'manual',
];

router.post('/api/reports', reportLimiter, async (req, res, next) => {
  try {
    const body = req.body as Partial<CreateReportRequest>;

    // ---- Validate required fields ----
    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length > 0) {
      throw badRequest('missing_required_fields', missing as string[]);
    }

    // ---- Validate channel ----
    if (!VALID_CHANNELS.includes(body.channel as InputChannel)) {
      throw badRequest('invalid_channel', ['channel']);
    }

    // ---- Validate age range ----
    if (body.age !== undefined && (body.age < 0 || body.age > 120)) {
      throw badRequest('invalid_age', ['age']);
    }

    // ---- Hash phone if provided (SHA-256 for dedup) ----
    let reporterPhoneHash: string | null = null;
    if (body.reporter_phone) {
      const crypto = await import('crypto');
      reporterPhoneHash = crypto
        .createHash('sha256')
        .update(body.reporter_phone)
        .digest('hex');
    }

    // ---- Insert person record ----
    const personResult = await query<{ id: string }>(
      `INSERT INTO persons (full_name, age_estimate, gender, clothing_desc)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        body.person_name,
        body.age ?? null,
        body.gender ?? 'unknown',
        body.description ?? null,
      ],
    );

    // ---- Insert case record ----
    // The id is auto-generated via generate_case_id() trigger
    const caseResult = await query<{ id: string }>(
      `INSERT INTO cases (
        person_id, status, circumstance,
        last_seen_location, last_seen_time,
        input_channel, reporter_phone, language,
        raw_report
      ) VALUES ($1, 'pending_triage', 'unknown', $2, $3, $4, $5, 'en', $6)
      RETURNING id`,
      [
        personResult.rows[0].id,
        body.last_seen_location,
        body.last_seen_time ?? null,
        body.channel,
        reporterPhoneHash,
        body.description ?? null,
      ],
    );

    const caseId = caseResult.rows[0].id;

    res.status(202).json({
      case_id: caseId,
      status: 'received',
      eta_seconds: 30,
    } satisfies ReportResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
