// =============================================================================
// RAVENCRY API — Subscribe Route
// POST   /api/subscribe    — Subscribe to alerts, optionally with push token.
// DELETE /api/subscribe    — Unsubscribe.
// Auth: Optional phone OTP. For hackathon MVP, phone hash is sufficient.
// =============================================================================

import { Router } from 'express';
import crypto from 'crypto';
import type {
  CreateSubscriberRequest,
  SubscriberResponse,
} from '../../../../packages/shared/src/types';
import { badRequest } from '../middleware/errorHandler';
import { query } from '../db/pool';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/subscribe
// ---------------------------------------------------------------------------
router.post('/api/subscribe', async (req, res, next) => {
  try {
    const body = req.body as CreateSubscriberRequest;

    // Phone is required for subscription (hashed for dedup)
    const phoneRaw = req.headers['x-ravencry-phone'] as string;
    if (!phoneRaw) {
      throw badRequest('phone_required_in_header', ['X-RAVENCRY-Phone']);
    }

    const phoneHash = crypto
      .createHash('sha256')
      .update(phoneRaw)
      .digest('hex');

    // Check for existing subscriber
    const existing = await query<{ id: string; active: boolean }>(
      'SELECT id, active FROM subscribers WHERE phone_hash = $1',
      [phoneHash],
    );

    let subscriberId: string;

    if (existing.rowCount > 0) {
      // Re-activate if previously unsubscribed
      if (!existing.rows[0].active) {
        await query(
          `UPDATE subscribers
           SET active = TRUE, last_active_at = NOW(),
               lga = COALESCE($2, lga), state = COALESCE($3, state)
           WHERE id = $1`,
          [existing.rows[0].id, body.lga ?? null, body.state ?? null],
        );
      }
      subscriberId = existing.rows[0].id;
    } else {
      // New subscriber
      const result = await query<{ id: string }>(
        `INSERT INTO subscribers (phone_encrypted, phone_hash, lga, state, whatsapp_opted_in)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          Buffer.from(phoneRaw), // In production this would be AES-256-GCM encrypted
          phoneHash,
          body.lga ?? null,
          body.state ?? null,
          body.whatsapp ?? false,
        ],
      );
      subscriberId = result.rows[0].id;
    }

    // Handle push subscription if push_token provided
    if (body.push_token) {
      // Store push subscription (simplified — full endpoint/p256dh/auth in production)
      await query(
        `INSERT INTO push_subscriptions (subscriber_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [subscriberId, body.push_token, '', ''],
      );
    }

    res.status(201).json({
      subscriber_id: subscriberId,
      confirmation: 'subscribed',
    } satisfies SubscriberResponse);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/subscribe
// ---------------------------------------------------------------------------
router.delete('/api/subscribe', async (req, res, next) => {
  try {
    const phoneRaw = req.headers['x-ravencry-phone'] as string;
    if (!phoneRaw) {
      throw badRequest('phone_required_in_header', ['X-RAVENCRY-Phone']);
    }

    const phoneHash = crypto
      .createHash('sha256')
      .update(phoneRaw)
      .digest('hex');

    const result = await query(
      `UPDATE subscribers
       SET active = FALSE, unsubscribed_at = NOW()
       WHERE phone_hash = $1 AND active = TRUE
       RETURNING id`,
      [phoneHash],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        error: 'subscriber_not_found',
        code: 'ERR_NOT_FOUND',
      });
      return;
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
