import { eq, and, SQL } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import { getDb } from '../client';
import { deletionLogs } from '../schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '../constants';

interface HasOrgId {
  orgId: PgColumn;
}

export type TxClient = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Wraps a database condition to automatically enforce the DEFAULT_ORG_ID multi-tenancy constraint.
 */
export function withTenant(table: HasOrgId, condition?: SQL): SQL {
  const tenantFilter = eq(table.orgId, DEFAULT_ORG_ID);
  return and(tenantFilter, condition) ?? tenantFilter;
}

/**
 * Helper to perform a hard delete inside a transaction, writing a snapshot to deletion_logs first.
 */
export async function deleteWithLog<T>(
  tableName: string,
  recordId: string,
  selectQuery: (tx: TxClient) => Promise<T | null | undefined>,
  deleteQuery: (tx: TxClient) => Promise<unknown>,
  reason?: string
): Promise<T | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const data = await selectQuery(tx);
    if (data === null || data === undefined) return null;

    await tx.insert(deletionLogs).values({
      tableName,
      recordId,
      deletedData: data,
      deletedByUserId: DEFAULT_USER_ID,
      reason: reason ?? null,
    });

    await deleteQuery(tx);
    return data;
  });
}
