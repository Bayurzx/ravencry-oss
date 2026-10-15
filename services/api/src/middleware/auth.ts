// =============================================================================
// RAVENCRY API — Auth Middleware
// JWT-based operator authentication. RS256 with 8hr expiry.
// Citizens use optional phone OTP (validated in route handler).
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { OperatorRole, ApiError } from '../../../../packages/shared/src/types';

// In production, this is a public key. For hackathon, we use a shared secret.
const JWT_SECRET = process.env.JWT_SECRET || 'ravencry-hackathon-secret-change-me';

export interface OperatorPayload {
  sub: string; // operator UUID
  email: string;
  role: OperatorRole;
  name: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      operator?: OperatorPayload;
    }
  }
}

/**
 * Verify JWT from Authorization: Bearer <token> header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err: ApiError = {
      error: 'missing_authorization',
      code: 'ERR_AUTH_MISSING',
    };
    res.status(401).json(err);
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as OperatorPayload;
    req.operator = payload;
    next();
  } catch (e) {
    const err: ApiError = {
      error: 'invalid_token',
      code: 'ERR_AUTH_INVALID',
      details: e instanceof jwt.TokenExpiredError ? 'token_expired' : 'token_invalid',
    };
    res.status(401).json(err);
  }
}

/**
 * Require a minimum operator role.
 * Usage: app.post('/api/ops/alerts/:id/approve', requireAuth, requireRole('moderator'), handler)
 */
export function requireRole(...roles: OperatorRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.operator) {
      const err: ApiError = {
        error: 'missing_authorization',
        code: 'ERR_AUTH_MISSING',
      };
      res.status(401).json(err);
      return;
    }

    if (!roles.includes(req.operator.role)) {
      const err: ApiError = {
        error: 'insufficient_permissions',
        code: 'ERR_AUTH_FORBIDDEN',
        details: { required: roles, current: req.operator.role },
      };
      res.status(403).json(err);
      return;
    }

    next();
  };
}

/**
 * Generate a JWT for a successfully authenticated operator.
 */
export function signToken(operator: {
  id: string;
  email: string;
  role: OperatorRole;
  name: string;
}): string {
  return jwt.sign(
    {
      sub: operator.id,
      email: operator.email,
      role: operator.role,
      name: operator.name,
    },
    JWT_SECRET,
    { expiresIn: '8h' },
  );
}
