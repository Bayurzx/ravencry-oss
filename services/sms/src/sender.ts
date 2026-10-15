/**
 * RAVENCRY SMS Sender — Africa's Talking SDK Wrapper
 *
 * Handles batch SMS delivery via Africa's Talking REST API.
 * Splits large recipient lists into batches of 100 (AT limit).
 * Fails gracefully — individual batch failure does not block remaining batches.
 *
 * AT Sandbox: SMS are NOT actually delivered to real phones.
 * Delivery verified in the AT Dashboard (simulator).
 *
 * ENV:
 *   AT_API_KEY             - API key from AT console (bare Node: read directly)
 *   AT_USERNAME            - Username, "sandbox" for test environment
 *   AFRICASTALKING_API_KEY  - Canonical name (Docker: mapped from AT_API_KEY)
 *   AFRICASTALKING_USERNAME - Canonical name (Docker: mapped from AT_USERNAME)
 *   AT_SENDER_ID            - Sender ID (default: "RAVENCRY")
 */

import AfricasTalking from 'africastalking';
import { formatAlert, type AlertCase } from './templates';

// ---- Types ----------------------------------------------------------------

export interface SMSBatchResult {
  /** Number of recipients in this batch */
  batch_size: number;
  /** Delivery status */
  status: 'sent' | 'failed';
  /** AT API response (on success) */
  response?: SMSResponse;
  /** Error message (on failure) */
  error?: string;
  /** Timestamp */
  sent_at: string;
}

export interface SMSResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      status: string;
      cost: string;
      messageId: string;
    }>;
  };
}

export interface BroadcastRequest {
  /** Recipient phone numbers (international format: +234...) */
  phones: string[];
  /** Case data for message formatting */
  case: AlertCase;
  /** Override default sender ID */
  sender_id?: string;
  /** Override auto-formatted message */
  message?: string;
}

export interface BroadcastResult {
  /** Total recipients attempted */
  total_phones: number;
  /** Total batches processed */
  total_batches: number;
  /** Successful batches */
  successful_batches: number;
  /** Failed batches */
  failed_batches: number;
  /** Per-batch results */
  batches: SMSBatchResult[];
  /** Whether all batches succeeded */
  all_succeeded: boolean;
}

// ---- Config ---------------------------------------------------------------

function getATClient() {
  // AFRIKASTALKING_* is the canonical container name (set by docker-compose mapping).
  // AT_* is the root .env name. When running bare Node (npm run dev),
  // docker-compose mapping isn't available, so fall back to AT_* vars.
  const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY || '';
  const username = process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME || 'sandbox';

  if (!apiKey) {
    throw new Error('AFRICASTALKING_API_KEY (or AT_API_KEY) not configured');
  }

  return AfricasTalking({ apiKey, username });
}

function getSenderId(): string {
  // AT sandbox rejects custom sender IDs — only "AFRICASTKNG" or a registered
  // shortcode works. Return empty in sandbox to let AT use their default.
  const isSandbox = (process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME || '') === 'sandbox';
  if (isSandbox) {
    const custom = process.env.AT_SENDER_ID || '';
    if (custom && custom !== 'AFRICASTKNG') {
      console.warn(`[sms] Sandbox mode: ignoring custom sender "${custom}" — using AT default (AFRICASTKNG)`);
    }
    return ''; // empty → AT uses "AFRICASTKNG" in sandbox
  }
  return process.env.AT_SENDER_ID || 'RAVENCRY';
}

// ---- Helpers --------------------------------------------------------------

/**
 * Split array into chunks of the given size.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ---- Send ----------------------------------------------------------------

/**
 * Send a single batch of SMS messages.
 *
 * @param phones  Up to 100 phone numbers
 * @param message SMS body text
 * @param senderId Originating sender ID
 */
async function sendBatch(
  phones: string[],
  message: string,
  senderId: string,
): Promise<SMSBatchResult> {
  const AT = getATClient();
  const sms = AT.SMS;

  try {
    // Build send options. Only include `from` in production (sandbox rejects custom sender IDs).
    const opts = {
      to: phones,
      message,
      enqueue: true,
    } as { to: string[]; message: string; enqueue: boolean; from?: string };
    if (senderId) {
      opts.from = senderId;
    }
    const response = (await sms.send(opts)) as unknown as SMSResponse;

    console.log(
      `[sms] Batch sent: ${phones.length} recipients, messageId=${response.SMSMessageData?.Message}`,
    );

    return {
      batch_size: phones.length,
      status: 'sent',
      response,
      sent_at: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[sms] Batch FAILED: ${phones.length} recipients, error=${errorMsg}`,
    );

    return {
      batch_size: phones.length,
      status: 'failed',
      error: errorMsg,
      sent_at: new Date().toISOString(),
    };
  }
}

/**
 * Send SMS broadcast to a list of phone numbers.
 *
 * Splits into batches of 100 per AT API limits.
 * Continues through all batches even if some fail.
 *
 * @returns BroadcastResult with per-batch details
 */
export async function sendSMSBroadcast(
  req: BroadcastRequest,
): Promise<BroadcastResult> {
  const { phones, message: overrideMsg, sender_id: overrideSender } = req;
  const message = overrideMsg || formatAlert(req.case);
  const senderId = overrideSender || getSenderId();

  // AT max recipients per call: 100
  const batches = chunkArray(phones, 100);

  console.log(
    `[sms] Starting broadcast: ${phones.length} phones → ${batches.length} batch(es), sender="${senderId}"`,
  );

  const batchResults: SMSBatchResult[] = [];
  for (const batch of batches) {
    const result = await sendBatch(batch, message, senderId);
    batchResults.push(result);
  }

  const successful = batchResults.filter((b) => b.status === 'sent').length;
  const failed = batchResults.filter((b) => b.status === 'failed').length;

  console.log(
    `[sms] Broadcast complete: ${successful}/${batches.length} batches OK, ${failed} failed`,
  );

  return {
    total_phones: phones.length,
    total_batches: batches.length,
    successful_batches: successful,
    failed_batches: failed,
    batches: batchResults,
    all_succeeded: failed === 0,
  };
}
