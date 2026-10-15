// =============================================================================
// RAVENCRY API — Internal Service Routes
// Service-to-service endpoints called by n8n workflows.
// These are NOT exposed publicly via Caddy — only accessible within Docker network.
// =============================================================================

import { Router } from 'express';
import { query } from '../db/pool';
import { badRequest } from '../middleware/errorHandler';

const router = Router();

// =========================================================================
// POST /api/internal/push-broadcast
// Called by n8n WF-02 Node 8 — sends Web Push notifications to subscribers.
//
// Body:
//   {
//     case: { case_id, person_name, age_estimate, gender, last_seen_location, ... },
//     push_subscriptions: [{ endpoint, keys: { p256dh, auth } }, ...]
//   }
//
// Headers:
//   X-Webhook-Secret: must match N8N_WEBHOOK_SECRET
// =========================================================================
router.post('/api/internal/push-broadcast', async (req, res) => {
  // Service-to-service auth
  const secret = req.headers['x-webhook-secret'];
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (expected && secret !== expected) {
    res.status(401).json({
      error: 'unauthorized',
      code: 'ERR_UNAUTHORIZED',
      details: 'Missing or invalid X-Webhook-Secret header',
    });
    return;
  }

  const { case: caseData, push_subscriptions: subscriptions } = req.body;

  if (!caseData || !subscriptions || !Array.isArray(subscriptions)) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'case and push_subscriptions array are required',
    });
    return;
  }

  if (subscriptions.length === 0) {
    res.json({ sent: 0, failed: 0, total: 0, failures: [] });
    return;
  }

  // ---- Lazy-load web-push (only imported when needed) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webpush: any;
  try {
    webpush = require('web-push');
  } catch {
    res.status(503).json({
      error: 'push_unavailable',
      code: 'ERR_PUSH_UNAVAILABLE',
      details: 'web-push module not installed. Run: npm install web-push',
    });
    return;
  }

  // Set VAPID details (one-time)
  try {
    webpush.setVapidDetails(
      'mailto:admin@ravencry.cv',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || '',
    );
  } catch (err) {
    console.error('[push-broadcast] VAPID config error:', err);
    res.status(500).json({
      error: 'push_config_error',
      code: 'ERR_PUSH_CONFIG',
      details: 'VAPID keys not configured',
    });
    return;
  }

  // Build notification payload
  const title =
    caseData.alert_tier === 'FLASH'
      ? `🚨 MISSING CHILD: ${caseData.person_name}`
      : `⚠️ MISSING PERSON: ${caseData.person_name}`;

  const body = [
    `Age: ${caseData.age_estimate ?? 'unknown'}`,
    `Last seen: ${caseData.last_seen_location ?? 'unknown location'}`,
    caseData.last_seen_lga ? `LGA: ${caseData.last_seen_lga}` : '',
    `Tap to view details and report sightings.`,
  ]
    .filter(Boolean)
    .join('\n');

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      url: `/alert/${caseData.case_id}`,
      case_id: caseData.case_id,
      tier: caseData.alert_tier,
    },
    actions: [
      {
        action: 'view',
        title: 'View Alert',
      },
    ],
    requireInteraction: true,
    tag: `alert-${caseData.case_id}`,
  });

  // Send to each subscription (sequential — web-push has no batch API)
  let sent = 0;
  let failed = 0;
  const failures: Array<{ endpoint: string; error: string }> = [];

  for (const sub of subscriptions) {
    try {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        failed++;
        failures.push({
          endpoint: sub.endpoint || 'missing',
          error: 'incomplete subscription keys',
        });
        continue;
      }

      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        payload,
        {
          TTL: 3600, // 1 hour — alert is time-sensitive
          urgency: caseData.alert_tier === 'FLASH' ? 'high' : 'normal',
        },
      );

      sent++;
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);

      // If subscription is expired/gone, log and continue
      if (message.includes('expired') || message.includes('unsubscribed') || message.includes('404')) {
        console.warn(`[push-broadcast] Expired subscription: ${sub.endpoint}`);
      } else {
        console.error(`[push-broadcast] Send error for ${sub.endpoint}: ${message}`);
      }

      failures.push({ endpoint: sub.endpoint, error: message.slice(0, 200) });
    }
  }

  console.log(
    `[push-broadcast] Complete: ${sent} sent, ${failed} failed out of ${subscriptions.length} for case ${caseData.case_id}`,
  );

  res.json({ sent, failed, total: subscriptions.length, failures });
});

// =========================================================================
// POST /api/internal/delivery-log
// Called by n8n WF-02 Node 11 — records a delivery audit entry.
//
// Body:
//   {
//     case_id: string,
//     alert_id: string,
//     channel: "telegram" | "sms" | "push" | "naptip",
//     status: "delivered" | "failed",
//     recipient_count: number,
//     error?: string
//   }
// =========================================================================
router.post('/api/internal/delivery-log', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (expected && secret !== expected) {
    res.status(401).json({
      error: 'unauthorized',
      code: 'ERR_UNAUTHORIZED',
    });
    return;
  }

  const { case_id, alert_id, channel, status, recipient_count, error } = req.body;

  if (!case_id || !channel || !status) {
    throw badRequest('missing_required_fields', ['case_id', 'channel', 'status']);
  }

  try {
    // Insert into a simple delivery_log table (create it if needed)
    await query(
      `CREATE TABLE IF NOT EXISTS delivery_log (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         case_id TEXT NOT NULL,
         alert_id UUID,
         channel TEXT NOT NULL,
         status TEXT NOT NULL,
         recipient_count INTEGER DEFAULT 0,
         error TEXT,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );

    await query(
      `INSERT INTO delivery_log (case_id, alert_id, channel, status, recipient_count, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [case_id, alert_id || null, channel, status, recipient_count || 0, error || null],
    );

    res.json({ status: 'logged' });
  } catch (err) {
    console.error('[delivery-log] Insert failed:', err);
    res.status(500).json({
      error: 'log_write_failed',
      code: 'ERR_DB_ERROR',
    });
  }
});

export default router;
