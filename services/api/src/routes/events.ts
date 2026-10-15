// =============================================================================
// RAVENCRY API — SSE Events Route
// GET /events — Server-Sent Events stream for real-time alert updates.
// Rate limit: 10 connections per minute per IP.
// Uses shared SSE client manager from lib/sse-broadcast.ts to avoid
// circular dependency with ops.ts.
// =============================================================================

import { Router } from 'express';
import type { SSEEvent } from '../../../../packages/shared/src/types';
import { sseLimiter } from '../middleware/rateLimit';
import { addClient, removeClient } from '../lib/sse-broadcast';

const router = Router();

router.get('/events', sseLimiter, (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Register client
  const clientId = addClient(res);

  // Send initial event with connection ID
  res.write(
    `data: ${JSON.stringify({
      type: 'initial',
      payload: { client_id: clientId, alerts: [] },
    } satisfies SSEEvent)}\n\n`,
  );

  // Keep-alive ping every 15 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      removeClient(clientId);
    }
  }, 15000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    removeClient(clientId);
  });
});

export default router;
