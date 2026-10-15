// =============================================================================
// RAVENCRY API — SSE Client Manager
// Shared SSE client registry used by events route and ops route.
// Avoids circular dependency between routes/events.ts and routes/ops.ts.
// =============================================================================

import type { Response } from 'express';
import type { SSEEvent } from '../../../../packages/shared/src/types';

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: Date;
}

const clients = new Map<string, SSEClient>();
let clientIdCounter = 0;

export function addClient(res: Response): string {
  const clientId = `sse-${++clientIdCounter}-${Date.now()}`;
  clients.set(clientId, {
    id: clientId,
    res,
    connectedAt: new Date(),
  });
  console.log(`🟢 SSE client connected: ${clientId} (total: ${clients.size})`);
  return clientId;
}

export function removeClient(clientId: string): void {
  clients.delete(clientId);
  console.log(`🔴 SSE client disconnected: ${clientId} (total: ${clients.size})`);
}

export function broadcastSSE(event: SSEEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const [id, client] of clients) {
    try {
      client.res.write(data);
    } catch {
      clients.delete(id);
    }
  }
}

export function sendToClient(clientId: string, event: SSEEvent): boolean {
  const client = clients.get(clientId);
  if (!client) return false;
  try {
    client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    return true;
  } catch {
    clients.delete(clientId);
    return false;
  }
}

export function getClientCount(): number {
  return clients.size;
}
