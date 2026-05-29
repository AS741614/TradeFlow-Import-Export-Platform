import { logActivity } from '@/lib/audit-logger';

export interface BulkDeleteResult {
  deleted: number;
  failed: { id: string; error: string }[];
}

/**
 * Reusable handler for row-by-row deletions of records.
 * Scopes deletions, catches foreign-key violations, and logs a summary to the activity log.
 */
export async function executeBulkDelete(
  orgId: string,
  userId: string,
  ids: string[],
  entityType: string,
  deleteFn: (orgId: string, id: string, userId: string) => Promise<unknown>
): Promise<BulkDeleteResult> {
  let deletedCount = 0;
  const failed: { id: string; error: string }[] = [];
  const deletedIds: string[] = [];

  for (const id of ids) {
    try {
      const result = await deleteFn(orgId, id, userId);
      if (result !== null && result !== undefined) {
        deletedCount++;
        deletedIds.push(id);
      } else {
        failed.push({ id, error: 'Record not found or already deleted' });
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const code = (err as Record<string, unknown> | null)?.code;
      const codeStr = typeof code === 'string' ? code : '';
      const isFkViolation =
        codeStr === '23503' ||
        errorObj.message.includes('23503') ||
        errorObj.message.includes('foreign key constraint');

      if (isFkViolation) {
        failed.push({
          id,
          error: 'Foreign key constraint violation: Record is referenced by other items.',
        });
      } else {
        failed.push({
          id,
          error: errorObj.message,
        });
      }
    }
  }

  if (deletedCount > 0) {
    // Fire-and-forget logging
    logActivity({
      orgId,
      userId,
      entityType,
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'bulk_deleted',
      changeSummary: {
        snapshot: {
          message: `Successfully bulk deleted ${String(deletedCount)} ${entityType} records.`,
          deletedCount,
          deletedIds,
          failedCount: failed.length,
          failedIds: failed.map(f => f.id),
        },
      },
    }).catch((err: unknown) => {
      console.error('[Bulk Delete Audit Logging Failed]:', err);
    });
  }

  return {
    deleted: deletedCount,
    failed,
  };
}
