import { NextRequest, NextResponse } from 'next/server';

interface RateLimitData {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private cache = new Map<string, RateLimitData>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start background cleanup to prevent memory leaks (only if in a context where setInterval is defined)
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => this.cleanup(), 60000);
      this.cleanupInterval = interval;
      // Unref the interval if available so Node doesn't hang in tests
      if (typeof interval.unref === 'function') {
        interval.unref();
      }
    }
  }

  /**
   * Checks if a client IP is allowed to perform an action.
   * Short-circuits (always returns allowed: true) if process.env.NODE_ENV === 'test'
   * or process.env.DISABLE_RATE_LIMIT === 'true'.
   */
  check(ip: string, action: string, options: { limit: number; windowMs: number }) {
    // Adjustment 1: Test bypass
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
      return { allowed: true, count: 0, resetAt: Date.now(), retryAfterSeconds: 0 };
    }

    const key = `${action}:${ip}`;
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now > entry.resetAt) {
      const newEntry = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      this.cache.set(key, newEntry);
      return { allowed: true, count: 1, resetAt: newEntry.resetAt, retryAfterSeconds: 0 };
    }

    if (entry.count >= options.limit) {
      const retryAfterSeconds = (entry.resetAt - now) / 1000;
      return { allowed: false, count: entry.count, resetAt: entry.resetAt, retryAfterSeconds };
    }

    entry.count += 1;
    return { allowed: true, count: entry.count, resetAt: entry.resetAt, retryAfterSeconds: 0 };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.resetAt) {
        this.cache.delete(key);
      }
    }
  }

  resetAll() {
    this.cache.clear();
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Route handler decorator wrapper for rate limiting.
 */
export function withRateLimit(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<Response> | Response,
  options: { keyPrefix: string; limit: number; windowMs: number; onlyMethods?: string[] }
) {
  return async function (req: NextRequest, ...args: unknown[]) {
    const method = req.method;
    if (options.onlyMethods && !options.onlyMethods.includes(method)) {
      return handler(req, ...args);
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const reqIp = (req as unknown as Record<string, unknown>).ip;
    const ip = forwarded ?? (typeof reqIp === 'string' ? reqIp : undefined) ?? '127.0.0.1';
    const clientIp = (ip.split(',')[0] ?? '127.0.0.1').trim();

    const limitResult = rateLimiter.check(clientIp, options.keyPrefix, {
      limit: options.limit,
      windowMs: options.windowMs,
    });

    if (!limitResult.allowed) {
      const retryAfter = Math.ceil(limitResult.retryAfterSeconds);
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'Content-Type': 'text/plain',
        },
      });
    }

    return handler(req, ...args);
  };
}
