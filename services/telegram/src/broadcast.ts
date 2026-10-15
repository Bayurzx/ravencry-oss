/**
 * RAVENCRY Telegram Broadcast
 *
 * Sends FLASH/PRIORITY alerts to Telegram channels:
 *   - Public alert channel (sendPhoto with caption)
 *   - Ops channel (text notification)
 *
 * Called by: n8n WF-02 FLASH Broadcast pipeline
 * Also exposes HTTP endpoint for API gateway / n8n to trigger.
 *
 * ENV:
 *   TELEGRAM_BOT_TOKEN          - Bot token from @BotFather
 *   TELEGRAM_ALERT_CHANNEL_ID   - Public alert channel ID (e.g. -100xxx)
 *   TELEGRAM_OPS_CHANNEL_ID     - Private ops channel ID (e.g. -100xxx)
 */

import {
  formatFlashAlert,
  formatFlashAlertPlain,
  formatPriorityAlert,
  formatOpsNotification,
  type AlertCase,
} from './templates';

// ---- Config ---------------------------------------------------------------

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function getAlertChannel(): string {
  return process.env.TELEGRAM_ALERT_CHANNEL_ID || '';
}

function getOpsChannel(): string {
  return process.env.TELEGRAM_OPS_CHANNEL_ID || '';
}

function getApiBase(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

// ---- Types ----------------------------------------------------------------

export interface BroadcastResult {
  channel: 'alert' | 'ops';
  success: boolean;
  message_id?: number;
  error?: string;
}

export interface FlashBroadcastResult {
  photo_sent: boolean;
  fallback_text_sent: boolean;
  ops_notified: boolean;
  alert_message_id?: number;
  ops_message_id?: number;
  error?: string;
}

// ---- Helpers --------------------------------------------------------------

async function telegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; result?: Record<string, unknown>; description?: string }> {
  const url = `${getApiBase()}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    ok: boolean;
    result?: Record<string, unknown>;
    description?: string;
  };
  return json;
}

// ---- Public Broadcast ------------------------------------------------------

/**
 * Send a FLASH alert to the public alert channel.
 *
 * Strategy:
 *   1. Try sendPhoto with MarkdownV2 caption (rich formatting)
 *   2. If photo fails (bad URL, timeout): fallback to sendMessage plain text
 *   3. If MarkdownV2 parse fails (malformed escape): retry as plain text
 *   4. Always notify ops channel on failure
 */
export async function sendFlashBroadcast(c: AlertCase): Promise<FlashBroadcastResult> {
  const result: FlashBroadcastResult = {
    photo_sent: false,
    fallback_text_sent: false,
    ops_notified: false,
  };

  // Step 1: Attempt sendPhoto with Markdown caption
  if (c.photo_url) {
    try {
      const photoRes = await telegramApi('sendPhoto', {
        chat_id: getAlertChannel(),
        photo: c.photo_url,
        caption: formatFlashAlert(c),
        parse_mode: 'MarkdownV2',
      });

      if (photoRes.ok) {
        result.photo_sent = true;
        result.alert_message_id = photoRes.result?.message_id as number;
        console.log(
          `[telegram-broadcast] FLASH photo sent to channel ${getAlertChannel()}, msg=${result.alert_message_id}`,
        );
      } else {
        // Check if parse error — retry without Markdown
        if (photoRes.description?.includes('parse')) {
          console.warn('[telegram-broadcast] MarkdownV2 parse error, retrying with plain text caption');
          const plainRes = await telegramApi('sendPhoto', {
            chat_id: getAlertChannel(),
            photo: c.photo_url,
            caption: formatFlashAlertPlain(c),
          });
          if (plainRes.ok) {
            result.photo_sent = true;
            result.alert_message_id = plainRes.result?.message_id as number;
          }
        }

        if (!result.photo_sent) {
          console.error(
            `[telegram-broadcast] sendPhoto failed: ${photoRes.description}`,
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[telegram-broadcast] sendPhoto error: ${msg}`);
    }
  }

  // Step 2: Fallback — send plain text if photo failed
  if (!result.photo_sent) {
    try {
      const textRes = await telegramApi('sendMessage', {
        chat_id: getAlertChannel(),
        text: formatFlashAlertPlain(c),
      });

      if (textRes.ok) {
        result.fallback_text_sent = true;
        result.alert_message_id = textRes.result?.message_id as number;
        console.log(
          `[telegram-broadcast] FLASH text sent (fallback), msg=${result.alert_message_id}`,
        );
      } else {
        result.error = `sendMessage failed: ${textRes.description}`;
        console.error(`[telegram-broadcast] ${result.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.error = `sendMessage error: ${msg}`;
      console.error(`[telegram-broadcast] ${result.error}`);
    }
  }

  // Step 3: Notify ops channel
  if (getOpsChannel()) {
    try {
      const opsRes = await telegramApi('sendMessage', {
        chat_id: getOpsChannel(),
        text: formatOpsNotification(c, 'FLASH_BROADCAST'),
        parse_mode: 'MarkdownV2',
      });

      if (opsRes.ok) {
        result.ops_notified = true;
        result.ops_message_id = opsRes.result?.message_id as number;
      } else if (opsRes.description?.includes('parse')) {
        // Fallback ops notification without Markdown
        const plainRes = await telegramApi('sendMessage', {
          chat_id: getOpsChannel(),
          text: `🛠️ OPS: FLASH BROADCAST for case ${c.case_id} (${c.person_name})`,
        });
        result.ops_notified = plainRes.ok;
        result.ops_message_id = plainRes.result?.message_id as number;
      }
    } catch (err: unknown) {
      console.error(
        `[telegram-broadcast] OPS notify error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const success = result.photo_sent || result.fallback_text_sent;
  console.log(
    `[telegram-broadcast] Result: photo=${result.photo_sent} text=${result.fallback_text_sent} ops=${result.ops_notified} success=${success}`,
  );

  return result;
}

/**
 * Send a PRIORITY alert to the public alert channel.
 * PRIORITY alerts are text-only (no photo).
 */
export async function sendPriorityBroadcast(c: AlertCase): Promise<BroadcastResult> {
  try {
    const res = await telegramApi('sendMessage', {
      chat_id: getAlertChannel(),
      text: formatPriorityAlert(c),
      parse_mode: 'MarkdownV2',
    });

    if (res.ok) {
      return {
        channel: 'alert',
        success: true,
        message_id: res.result?.message_id as number,
      };
    }

    // Parse error → retry plain text
    if (res.description?.includes('parse')) {
      const plainRes = await telegramApi('sendMessage', {
        chat_id: getAlertChannel(),
        text: `⚠️ PRIORITY ALERT: ${c.person_name} missing near ${c.last_seen_location || c.last_seen_lga || 'unknown location'}. Case ID: ${c.case_id}`,
      });
      return {
        channel: 'alert',
        success: plainRes.ok,
        message_id: plainRes.result?.message_id as number,
        error: plainRes.ok ? undefined : plainRes.description,
      };
    }

    return {
      channel: 'alert',
      success: false,
      error: res.description,
    };
  } catch (err: unknown) {
    return {
      channel: 'alert',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Send a notification to the ops channel.
 */
export async function sendOpsNotification(
  message: string,
  parseMode?: 'MarkdownV2' | 'HTML',
): Promise<BroadcastResult> {
  if (!getOpsChannel()) {
    return { channel: 'ops', success: false, error: 'OPS_CHANNEL not configured' };
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: getOpsChannel(),
      text: message,
    };
    if (parseMode) {
      body.parse_mode = parseMode;
    }

    const res = await telegramApi('sendMessage', body);

    if (res.ok) {
      return {
        channel: 'ops',
        success: true,
        message_id: res.result?.message_id as number,
      };
    }

    return {
      channel: 'ops',
      success: false,
      error: res.description,
    };
  } catch (err: unknown) {
    return {
      channel: 'ops',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
