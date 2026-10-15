// =============================================================================
// RAVENCRY API — DynamoDB Helper
// Thin wrapper for DynamoDB operations (USSD sessions, sweep log, alert delivery).
// =============================================================================

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const SESSIONS_TABLE = 'ravencry-sessions';
const ALERTS_TABLE = 'ravencry-alerts';
const SWEEP_LOG_TABLE = 'ravencry-sweep-log';

export async function putSession(sessionKey: string, data: Record<string, unknown>, ttlSeconds = 300): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  await docClient.send(
    new PutCommand({
      TableName: SESSIONS_TABLE,
      Item: {
        session_key: sessionKey,
        ...data,
        expires_at: expiresAt,
      },
    }),
  );
}

export async function getSession<T = Record<string, unknown>>(sessionKey: string): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: SESSIONS_TABLE,
      Key: { session_key: sessionKey },
    }),
  );
  if (!result.Item) return null;

  // Check TTL
  if (result.Item.expires_at && result.Item.expires_at < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return result.Item as T;
}

export async function deleteSession(sessionKey: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: SESSIONS_TABLE,
      Key: { session_key: sessionKey },
    }),
  );
}

export async function putAlertLog(
  alertId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: ALERTS_TABLE,
      Item: {
        alert_id: alertId,
        created_at: new Date().toISOString(),
        ...data,
      },
    }),
  );
}

export async function putSweepLog(
  sweepId: string,
  data: Record<string, unknown>,
  ttlHours = 72,
): Promise<void> {
  const sweepTtl = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  await docClient.send(
    new PutCommand({
      TableName: SWEEP_LOG_TABLE,
      Item: {
        sweep_id: sweepId,
        swept_at: new Date().toISOString(),
        sweep_ttl: sweepTtl,
        ...data,
      },
    }),
  );
}

export { ALERTS_TABLE, SESSIONS_TABLE, SWEEP_LOG_TABLE };
