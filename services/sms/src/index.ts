/**
 * RAVENCRY SMS Service — Express Server
 *
 * Endpoints:
 *   POST /sms/broadcast   — Send batch SMS to a list of phones (called by n8n WF-02)
 *   GET  /health           — Health check
 *
 * Architecture:
 *   Caddy routes api.ravencry.cv/sms/* → api:3003/sms/*
 *   API gateway proxies /sms/* → sms:3006 (this service)
 *
 *   OR direct Caddy routing:
 *   api.ravencry.cv/sms/* → sms:3006
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { sendSMSBroadcast, type BroadcastRequest } from './sender';

const app = express();
const PORT = parseInt(process.env.PORT || '3006', 10);

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
  const configured = Boolean(
    (process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY) &&
    (process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME),
  );

  res.status(configured ? 200 : 503).json({
    status: configured ? 'ok' : 'degraded',
    service: 'sms',
    uptime: process.uptime(),
    at_api_key_configured: Boolean(process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY),
    at_username_configured: Boolean(process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME),
    sender_id: process.env.AT_SENDER_ID || 'RAVENCRY',
    at_environment:
      (process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME) === 'sandbox'
        ? 'sandbox'
        : 'production',
  });
});

/**
 * POST /sms/broadcast — Send batch SMS broadcast
 *
 * Called by n8n WF-02 FLASH Broadcast pipeline.
 *
 * Body:
 *   {
 *     phones: string[],          // Recipient phone numbers (international: +234...)
 *     case: AlertCase,           // Case details for message formatting
 *     message?: string,          // Override auto-formatted message
 *     sender_id?: string         // Override sender ID
 *   }
 *
 * Headers:
 *   X-Service-Auth: shared service secret (must match N8N_WEBHOOK_SECRET env)
 */
app.post('/sms/broadcast', async (req: Request, res: Response) => {
  // Service-to-service auth
  const authHeader = req.headers['x-service-auth'];
  const expectedAuth = process.env.N8N_WEBHOOK_SECRET;

  if (expectedAuth && authHeader !== expectedAuth) {
    res.status(401).json({
      error: 'unauthorized',
      code: 'ERR_UNAUTHORIZED',
      details: 'Missing or invalid X-Service-Auth header',
    });
    return;
  }

  const body = req.body as BroadcastRequest;

  // Validate required fields
  if (!body.phones || !Array.isArray(body.phones) || body.phones.length === 0) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'phones array is required and must not be empty',
    });
    return;
  }

  if (!body.case || !body.case.person_name) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'case object with person_name is required',
    });
    return;
  }

  // Validate phone numbers (must start with +)
  const invalidPhones = body.phones.filter(
    (p: string) => !p.startsWith('+'),
  );
  if (invalidPhones.length > 0) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: `All phone numbers must be in international format (+234...). Invalid: ${invalidPhones.slice(0, 3).join(', ')}`,
    });
    return;
  }

  // Send broadcast
  try {
    const result = await sendSMSBroadcast(body);

    const statusCode = result.all_succeeded ? 200 : 207; // 207 Multi-Status if partial failure
    res.status(statusCode).json(result);
  } catch (err: unknown) {
    console.error(
      `[sms] broadcast error: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({
      error: 'broadcast_failed',
      code: 'ERR_INTERNAL',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /sms/send — Send a single SMS (for testing/verification)
 *
 * Body:
 *   {
 *     to: string,        // Single phone number
 *     message: string    // Message text
 *   }
 */
app.post('/sms/send', async (req: Request, res: Response) => {
  const authHeader = req.headers['x-service-auth'];
  const expectedAuth = process.env.N8N_WEBHOOK_SECRET;

  if (expectedAuth && authHeader !== expectedAuth) {
    res.status(401).json({
      error: 'unauthorized',
      code: 'ERR_UNAUTHORIZED',
    });
    return;
  }

  const { to, message } = req.body;

  if (!to || !message) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'to and message are required',
    });
    return;
  }

  if (!to.startsWith('+')) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'Phone number must be in international format (+234...)',
    });
    return;
  }

  try {
    const result = await sendSMSBroadcast({
      phones: [to],
      message,
      case: { case_id: 'test', person_name: 'Test', alert_tier: 'ROUTINE' },
    });

    const batch = result.batches[0];
    if (batch?.status === 'sent') {
      res.json({
        status: 'sent',
        to,
        response: batch.response,
      });
    } else {
      res.status(502).json({
        status: 'failed',
        to,
        error: batch?.error || 'Unknown error',
      });
    }
  } catch (err: unknown) {
    res.status(500).json({
      error: 'send_failed',
      code: 'ERR_INTERNAL',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /sms/broadcast-by-subscribers — Send SMS to subscriber IDs
 *
 * Called by n8n WF-02 with subscriber UUIDs instead of raw phone numbers.
 * The SMS service queries the database for phone_encrypted, decrypts it,
 * and sends the broadcast. This is the correct architecture:
 * n8n doesn't need access to phone numbers; the SMS service handles it.
 *
 * Body:
 *   {
 *     subscriber_ids: string[],   // UUIDs from the Geofence query
 *     case: AlertCase             // Case details for message formatting
 *   }
 *
 * Hackathon fallback: Since AES-256-GCM decryption requires AWS KMS
 * (not available in local dev), this endpoint falls back to sandbox
 * test numbers from AT_SANDBOX_TEST_PHONES env var (comma-separated).
 */
app.post('/sms/broadcast-by-subscribers', async (req: Request, res: Response) => {
  const authHeader = req.headers['x-service-auth'];
  const expectedAuth = process.env.N8N_WEBHOOK_SECRET;

  if (expectedAuth && authHeader !== expectedAuth) {
    res.status(401).json({
      error: 'unauthorized',
      code: 'ERR_UNAUTHORIZED',
      details: 'Missing or invalid X-Service-Auth header',
    });
    return;
  }

  const { subscriber_ids, case: caseData } = req.body;

  if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'subscriber_ids array is required and must not be empty',
    });
    return;
  }

  if (!caseData || !caseData.person_name) {
    res.status(400).json({
      error: 'invalid_request',
      code: 'ERR_BAD_REQUEST',
      details: 'case object with person_name is required',
    });
    return;
  }

  try {
    // ---- Option A: Decrypt phone_encrypted from Postgres (production) ----
    // const { Pool } = require('pg');
    // const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // const result = await pool.query(
    //   'SELECT id, phone_encrypted FROM subscribers WHERE id = ANY($1) AND active = TRUE',
    //   [subscriber_ids],
    // );
    // const phones = result.rows.map(r => decryptPhone(r.phone_encrypted));
    //
    // For hackathon: use sandbox test numbers.

    // ---- Option B: Sandbox fallback (hackathon) ----
    const sandboxPhones = (process.env.AT_SANDBOX_TEST_PHONES || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (sandboxPhones.length === 0) {
      // No test phones configured — return mock success without sending
      console.log(
        `[sms] broadcast-by-subscribers: ${subscriber_ids.length} subscribers, 0 phones (AT_SANDBOX_TEST_PHONES not set). Mock success.`,
      );
      res.json({
        total_phones: subscriber_ids.length,
        total_batches: 0,
        successful_batches: 0,
        failed_batches: 0,
        batches: [],
        all_succeeded: true,
        mode: 'mock',
        note: 'AT_SANDBOX_TEST_PHONES not configured — no SMS sent. Set comma-separated +234... numbers in .env.',
      });
      return;
    }

    console.log(
      `[sms] broadcast-by-subscribers: ${subscriber_ids.length} subscribers, using ${sandboxPhones.length} sandbox test phones`,
    );

    const result = await sendSMSBroadcast({
      phones: sandboxPhones,
      case: caseData,
    });

    const statusCode = result.all_succeeded ? 200 : 207;
    res.status(statusCode).json(result);
  } catch (err: unknown) {
    console.error(
      `[sms] broadcast-by-subscribers error: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({
      error: 'broadcast_failed',
      code: 'ERR_INTERNAL',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// ---- Start ----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[sms] Service running on port ${PORT}`);

  const sandbox =
    (process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME) === 'sandbox';
  console.log(
    `[sms] AT environment: ${sandbox ? 'SANDBOX (SMS will NOT deliver to real phones)' : 'PRODUCTION'}`,
  );
  console.log(
    `[sms] AT API key: ${process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY ? '✓ configured' : '✗ MISSING'}`,
  );
  console.log(
    `[sms] AT username: ${process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME || 'sandbox (default)'}`,
  );
  console.log(
    `[sms] Sender ID: ${process.env.AT_SENDER_ID || 'RAVENCRY (default)'}`,
  );
});

export default app;
