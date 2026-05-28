import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limiter';
import { NextRequest } from 'next/server';

describe('Rate Limiter Tests', () => {
  let limiter: RateLimiter;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDisableRateLimit = process.env.DISABLE_RATE_LIMIT;

  beforeEach(() => {
    limiter = new RateLimiter();
    // Revert to non-test behavior to test actual rate limiting mechanisms
    (process.env as any).NODE_ENV = 'production';
    delete process.env.DISABLE_RATE_LIMIT;
  });

  afterEach(() => {
    limiter.destroy();
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.DISABLE_RATE_LIMIT = originalDisableRateLimit;
  });

  it('should allow requests within limit boundaries', () => {
    const ip = '192.168.1.1';
    const action = 'login';
    const options = { limit: 3, windowMs: 10000 };

    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
  });

  it('should deny requests exceeding limit boundaries', () => {
    const ip = '192.168.1.2';
    const action = 'login';
    const options = { limit: 2, windowMs: 10000 };

    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
    
    const result = limiter.check(ip, action, options);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(10);
  });

  it('should reset limits after window duration expires', () => {
    const ip = '192.168.1.3';
    const action = 'login';
    const options = { limit: 1, windowMs: 100 };

    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(false);

    // Sleep for 150ms using synchronous blocking or mock timers
    const start = Date.now();
    while (Date.now() - start < 150) {}

    expect(limiter.check(ip, action, options).allowed).toBe(true);
  });

  // Adjustment 1: Test explicit bypass checks
  it('should short-circuit and allow requests always in test environments', () => {
    (process.env as any).NODE_ENV = 'test';
    const ip = '192.168.1.4';
    const action = 'login';
    const options = { limit: 1, windowMs: 10000 };

    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
  });

  it('should short-circuit and allow requests always if DISABLE_RATE_LIMIT is true', () => {
    process.env.DISABLE_RATE_LIMIT = 'true';
    const ip = '192.168.1.5';
    const action = 'login';
    const options = { limit: 1, windowMs: 10000 };

    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
    expect(limiter.check(ip, action, options).allowed).toBe(true);
  });
});
