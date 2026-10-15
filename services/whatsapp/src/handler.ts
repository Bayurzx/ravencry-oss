/**
 * RAVENCRY WhatsApp Bot Handler
 *
 * Receives Meta WhatsApp Cloud API webhooks, parses inbound messages,
 * and forwards structured payloads to n8n WF-01 for processing.
 *
 * NOTE: Africa's Talking does NOT offer WhatsApp in sandbox.
 * This uses Meta Cloud API (free tier: 1,000 conversations/month).
 *
 * Message flow:
 *   Meta webhook → switch(message.type) →
 *     text     → POST to n8n WF-01 with { text, phone }
 *     audio    → POST to n8n WF-01 with { audio_id, phone }
 *     image    → POST to n8n WF-01 with { image_id, caption, phone }
 *     location → POST to n8n WF-01 with { lat, lon, phone }
 *
 * ENV:
 *   META_WHATSAPP_TOKEN         - System User access token
 *   META_PHONE_NUMBER_ID        - Phone Number ID from API Setup
 *   META_WEBHOOK_VERIFY_TOKEN   - Verify token set in Meta dashboard
 *   META_WHATSAPP_API_VERSION   - e.g. v21.0
 *   N8N_WF01_WEBHOOK_URL        - n8n WF-01 webhook URL
 *   N8N_WEBHOOK_SECRET          - shared auth secret
 */

import type { Request, Response } from 'express';

// --- Env ---

const META_TOKEN = process.env.META_WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_WHATSAPP_API_VERSION || 'v21.0';
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
const N8N_URL =
  process.env.N8N_WF01_WEBHOOK_URL ||
  'http://localhost:5678/webhook/whatsapp-intake';
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

// --- Types ---

interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'location' | 'button' | 'interactive';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

interface N8NPayload {
  channel: 'whatsapp';
  phone: string;
  message_id: string;
  timestamp: string;
  message_type: string;
  text?: string;
  audio_id?: string;
  audio_mime?: string;
  image_id?: string;
  image_mime?: string;
  image_caption?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
}

// --- Meta webhook verification (GET) ---
// Called once when you configure the webhook in the Meta dashboard.

export function handleVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[whatsapp] Webhook verified');
    res.status(200).send(String(challenge));
    return;
  }
  res.status(403).json({ error: 'verification_failed' });
}

// --- Meta webhook event handler (POST) ---

export function handleWebhook(req: Request, res: Response): void {
  const entries: any[] = req.body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages: MetaMessage[] = value.messages || [];

      for (const msg of messages) {
        const payload = buildPayload(msg);
        forwardToN8N(payload).catch(err =>
          console.error('[whatsapp] n8n forward failed:', err.message),
        );
      }
    }
  }

  // Always 200 OK — Meta retries on error
  res.status(200).json({ status: 'received' });
}

// --- Build structured payload ---

function buildPayload(msg: MetaMessage): N8NPayload {
  const base: N8NPayload = {
    channel: 'whatsapp',
    phone: msg.from,
    message_id: msg.id,
    timestamp: msg.timestamp,
    message_type: msg.type,
  };

  switch (msg.type) {
    case 'text':
      base.text = msg.text?.body || '';
      break;
    case 'audio':
      base.audio_id = msg.audio?.id;
      base.audio_mime = msg.audio?.mime_type;
      break;
    case 'image':
      base.image_id = msg.image?.id;
      base.image_mime = msg.image?.mime_type;
      base.image_caption = msg.image?.caption;
      if (msg.image?.caption) base.text = msg.image.caption;
      break;
    case 'location':
      base.latitude = msg.location?.latitude;
      base.longitude = msg.location?.longitude;
      base.location_name = msg.location?.name;
      break;
  }

  return base;
}

// --- Forward to n8n ---

async function forwardToN8N(payload: N8NPayload): Promise<void> {
  const body = JSON.stringify(payload);

  const res = await fetch(N8N_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_SECRET ? { 'X-Webhook-Secret': N8N_SECRET } : {}),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`n8n responded ${res.status}: ${await res.text()}`);
  }

  console.log(
    `[whatsapp] ${payload.message_type} from ${payload.phone} → n8n OK`,
  );
}

// --- Send WhatsApp reply (called by n8n) ---

export async function sendReply(phone: string, text: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    },
  );

  if (!res.ok) {
    console.error('[whatsapp] Reply failed:', await res.text());
    return;
  }
  console.log(`[whatsapp] Reply sent to ${phone}`);
}
