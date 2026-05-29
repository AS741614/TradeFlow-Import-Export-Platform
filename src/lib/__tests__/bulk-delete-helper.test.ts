import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeBulkDelete } from '../db/bulk-delete-helper';
import { logActivity } from '../audit-logger';

// Mock logActivity
vi.mock('../audit-logger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe('Bulk Delete Helper Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete all items and log activity', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ id: '1' });
    const ids = ['1', '2'];

    const result = await executeBulkDelete('org-1', 'user-1', ids, 'contact', mockDelete);

    expect(result.deleted).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenNthCalledWith(1, 'org-1', '1', 'user-1');
    expect(mockDelete).toHaveBeenNthCalledWith(2, 'org-1', '2', 'user-1');

    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith({
      orgId: 'org-1',
      userId: 'user-1',
      entityType: 'contact',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'bulk_deleted',
      changeSummary: {
        snapshot: {
          message: 'Successfully bulk deleted 2 contact records.',
          deletedCount: 2,
          deletedIds: ['1', '2'],
          failedCount: 0,
          failedIds: [],
        },
      },
    });
  });

  it('should handle some items not found gracefully', async () => {
    const mockDelete = vi.fn()
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce(null);

    const ids = ['1', '2'];

    const result = await executeBulkDelete('org-1', 'user-1', ids, 'contact', mockDelete);

    expect(result.deleted).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({ id: '2', error: 'Record not found or already deleted' });

    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith({
      orgId: 'org-1',
      userId: 'user-1',
      entityType: 'contact',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'bulk_deleted',
      changeSummary: {
        snapshot: {
          message: 'Successfully bulk deleted 1 contact records.',
          deletedCount: 1,
          deletedIds: ['1'],
          failedCount: 1,
          failedIds: ['2'],
        },
      },
    });
  });

  it('should handle database foreign key constraint violation (SQLSTATE 23503)', async () => {
    const dbError = new Error('delete fails on FK violation');
    Object.assign(dbError, { code: '23503' });

    const mockDelete = vi.fn()
      .mockResolvedValueOnce({ id: '1' })
      .mockRejectedValueOnce(dbError);

    const ids = ['1', '2'];

    const result = await executeBulkDelete('org-1', 'user-1', ids, 'contact', mockDelete);

    expect(result.deleted).toBe(1);
    expect(result.failed).toHaveLength(1);
    const failedItem = result.failed[0];
    expect(failedItem).toBeDefined();
    if (!failedItem) {
      throw new Error('failedItem is undefined');
    }
    expect(failedItem.id).toBe('2');
    expect(failedItem.error).toContain('Foreign key constraint violation');

    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith({
      orgId: 'org-1',
      userId: 'user-1',
      entityType: 'contact',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'bulk_deleted',
      changeSummary: {
        snapshot: {
          message: 'Successfully bulk deleted 1 contact records.',
          deletedCount: 1,
          deletedIds: ['1'],
          failedCount: 1,
          failedIds: ['2'],
        },
      },
    });
  });

  it('should handle other unexpected database errors', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Connection failure'));
    const ids = ['1'];

    const result = await executeBulkDelete('org-1', 'user-1', ids, 'contact', mockDelete);

    expect(result.deleted).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({ id: '1', error: 'Connection failure' });
    expect(logActivity).not.toHaveBeenCalled();
  });
});
