// =============================================================================
// RAVENCRY API — Operator Routes
// POST /api/ops/alerts/:id/approve  — Approve and broadcast (race-guarded)
// POST /api/ops/alerts/:id/suppress — Suppress a false/duplicate alert
// PATCH /api/ops/cases/:id           — Update case status/details
// GET  /api/ops/queue                — Pending review queue (paginated)
// POST /api/auth/login               — Operator login (returns JWT)
// =============================================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type {
  ApproveAlertRequest,
  ApproveAlertResponse,
  SuppressAlertRequest,
  SuppressAlertResponse,
  UpdateCaseRequest,
  OpsQueueResponse,
  LoginRequest,
  LoginResponse,
  CaseDetailResponse,
  EvidenceReadResponse,
  EvidenceBriefResponse,
} from '../../../../packages/shared/src/types';
import { opsLimiter, authLimiter } from '../middleware/rateLimit';
import { requireAuth, requireRole, signToken } from '../middleware/auth';
import { badRequest, notFound, AppError } from '../middleware/errorHandler';
import { query } from '../db/pool';
import { broadcastSSE } from '../lib/sse-broadcast';
import { buildEvidenceLedger, EVIDENCE_CASE_ID_PATTERN } from '../lib/evidence-ledger';
import { generateEvidenceBrief } from '../lib/evidence-briefing';

const router = Router();

// =========================================================================
// POST /api/ops/alerts/:id/approve
// Race-condition guard: UPDATE ... WHERE status = 'pending' RETURNING *
// Only one operator can win the race.
// AUTO_APPROVE_FLASH env flag skips auth (demo/hackathon mode).
// =========================================================================
router.post(
  '/api/ops/alerts/:id/approve',
  opsLimiter,
  (req, res, next) => {
    // AUTO_APPROVE_FLASH bypasses auth for demo mode
    if (process.env.AUTO_APPROVE_FLASH === 'true') {
      next();
      return;
    }
    requireAuth(req, res, next);
  },
  async (req, res, next) => {
    try {
      const alertId = req.params.id;
      const body = req.body as Partial<ApproveAlertRequest>;
      const operatorId = req.operator?.sub ?? null;

      // ---- Race-condition guard: atomic UPDATE with WHERE status = 'pending' ----
      const result = await query<{
        id: string;
        case_id: string;
        tier: string;
        status: string;
      }>(
        `UPDATE alerts
         SET status = 'approved',
             approved_by = $2,
             approved_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING id, case_id, tier, status`,
        [alertId, operatorId],
      );

      if (result.rowCount === 0) {
        // Alert was already approved or suppressed by another operator
        // Check what state it's in
        const current = await query<{ status: string }>(
          'SELECT status FROM alerts WHERE id = $1',
          [alertId],
        );

        if (current.rowCount === 0) {
          throw notFound('alert', alertId);
        }

        throw new AppError(
          409,
          'alert_already_processed',
          'ERR_CONFLICT',
          { current_status: current.rows[0].status },
        );
      }

      const alert = result.rows[0];

      // ---- Update the case status to active ----
      await query(
        `UPDATE cases SET status = 'active', alert_tier = $2, updated_at = NOW()
         WHERE id = $1`,
        [alert.case_id, alert.tier],
      );

      // ---- Trigger n8n WF-02 FLASH Broadcast workflow ----
      // Fire-and-forget: don't block the HTTP response on n8n completion.
      // n8n URL — use Docker service name in compose, or host.docker.internal locally.
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_BASE_URL
        ? `${process.env.N8N_WEBHOOK_BASE_URL}/webhook/flash-broadcast`
        : 'http://n8n:5678/webhook/flash-broadcast';
      const n8nSecret = process.env.N8N_WEBHOOK_SECRET || '';

      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': n8nSecret,
        },
        body: JSON.stringify({
          case_id: alert.case_id,
          alert_id: alert.id,
          tier: alert.tier,
          auto_approved: process.env.AUTO_APPROVE_FLASH === 'true',
          approved_by: operatorId,
          approved_at: new Date().toISOString(),
        }),
        // Abort after 90s — broadcast must complete within the target window
        signal: AbortSignal.timeout(90_000),
      })
        .then(async (n8nRes) => {
          if (!n8nRes.ok) {
            console.error(
              `[approve] n8n WF-02 returned ${n8nRes.status}: ${await n8nRes.text().catch(() => '')}`,
            );
          } else {
            const body = await n8nRes.json().catch(() => ({}));
            console.log(
              `[approve] n8n WF-02 completed for ${alert.case_id}: ${JSON.stringify(body)}`,
            );
          }
        })
        .catch((err) => {
          console.error(`[approve] n8n WF-02 call failed: ${err.message}`);
        });

      // ---- Auto-approve FLASH: update alerts immediately ----
      if (alert.tier === 'FLASH' || process.env.AUTO_APPROVE_FLASH === 'true') {
        // NOTE: n8n WF-02 will re-update this row with final counts.
        // This is an optimistic pre-update so the ops dashboard sees movement.
        await query(
          `UPDATE alerts
           SET status = 'broadcast', channels = $2
           WHERE id = $1`,
          [alertId, ['telegram', 'sms', 'push', 'naptip']],
        );

        // Broadcast SSE event to all connected clients
        broadcastSSE({
          type: 'new_alert',
          payload: { case_id: alert.case_id, tier: alert.tier },
        });

        res.json({
          status: 'broadcast_initiated',
          broadcast_eta_seconds: 90,
        } satisfies ApproveAlertResponse);
        return;
      }

      res.json({
        status: 'broadcast_initiated',
        broadcast_eta_seconds: 10,
      } satisfies ApproveAlertResponse);
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// POST /api/ops/alerts/:id/suppress
// Suppress a false/duplicate alert. Requires senior_moderator+ role.
// =========================================================================
router.post(
  '/api/ops/alerts/:id/suppress',
  opsLimiter,
  (req, res, next) => {
    // AUTO_APPROVE_FLASH bypasses auth for demo mode
    if (process.env.AUTO_APPROVE_FLASH === 'true') {
      next();
      return;
    }
    requireAuth(req, res, next);
  },
  (req, res, next) => {
    if (process.env.AUTO_APPROVE_FLASH === 'true') {
      next();
      return;
    }
    requireRole('senior_moderator', 'admin')(req, res, next);
  },
  async (req, res, next) => {
    try {
      const alertId = req.params.id;
      const body = req.body as SuppressAlertRequest;

      if (!body.reason || body.reason.trim().length === 0) {
        throw badRequest('missing_required_fields', ['reason']);
      }

      const result = await query(
        `UPDATE alerts
         SET status = 'suppressed',
             suppressed_by = $2,
             suppression_reason = $3
         WHERE id = $1 AND status IN ('pending', 'approved')
         RETURNING id`,
        [alertId, req.operator?.sub ?? null, body.reason],
      );

      if (result.rowCount === 0) {
        const current = await query<{ status: string }>(
          'SELECT status FROM alerts WHERE id = $1',
          [alertId],
        );
        if (current.rowCount === 0) {
          throw notFound('alert', alertId);
        }
        throw new AppError(
          409,
          'alert_already_processed',
          'ERR_CONFLICT',
          { current_status: current.rows[0].status },
        );
      }

      res.json({
        status: 'suppressed',
      } satisfies SuppressAlertResponse);
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// PATCH /api/ops/cases/:id — Update case status/details
// =========================================================================
router.patch(
  '/api/ops/cases/:id',
  opsLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      const caseId = req.params.id;
      const body = req.body as UpdateCaseRequest;

      if (!body.status && !body.resolution_notes) {
        throw badRequest('no_fields_to_update');
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      if (body.status) {
        updates.push(`status = $${paramIdx++}`);
        values.push(body.status);
      }
      if (body.resolution_notes) {
        updates.push(`resolution_notes = $${paramIdx++}`);
        values.push(body.resolution_notes);
      }

      updates.push(`updated_at = NOW()`);
      values.push(caseId);

      const result = await query(
        `UPDATE cases
         SET ${updates.join(', ')}
         WHERE id = $${paramIdx}
         RETURNING id, status`,
        values,
      );

      if (result.rowCount === 0) {
        throw notFound('case', caseId);
      }

      res.json({ updated: true, status: result.rows[0].status });
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// GET /api/ops/queue — Paginated pending review queue
// Query: tier?, status?, page? (default 1), limit? (default 20)
// =========================================================================
router.get(
  '/api/ops/queue',
  opsLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || '20', 10)),
      );
      const offset = (page - 1) * limit;
      const tierFilter = req.query.tier as string;
      const statusFilter = req.query.status as string;

      let whereClauses = ['c.status != $1'];
      const params: unknown[] = ['resolved']; // skip resolved cases by default
      let paramIdx = 2;

      if (statusFilter) {
        whereClauses.push(`c.status = $${paramIdx++}`);
        params.push(statusFilter);
      }
      if (tierFilter) {
        whereClauses.push(`c.alert_tier = $${paramIdx++}`);
        params.push(tierFilter);
      }

      const whereSQL = whereClauses.join(' AND ');

      // Count total
      const countResult = await query<{ total: string }>(
        `SELECT COUNT(*)::int AS total
         FROM cases c
         WHERE ${whereSQL}`,
        params,
      );

      // Fetch page
      params.push(limit, offset);
      const result = await query<CaseDetailResponse>(
        `SELECT
          c.id AS case_id,
          p.full_name AS person_name,
          p.age_estimate,
          p.gender::text,
          c.last_seen_location,
          c.last_seen_time,
          p.photo_s3_key AS photo_url,
          c.status::text,
          c.alert_tier::text,
          c.circumstance::text,
          (SELECT COUNT(*) FROM sightings s WHERE s.case_id = c.id)::int AS sightings_count,
          c.created_at::text
        FROM cases c
        JOIN persons p ON c.person_id = p.id
        WHERE ${whereSQL}
        ORDER BY
          CASE c.alert_tier WHEN 'FLASH' THEN 0 WHEN 'PRIORITY' THEN 1 ELSE 2 END,
          c.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx}
        `,
        params,
      );

      res.json({
        cases: result.rows,
        total: parseInt(countResult.rows[0]?.total ?? '0', 10),
        page,
      } satisfies OpsQueueResponse);
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// GET /api/ops/cases/:id/evidence — Aggregated source ledger for the Desk
// Reuses AUTO_APPROVE_FLASH bypass; otherwise requires JWT.
// =========================================================================
router.get(
  '/api/ops/cases/:id/evidence',
  opsLimiter,
  (req, res, next) => {
    if (process.env.AUTO_APPROVE_FLASH === 'true') {
      next();
      return;
    }
    requireAuth(req, res, next);
  },
  async (req, res, next) => {
    try {
      const caseId = req.params.id;

      if (!EVIDENCE_CASE_ID_PATTERN.test(caseId)) {
        throw badRequest('invalid_case_id_format');
      }

      const response: EvidenceReadResponse = await buildEvidenceLedger(caseId);
      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// POST /api/ops/cases/:id/brief — GPT-structured evidence briefing
// Reuses AUTO_APPROVE_FLASH bypass; otherwise requires JWT.
// =========================================================================
router.post(
  '/api/ops/cases/:id/brief',
  opsLimiter,
  (req, res, next) => {
    if (process.env.AUTO_APPROVE_FLASH === 'true') {
      next();
      return;
    }
    requireAuth(req, res, next);
  },
  async (req, res, next) => {
    try {
      const caseId = req.params.id;

      if (!EVIDENCE_CASE_ID_PATTERN.test(caseId)) {
        throw badRequest('invalid_case_id_format');
      }

      // Build the live ledger from real database records
      const ledger = await buildEvidenceLedger(caseId);

      // Generate the GPT-structured brief
      const brief: EvidenceBriefResponse = await generateEvidenceBrief(ledger);

      res.json(brief);
    } catch (err) {
      next(err);
    }
  },
);

// =========================================================================
// POST /api/auth/login — Operator login
// Rate limit: 5 per minute per IP
// =========================================================================
router.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const body = req.body as LoginRequest;

    if (!body.email || !body.password) {
      throw badRequest('missing_required_fields', ['email', 'password']);
    }

    // Find operator by email
    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      active: boolean;
    }>('SELECT id, email, password_hash, full_name, role, active FROM operators WHERE email = $1', [
      body.email,
    ]);

    if (result.rowCount === 0) {
      res.status(401).json({
        error: 'invalid_credentials',
        code: 'ERR_AUTH_INVALID',
      });
      return;
    }

    const op = result.rows[0];

    if (!op.active) {
      res.status(403).json({
        error: 'account_deactivated',
        code: 'ERR_AUTH_FORBIDDEN',
      });
      return;
    }

    // Verify password
    const valid = await bcrypt.compare(body.password, op.password_hash);
    if (!valid) {
      res.status(401).json({
        error: 'invalid_credentials',
        code: 'ERR_AUTH_INVALID',
      });
      return;
    }

    // Update last login
    await query('UPDATE operators SET last_login_at = NOW() WHERE id = $1', [op.id]);

    // Generate JWT
    const token = signToken({
      id: op.id,
      email: op.email,
      role: op.role as LoginResponse['operator']['role'],
      name: op.full_name,
    });

    res.json({
      token,
      operator: {
        id: op.id,
        name: op.full_name,
        role: op.role as LoginResponse['operator']['role'],
      },
    } satisfies LoginResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
