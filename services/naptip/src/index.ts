/**
 * RAVENCRY NAPTIP Bridge — Mock Webhook Server
 *
 * Simulates the NAPTIP (National Agency for Prohibition of Trafficking
 * in Persons) alert intake endpoint for hackathon demo purposes.
 *
 * In production, this would be replaced by the real NAPTIP API integration
 * with CAP (Common Alerting Protocol) XML serialization.
 *
 * Endpoints:
 *   POST /naptip/webhook  — Receive RAVENCRY alert in CAP-JSON format
 *   GET  /health          — Health check
 *
 * Port: 3008
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '3008', 10);

// In-memory store for received alerts (demo only)
const receivedAlerts: Array<{
  reference: string;
  received_at: string;
  payload: Record<string, unknown>;
}> = [];

// ---- Middleware -----------------------------------------------------------

app.use(express.json({ limit: '1mb' }));

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
  res.json({
    status: 'ok',
    service: 'naptip-bridge',
    version: '1.0.0-mock',
    uptime: process.uptime(),
    alerts_received: receivedAlerts.length,
    mode: 'mock',
  });
});

/**
 * POST /naptip/webhook — Receive RAVENCRY alert
 *
 * Called by n8n WF-02 Node 9 (FLASH broadcast pipeline).
 * In production, this would serialize to CAP XML and POST to the
 * real NAPTIP command centre API.
 *
 * Body (CAP-JSON format):
 *   {
 *     alert_id: string,
 *     type: "MISSING_CHILD",
 *     tier: "FLASH" | "PRIORITY" | "ROUTINE",
 *     person: { name, age, gender, clothing, distinguishing_features },
 *     location: { place, lga, state, lat, lon },
 *     circumstance: string,
 *     reported_at: string,
 *     source: "RAVENCRY-Citizen-Report",
 *     action: "ALERT"
 *   }
 */
app.post('/naptip/webhook', (req: Request, res: Response) => {
  const payload = req.body;

  // Validate required fields
  if (!payload.alert_id || !payload.type || !payload.person?.name) {
    res.status(400).json({
      status: 'rejected',
      error: 'invalid_payload',
      message: 'alert_id, type, and person.name are required',
    });
    return;
  }

  const reference = `NAPTIP-MOCK-${Date.now()}-${receivedAlerts.length + 1}`;
  const receivedAt = new Date().toISOString();

  // Store in memory (demo only — would go to DB in production)
  receivedAlerts.push({
    reference,
    received_at: receivedAt,
    payload,
  });

  console.log(
    `[naptip] Alert received: ${payload.person.name} (${payload.tier}) from ${payload.location?.state || 'unknown'} — ref: ${reference}`,
  );

  // Simulate NAPTIP response
  res.status(200).json({
    status: 'received',
    reference,
    message: `Alert forwarded to NAPTIP command centre. ${payload.tier === 'FLASH' ? 'FLASH priority — duty officer notified.' : 'Queued for review.'}`,
    naptip_case_id: reference,
    received_at: receivedAt,
  });
});

/**
 * GET /naptip/alerts — List received alerts (demo/debug only)
 * In production, this would be behind IP whitelist or removed.
 */
app.get('/naptip/alerts', (_req: Request, res: Response) => {
  res.json({
    total: receivedAlerts.length,
    alerts: receivedAlerts.map((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = a.payload as any;
      return {
        reference: a.reference,
        received_at: a.received_at,
        person_name: p.person?.name as string | undefined,
        tier: p.tier as string | undefined,
        state: p.location?.state as string | undefined,
      };
    }),
  });
});

/**
 * POST /naptip/alerts/clear — Clear in-memory store (demo/debug only)
 */
app.post('/naptip/alerts/clear', (_req: Request, res: Response) => {
  const count = receivedAlerts.length;
  receivedAlerts.length = 0;
  res.json({ cleared: count });
});

// ---- Start ----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[naptip] Mock NAPTIP bridge running on port ${PORT}`);
  console.log(`[naptip] Webhook: POST http://localhost:${PORT}/naptip/webhook`);
  console.log(`[naptip] Health:  GET  http://localhost:${PORT}/health`);
});

export default app;
