/**
 * RAVENCRY Telegram Service — Express Server
 *
 * Endpoints:
 *   POST /telegram/webhook   — Receive Telegram updates (set as bot webhook)
 *   POST /telegram/broadcast  — Trigger FLASH/PRIORITY broadcast (called by n8n WF-02)
 *   GET  /health              — Health check
 *
 * Architecture:
 *   Caddy routes api.ravencry.cv/telegram/* → api:3003/telegram/*
 *   API gateway proxies /telegram/* → telegram:3005 (this service)
 *
 *   OR direct Caddy routing:
 *   api.ravencry.cv/telegram/* → telegram:3005
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { processUpdate, type TelegramUpdate } from './bot';
import {
  sendFlashBroadcast,
  sendPriorityBroadcast,
  sendOpsNotification,
  type FlashBroadcastResult,
} from './broadcast';
import type { AlertCase } from './templates';

const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

// ---- Middleware -----------------------------------------------------------

app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path} [${req.ip}]`,
  );
  next();
});

// ---- Routes ---------------------------------------------------------------

/**
 * GET /health — Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  const healthy = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'telegram',
    uptime: process.uptime(),
    bot_token_configured: healthy,
    alert_channel_configured: Boolean(process.env.TELEGRAM_ALERT_CHANNEL_ID),
    ops_channel_configured: Boolean(process.env.TELEGRAM_OPS_CHANNEL_ID),
  });
});

/**
 * POST /telegram/webhook — Receive updates from Telegram
 *
 * Telegram sends JSON updates here when the webhook is configured.
 * See: https://core.telegram.org/bots/api#getting-updates
 *
 * Webhook registration:
 *   POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={BASE_URL}/telegram/webhook
 */
app.post('/telegram/webhook', async (req: Request, res: Response) => {
  const update = req.body as TelegramUpdate;

  if (!update || !update.update_id) {
    res.status(400).json({ error: 'invalid_update', code: 'ERR_BAD_REQUEST' });
    return;
  }

  // Acknowledge immediately — Telegram will retry if we don't return 200 quickly
  res.status(200).json({ ok: true });

  // Process update asynchronously (so we don't block the response)
  try {
    await processUpdate(update);
  } catch (err: unknown) {
    console.error(
      `[telegram] update processing error: ${err instanceof Error ? err.message : String(err)}`,
    );
    // Notify ops on critical failure
    await sendOpsNotification(
      `⚠️ Telegram bot error processing update ${update.update_id}: ${err instanceof Error ? err.message : String(err)}`,
    ).catch(() => {});
  }
});

/**
 * POST /telegram/broadcast — Trigger alert broadcast
 *
 * Called by n8n WF-02 FLASH Broadcast pipeline.
 * Body: { case: AlertCase }
 *
 * Auth: Requires X-RAVENCRY-Secret header (shared service secret).
 */
app.post('/telegram/broadcast', async (req: Request, res: Response) => {
  // Service-to-service auth
  const secret = req.headers['x-ravencry-secret'];
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (!secret || secret !== expected) {
    res.status(403).json({
      error: 'forbidden',
      code: 'ERR_AUTH_FORBIDDEN',
    });
    return;
  }

  const { case: caseData } = req.body as { case?: AlertCase };

  if (!caseData || !caseData.case_id || !caseData.person_name) {
    res.status(400).json({
      error: 'missing_required_fields',
      code: 'ERR_BAD_REQUEST',
      details: 'case.case_id and case.person_name are required',
    });
    return;
  }

  let result: FlashBroadcastResult;

  switch (caseData.alert_tier) {
    case 'FLASH':
      result = await sendFlashBroadcast(caseData);
      break;
    case 'PRIORITY': {
      const priorityResult = await sendPriorityBroadcast(caseData);
      result = {
        photo_sent: false,
        fallback_text_sent: priorityResult.success,
        ops_notified: false,
        alert_message_id: priorityResult.message_id,
        error: priorityResult.error,
      };
      break;
    }
    default:
      result = {
        photo_sent: false,
        fallback_text_sent: false,
        ops_notified: false,
        error: `Unsupported alert tier: ${caseData.alert_tier}`,
      };
  }

  const success = result.photo_sent || result.fallback_text_sent;
  res.status(success ? 200 : 502).json({
    status: success ? 'sent' : 'failed',
    ...result,
  });
});

/**
 * GET /telegram/webhook — Webhook verification (for manual testing)
 */
app.get('/telegram/webhook', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    webhook: 'POST only',
    description: 'This endpoint receives Telegram bot updates via POST.',
  });
});

// ---- Startup --------------------------------------------------------------

// Skip listen in test mode
if (!process.env.VITEST) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 RAVENCRY Telegram Service on port ${PORT}`);
    console.log(`   Webhook:   POST /telegram/webhook`);
    console.log(`   Broadcast: POST /telegram/broadcast`);
    console.log(`   Health:    GET  /health`);

    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log('   ✅ Bot token configured');
    } else {
      console.warn('   ⚠️  TELEGRAM_BOT_TOKEN not set — bot will not respond');
    }
    if (process.env.TELEGRAM_ALERT_CHANNEL_ID) {
      console.log('   ✅ Alert channel configured');
    } else {
      console.warn('   ⚠️  TELEGRAM_ALERT_CHANNEL_ID not set');
    }
    if (process.env.TELEGRAM_OPS_CHANNEL_ID) {
      console.log('   ✅ Ops channel configured');
    }
  });
}

export default app;
