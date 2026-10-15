// =============================================================================
// RAVENCRY API — Rate Limiting Middleware
// NFR-005: Per-endpoint and global rate limits.
// =============================================================================

import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — applied to all routes.
 * 100 requests per minute per IP.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
  },
});

/**
 * Strict limiter for report creation — 3 per 15 minutes per IP.
 * Prevents spam submissions to /api/reports.
 */
export const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
    details: 'Max 3 reports per 15 minutes',
  },
});

/**
 * Limiter for sightings — 10 per minute per IP.
 */
export const sightingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
  },
});

/**
 * SSE connection limiter — 10 connections per minute per IP.
 * Prevents connection exhaustion.
 */
export const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
  },
});

/**
 * Auth endpoint limiter — 5 login attempts per minute.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
    details: 'Too many login attempts. Try again in 1 minute.',
  },
});

/**
 * Operator endpoint limiter — 60 requests per minute per IP.
 */
export const opsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    code: 'ERR_RATE_LIMIT',
  },
});
