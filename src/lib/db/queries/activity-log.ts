import { getDb } from '../client';
import { activityLogs } from '../schema';
import { eq, and, gte, lte, desc, SQL, count } from 'drizzle-orm';
import { withTenant } from './base';

export interface ActivityLogFilters {
  entityType?: string | undefined;
  entityId?: string | undefined;
  userId?: string | undefined;
  action?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

function buildFilters(orgId: string, filters: ActivityLogFilters): SQL {
  let conditions: SQL = withTenant(activityLogs, orgId);

  const addCond = (newCond: SQL | undefined) => {
    if (newCond) {
      const merged = and(conditions, newCond);
      if (merged) {
        conditions = merged;
      }
    }
  };

  if (filters.entityType) {
    addCond(eq(activityLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    addCond(eq(activityLogs.entityId, filters.entityId));
  }
  if (filters.userId) {
    addCond(eq(activityLogs.userId, filters.userId));
  }
  if (filters.action) {
    addCond(eq(activityLogs.action, filters.action));
  }
  if (filters.startDate) {
    addCond(gte(activityLogs.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    addCond(lte(activityLogs.createdAt, filters.endDate));
  }

  return conditions;
}

export async function getActivityLogs(
  orgId: string,
  filters: ActivityLogFilters,
  limit = 50,
  offset = 0
) {
  const db = getDb();
  const conditions = buildFilters(orgId, filters);

  return db.select()
    .from(activityLogs)
    .where(conditions)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getActivityLogsCount(
  orgId: string,
  filters: ActivityLogFilters
): Promise<number> {
  const db = getDb();
  const conditions = buildFilters(orgId, filters);

  const result = await db.select({ count: count() })
    .from(activityLogs)
    .where(conditions);

  return result[0]?.count ?? 0;
}

export async function getActivityLogById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select()
    .from(activityLogs)
    .where(withTenant(activityLogs, orgId, eq(activityLogs.id, id)));

  return rows[0] ?? null;
}
