/**
 * RAVENCRY USSD Service — DynamoDB Session & Rate Limiting
 *
 * Uses the shared `ravencry-sessions` DynamoDB table for USSD rate limiting.
 * Key format: `ussd-rl:{phone_hash}` with 24-hour TTL.
 *
 * USSD menu state is inherently managed by Africa's Talking text accumulation —
 * no separate session state store needed for the menu tree.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

// ── DynamoDB Client ─────────────────────────────────────────────────────────

let _docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      }),
    });
    _docClient = DynamoDBDocumentClient.from(client);
  }
  return _docClient;
}

const SESSIONS_TABLE = 'ravencry-sessions';
const RATE_LIMIT_PREFIX = 'ussd-rl:';
const DEFAULT_MAX_REPORTS = 3;
const TTL_24H_SECONDS = 86400;

// ── Types ───────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  session_key: string;
  report_count: number;
  first_report_at: string;
  expires_at: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  current_count: number;
  reset_at: string;
}

// ── Rate Limiting ───────────────────────────────────────────────────────────

/**
 * Check whether a phone (by hash) is allowed to submit another report.
 * Does NOT increment — call `incrementReportCount` after successful case creation.
 */
export async function checkRateLimit(phoneHash: string): Promise<RateLimitResult> {
  const maxReports = parseInt(process.env.USSD_MAX_REPORTS_PER_DAY || '', 10) || DEFAULT_MAX_REPORTS;
  const key = `${RATE_LIMIT_PREFIX}${phoneHash}`;

  try {
    const result = await getDocClient().send(
      new GetCommand({
        TableName: SESSIONS_TABLE,
        Key: { session_key: key },
      }),
    );

    if (!result.Item) {
      // No record — first report today
      return {
        allowed: true,
        remaining: maxReports,
        current_count: 0,
        reset_at: new Date(Date.now() + TTL_24H_SECONDS * 1000).toISOString(),
      };
    }

    const entry = result.Item as RateLimitEntry;

    // Check if TTL has expired (DynamoDB TTL deletion is eventual)
    if (entry.expires_at < Math.floor(Date.now() / 1000)) {
      return {
        allowed: true,
        remaining: maxReports,
        current_count: 0,
        reset_at: new Date(Date.now() + TTL_24H_SECONDS * 1000).toISOString(),
      };
    }

    const allowed = entry.report_count < maxReports;
    return {
      allowed,
      remaining: Math.max(0, maxReports - entry.report_count),
      current_count: entry.report_count,
      reset_at: new Date(entry.expires_at * 1000).toISOString(),
    };
  } catch (err) {
    // On DynamoDB errors, fail open — don't block reports due to infra issues
    console.error(`[ussd] Rate limit check failed for ${phoneHash}:`, err);
    return {
      allowed: true,
      remaining: maxReports,
      current_count: 0,
      reset_at: new Date(Date.now() + TTL_24H_SECONDS * 1000).toISOString(),
    };
  }
}

/**
 * Increment the report count for a phone hash after successful case creation.
 */
export async function incrementReportCount(phoneHash: string): Promise<void> {
  const key = `${RATE_LIMIT_PREFIX}${phoneHash}`;

  try {
    // Read current count
    const result = await getDocClient().send(
      new GetCommand({
        TableName: SESSIONS_TABLE,
        Key: { session_key: key },
      }),
    );

    const now = new Date();
    const expiresAt = Math.floor(now.getTime() / 1000) + TTL_24H_SECONDS;

    if (result.Item && result.Item.expires_at > Math.floor(Date.now() / 1000)) {
      // Existing valid entry — increment
      const entry = result.Item as RateLimitEntry;
      await getDocClient().send(
        new PutCommand({
          TableName: SESSIONS_TABLE,
          Item: {
            session_key: key,
            report_count: entry.report_count + 1,
            first_report_at: entry.first_report_at,
            expires_at: entry.expires_at, // keep original TTL
          },
        }),
      );
    } else {
      // New entry
      await getDocClient().send(
        new PutCommand({
          TableName: SESSIONS_TABLE,
          Item: {
            session_key: key,
            report_count: 1,
            first_report_at: now.toISOString(),
            expires_at: expiresAt,
          },
        }),
      );
    }
  } catch (err) {
    // Non-critical — log and continue
    console.error(`[ussd] Rate limit increment failed for ${phoneHash}:`, err);
  }
}

// ── Test Helpers ────────────────────────────────────────────────────────────

/**
 * Replace the DynamoDB document client (for testing).
 */
export function _setDocClientForTesting(client: DynamoDBDocumentClient | null): void {
  _docClient = client;
}
