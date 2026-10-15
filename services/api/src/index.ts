// =============================================================================
// RAVENCRY API Gateway — Express 4 + TypeScript
// Port 3003 — All public & operator endpoints per design.md Section 4.
//
// Endpoints:
//   GET  /api/health                  — Health check (public, no rate limit)
//   POST /api/reports                 — Submit missing person report
//   POST /api/sightings               — Submit sighting tip
//   GET  /api/alerts/active           — Active alert feed (optional geofence)
//   GET  /api/cases/:id               — Public case detail
//   POST /api/subscribe               — Subscribe to alerts
//   DELETE /api/subscribe             — Unsubscribe
//   GET  /events                      — SSE stream
//   POST /api/ops/alerts/:id/approve  — Approve alert (race-guarded)
//   POST /api/ops/alerts/:id/suppress — Suppress alert
//   PATCH /api/ops/cases/:id          — Update case
//   GET  /api/ops/queue               — Pending review queue
//   POST /api/auth/login              — Operator login
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

// ---- Middleware imports ----
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ---- Route imports ----
import healthRouter from './routes/health';
import reportsRouter from './routes/reports';
import sightingsRouter from './routes/sightings';
import alertsRouter from './routes/alerts';
import eventsRouter from './routes/events';
import opsRouter from './routes/ops';
import subscribeRouter from './routes/subscribe';
import internalRouter from './routes/internal';

const app = express();
const PORT = parseInt(process.env.PORT || '3003', 10);

// =========================================================================
// GLOBAL MIDDLEWARE
// =========================================================================

// Security headers (disable CSP in dev for hot-reload)
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production' ? undefined : false,
  }),
);

// Compress responses
app.use(compression());

// CORS — allow PWA and third-party clients
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-RAVENCRY-Phone',
      'X-RAVENCRY-Secret',
    ],
    maxAge: 86400, // 24h preflight cache
  }),
);

// Trust reverse proxy (Caddy sets X-Forwarded-For, X-Forwarded-Proto, etc.)
// Without this, Express rejects rate-limiter IP lookups and health checks break.
app.set('trust proxy', 1);

// Parse JSON bodies (5MB limit for photo base64)
app.use(express.json({ limit: '5mb' }));

// Global rate limiting (NFR-005)
app.use(globalLimiter);

// Request logging
app.use((req, _res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path} [${req.ip}]`,
  );
  next();
});

// Service-to-service auth check for internal webhooks
app.use((req, res, next) => {
  // Only check for webhook/internal paths
  const isInternalPath =
    req.path.startsWith('/webhook/') || req.path.startsWith('/internal/');
  if (isInternalPath) {
    const secret = req.headers['x-ravencry-secret'];
    const expected = process.env.N8N_WEBHOOK_SECRET;
    if (!secret || secret !== expected) {
      res.status(403).json({
        error: 'forbidden',
        code: 'ERR_AUTH_FORBIDDEN',
      });
      return;
    }
  }
  next();
});

// =========================================================================
// ROUTES
// =========================================================================

// Public
app.use(healthRouter); // GET /api/health
app.use(reportsRouter); // POST /api/reports
app.use(sightingsRouter); // POST /api/sightings
app.use(alertsRouter); // GET /api/alerts/active, GET /api/cases/:id
app.use(subscribeRouter); // POST|DELETE /api/subscribe

// Real-time
app.use(eventsRouter); // GET /events (SSE)

// Telegram webhook pass-through → telegram service (port 3005)
// (Caddy routes this directly in production; this is for dev/testing)
import { createProxyMiddleware } from 'http-proxy-middleware';
const TELEGRAM_SERVICE_URL = process.env.TELEGRAM_SERVICE_URL || 'http://localhost:3005';
app.use(
  '/telegram',
  createProxyMiddleware({
    target: TELEGRAM_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/telegram': '/telegram' },
  }),
);

// Operator (JWT + role-gated internally)
app.use(opsRouter);
// POST /api/ops/alerts/:id/approve
// POST /api/ops/alerts/:id/suppress
// PATCH /api/ops/cases/:id
// GET  /api/ops/queue
// POST /api/auth/login

// Internal service-to-service (n8n → API gateway)
// POST /api/internal/push-broadcast
// POST /api/internal/delivery-log
app.use(internalRouter);

// =========================================================================
// ERROR HANDLING
// =========================================================================

// 404 catch-all for unmatched routes
app.use(notFoundHandler);

// Global error handler (NFR-012 consistent format)
app.use(errorHandler);

// =========================================================================
// STARTUP
// =========================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦅 RAVENCRY API Gateway running on port ${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/api/health`);
  console.log(`   Alerts:     http://localhost:${PORT}/api/alerts/active`);
  console.log(`   SSE:        http://localhost:${PORT}/events`);
  console.log(`   Ops Queue:  http://localhost:${PORT}/api/ops/queue`);
  console.log(
    `   Auto-Approve: ${
      process.env.AUTO_APPROVE_FLASH === 'true' ? '✅ ENABLED (demo)' : '❌ disabled'
    }`,
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🟡 SIGTERM received — shutting down gracefully...');
  const { closePool } = await import('./db/pool');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🟡 SIGINT received — shutting down gracefully...');
  const { closePool } = await import('./db/pool');
  await closePool();
  process.exit(0);
});

export default app;
