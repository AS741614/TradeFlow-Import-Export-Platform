/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession, throwIfNotAuthenticated } from '../auth-server';
import { auth } from '../auth';

vi.mock('../auth', () => ({
  auth: vi.fn(),
}));

describe('auth-server helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServerSession', () => {
    it('should return null if there is no session', async () => {
      vi.mocked(auth as any).mockResolvedValue(null);
      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('should return null if session has no user id', async () => {
      vi.mocked(auth as any).mockResolvedValue({ user: {} });
      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('should return null if session user has no orgId', async () => {
      vi.mocked(auth as any).mockResolvedValue({
        user: { id: 'user-1' },
      });
      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('should return session details if user id and orgId are present', async () => {
      vi.mocked(auth as any).mockResolvedValue({
        user: {
          id: 'user-1',
          orgId: 'org-1',
          role: 'owner',
        },
      } as any);
      const session = await getServerSession();
      expect(session).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'owner',
      });
    });

    it('should default role to "user" if not present in session user', async () => {
      vi.mocked(auth as any).mockResolvedValue({
        user: {
          id: 'user-1',
          orgId: 'org-1',
        },
      } as any);
      const session = await getServerSession();
      expect(session).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'user',
      });
    });
  });

  describe('throwIfNotAuthenticated', () => {
    it('should throw an error if not authenticated', async () => {
      vi.mocked(auth as any).mockResolvedValue(null);
      await expect(throwIfNotAuthenticated()).rejects.toThrow('Unauthorized');
    });

    it('should return session details if authenticated', async () => {
      vi.mocked(auth as any).mockResolvedValue({
        user: {
          id: 'user-1',
          orgId: 'org-1',
          role: 'admin',
        },
      } as any);
      const result = await throwIfNotAuthenticated();
      expect(result).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'admin',
      });
    });
  });
});
