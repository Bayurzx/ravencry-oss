/**
 * RAVENCRY WhatsApp Service — Express Server
 *
 * Endpoints:
 *   GET  /whatsapp/webhook — Meta webhook verification challenge
 *   POST /whatsapp/webhook — Incoming messages from WhatsApp
 *   GET  /health           — Health check
 */

import 'dotenv/config';
import express from 'express';
import { handleVerification, handleWebhook } from './handler';

const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

// Raw body for Meta signature verification
app.use('/whatsapp/webhook', express.raw({ type: 'application/json' }));
app.use('/whatsapp/webhook', (req, _res, next) => {
  // Meta sends the body as a raw buffer — parse JSON after capture
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString());
    } catch {
      req.body = {};
    }
  }
  next();
});

app.get('/whatsapp/webhook', handleVerification);
app.post('/whatsapp/webhook', handleWebhook);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'whatsapp', uptime: process.uptime() });
});

// Skip listen in test mode
if (!process.env.VITEST) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📱 RAVENCRY WhatsApp Service on port ${PORT}`);
    console.log(`   Webhook: /whatsapp/webhook`);
  });
}

export default app;
