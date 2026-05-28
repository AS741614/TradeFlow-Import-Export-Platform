import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { sanitizeDbError, handleRouteError } from '../db/error-sanitizer';

// Silence console.error logs in test output
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Error Sanitizer Tests', () => {
  it('should preserve Unauthorized error status and message', async () => {
    const error = new Error('Unauthorized');
    const sanitized = sanitizeDbError(error);
    expect(sanitized.status).toBe(401);
    expect(sanitized.message).toBe('Unauthorized');

    const res = handleRouteError(error);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('should map unique constraint violation (code 23505) to 409 Conflict', () => {
    const error = { code: '23505' };
    const sanitized = sanitizeDbError(error);
    expect(sanitized.status).toBe(409);
    expect(sanitized.message).toBe('This record already exists');
  });

  it('should map foreign key violation (code 23503) to 400 Bad Request', () => {
    const error = { driverError: { code: '23503' } };
    const sanitized = sanitizeDbError(error);
    expect(sanitized.status).toBe(400);
    expect(sanitized.message).toBe('Referenced item not found');
  });

  it('should map not null violation (code 23502) to 400 Bad Request', () => {
    const error = { code: '23502' };
    const sanitized = sanitizeDbError(error);
    expect(sanitized.status).toBe(400);
    expect(sanitized.message).toBe('Required field missing');
  });

  it('should map unknown errors to 500 Internal Server Error', () => {
    const error = new Error('Some database internal failed');
    const sanitized = sanitizeDbError(error);
    expect(sanitized.status).toBe(500);
    expect(sanitized.message).toBe('Internal server error');
  });
});
