// =============================================================================
// RAVENCRY API — Error Handler Middleware
// Consistent error format per NFR-012: { error, code, details? }
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../../../../packages/shared/src/types';

/**
 * Custom application error with HTTP status and machine-readable code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, error: string, code: string, details?: unknown) {
    super(error);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }

  toJSON(): ApiError {
    return {
      error: this.message,
      code: this.code,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

// ---- Convenience factory functions ----

export function notFound(resource: string, id?: string): AppError {
  return new AppError(
    404,
    'not_found',
    'ERR_NOT_FOUND',
    id ? { resource, id } : { resource },
  );
}

export function badRequest(message: string, fields?: string[]): AppError {
  return new AppError(
    400,
    message,
    'ERR_BAD_REQUEST',
    fields ? { fields } : undefined,
  );
}

export function rateLimited(resetAt: string): AppError {
  return new AppError(429, 'rate_limit_exceeded', 'ERR_RATE_LIMIT', {
    reset_at: resetAt,
  });
}

/**
 * Global Express error handler — catches thrown AppError instances
 * and unexpected errors. Always returns the consistent format.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Unexpected error — log full stack, return generic message
  console.error('🔴 Unhandled error:', err.stack ?? err.message);
  res.status(500).json({
    error: 'internal_server_error',
    code: 'ERR_INTERNAL',
  } satisfies ApiError);
}

/**
 * Catch-all for unmatched routes. Returns a proper 404.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'route_not_found',
    code: 'ERR_NOT_FOUND',
  } satisfies ApiError);
}
