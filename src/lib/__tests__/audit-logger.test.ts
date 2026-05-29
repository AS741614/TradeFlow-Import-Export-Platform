import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeForAudit, capChangeSummary, getDiff, logActivity } from '../audit-logger';
import { getDb } from '../db/client';

vi.mock('../db/client', () => {
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockImplementation(() => Promise.resolve()),
  });
  return {
    getDb: vi.fn().mockReturnValue({
      insert: mockInsert,
    }),
  };
});

describe('Audit Logger Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeForAudit', () => {
    it('should drop keys containing password, token, or secret (case-insensitive)', () => {
      const data = {
        id: '123',
        password: 'admin',
        passwordHash: 'hash123',
        secret_key: 'topsecret',
        apiToken: 'token123',
        safeField: 'hello',
      };
      const sanitized = sanitizeForAudit(data) as Record<string, unknown>;
      expect(sanitized.id).toBe('123');
      expect(sanitized.safeField).toBe('hello');
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.secret_key).toBeUndefined();
      expect(sanitized.apiToken).toBeUndefined();
    });

    it('should truncate string fields exceeding 1KB (1024 characters)', () => {
      const longString = 'a'.repeat(2000);
      const data = {
        short: 'hello',
        long: longString,
      };
      const sanitized = sanitizeForAudit(data) as { short: string; long: string };
      expect(sanitized.short).toBe('hello');
      expect(sanitized.long.length).toBe(1024 + '...(truncated)'.length);
      expect(sanitized.long).toContain('...(truncated)');
    });

    it('should recursively sanitize nested arrays and objects', () => {
      const data = {
        nested: {
          secret: 'shh',
          safe: 'yes',
        },
        items: [
          { token: 'xyz', safe: 'no-secret' },
        ],
      };
      const sanitized = sanitizeForAudit(data) as {
        nested: { secret?: string; safe: string };
        items: { token?: string; safe: string }[];
      };
      expect(sanitized.nested.secret).toBeUndefined();
      expect(sanitized.nested.safe).toBe('yes');
      const item0 = sanitized.items[0];
      expect(item0).toBeDefined();
      if (item0) {
        expect(item0.token).toBeUndefined();
        expect(item0.safe).toBe('no-secret');
      }
    });
  });

  describe('capChangeSummary', () => {
    it('should preserve summaries under 5KB', () => {
      const summary = { snapshot: { key: 'value' } };
      const capped = capChangeSummary(summary);
      expect(capped).toEqual(summary);
    });

    it('should replace snapshots exceeding 5KB with a generic message', () => {
      const massiveData = { text: 'a'.repeat(6000) };
      const summary = { snapshot: massiveData };
      const capped = capChangeSummary(summary);
      expect('snapshot' in capped).toBe(true);
      if ('snapshot' in capped) {
        expect(capped.snapshot.message).toContain('exceeded 5KB limit');
      }
    });

    it('should replace before/after updates exceeding 5KB with a generic message', () => {
      const massiveData = { text: 'a'.repeat(6000) };
      const summary = { before: massiveData, after: massiveData, changedFields: ['text'] };
      const capped = capChangeSummary(summary);
      expect('before' in capped).toBe(true);
      if ('before' in capped) {
        expect(capped.before.message).toContain('exceeded 5KB limit');
        expect(capped.after.message).toContain('exceeded 5KB limit');
      }
    });
  });

  describe('getDiff', () => {
    it('should compute flat difference between objects, ignoring updatedAt/createdAt', () => {
      const before = {
        id: '1',
        title: 'Old Title',
        notes: 'same notes',
        createdAt: '2026-05-01',
      };
      const after = {
        id: '1',
        title: 'New Title',
        notes: 'same notes',
        updatedAt: '2026-05-29',
      };

      const diff = getDiff(before, after);
      expect(diff.changedFields).toEqual(['title']);
      expect(diff.before).toEqual({ title: 'Old Title' });
      expect(diff.after).toEqual({ title: 'New Title' });
    });

    it('should compare nested objects by stringified value', () => {
      const before = { tags: ['a', 'b'] };
      const after = { tags: ['a', 'b', 'c'] };

      const diff = getDiff(before, after);
      expect(diff.changedFields).toEqual(['tags']);
      expect(diff.before.tags).toEqual(['a', 'b']);
      expect(diff.after.tags).toEqual(['a', 'b', 'c']);
    });
  });

  describe('logActivity', () => {
    it('should call database insert and not throw on successful query', async () => {
      const options = {
        orgId: 'org123',
        userId: 'user123',
        entityType: 'contact',
        entityId: 'contact123',
        action: 'created',
        changeSummary: { created: { name: 'Alice' } },
      };

      const db = getDb();
      const insertSpy = vi.spyOn(db, 'insert');
      await expect(logActivity(options)).resolves.not.toThrow();
      expect(insertSpy).toHaveBeenCalled();
    });

    it('should catch database errors, print to console.error, and not throw', async () => {
      const db = getDb();
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('Database down');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const options = {
        orgId: 'org123',
        userId: 'user123',
        entityType: 'contact',
        entityId: 'contact123',
        action: 'created',
        changeSummary: { created: { name: 'Alice' } },
      };

      await expect(logActivity(options)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Audit Log Failure]:'), expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
