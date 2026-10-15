/**
 * RAVENCRY USSD Service — Express Server
 *
 * Endpoints:
 *   POST /ussd/callback   — Africa's Talking USSD webhook handler
 *   GET  /health           — Health check
 *
 * Architecture:
 *   Caddy routes api.ravencry.cv/ussd/* → ussd:3007 (this service)
 *   AT posts USSD callbacks to: https://api.ravencry.cv/ussd/callback
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { handleUSSD, type USSDRequest } from './handler';
import { checkDbHealth } from './db';

const app = express();
const PORT = parseInt(process.env.PORT || '3007', 10);

// ── Middleware ───────────────────────────────────────────────────────────────

// AT sends USSD callbacks as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path} [${req.ip}]`,
  );
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /health — Health check
 */
app.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await checkDbHealth();

  const status = dbHealthy ? 'ok' : 'degraded';
  res.status(dbHealthy ? 200 : 503).json({
    status,
    service: 'ussd',
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'unreachable',
    ussd_service_code: '*384*72836#',
  });
});

/**
 * POST /ussd/callback — Africa's Talking USSD Callback
 *
 * AT sends:
 *   sessionId    — unique session identifier
 *   serviceCode  — USSD service code (*384*72836#)
 *   phoneNumber  — caller's phone (+2348012345678)
 *   text         — accumulated user input (e.g. "1*Amina*8*Kano*today 2pm")
 *   networkCode  — mobile network code (optional)
 *
 * Response:
 *   Plain text prefixed with CON (continue) or END (terminate session)
 */
app.post('/ussd/callback', async (req: Request, res: Response) => {
  const {
    sessionId,
    serviceCode,
    phoneNumber,
    text,
    networkCode,
  } = req.body as Record<string, string>;

  // Validate required fields from AT
  if (!sessionId || !phoneNumber) {
    res.status(400).type('text/plain').send('END Invalid request');
    return;
  }

  const ussdReq: USSDRequest = {
    sessionId: sessionId || '',
    serviceCode: serviceCode || '*384*72836#',
    phoneNumber: phoneNumber || '',
    text: text || '',
    networkCode: networkCode || '',
  };

  console.log(
    `[ussd] Session ${sessionId} | Phone ${phoneNumber.substring(0, 7)}*** | Text: "${text || '(empty)'}"`,
  );

  try {
    const response = await handleUSSD(ussdReq);

    // AT expects plain text response
    res.type('text/plain').send(response);
  } catch (err) {
    console.error(
      `[ussd] Fatal error in session ${sessionId}:`,
      err instanceof Error ? err.message : err,
    );
    res.type('text/plain').send(
      'END Service temporarily unavailable.\nPlease try again or call 112.',
    );
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ussd] Service running on port ${PORT}`);
  console.log(`[ussd] USSD callback URL: POST /ussd/callback`);
  console.log(
    `[ussd] Database: ${process.env.DATABASE_URL ? '✓ configured' : '✗ MISSING'}`,
  );
  console.log(
    `[ussd] AWS region: ${process.env.AWS_REGION || 'us-east-1 (default)'}`,
  );
  console.log(
    `[ussd] AWS credentials: ${process.env.AWS_ACCESS_KEY_ID ? '✓ configured' : '✗ MISSING (rate limiting disabled)'}`,
  );
});

export default app;
