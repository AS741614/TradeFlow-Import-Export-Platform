import { getDb } from '../client';
import { costItems } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertCostItemInput, UpdateCostItemInput } from '../validation/cost-items';

export async function getCostItems(orgId: string, limit?: number, offset?: number) {
  const db = getDb();
  const query = db.select().from(costItems).where(withTenant(costItems, orgId)).orderBy(desc(costItems.id));
  if (limit !== undefined && offset !== undefined) {
    return query.limit(limit).offset(offset);
  }
  if (limit !== undefined) {
    return query.limit(limit);
  }
  if (offset !== undefined) {
    return query.offset(offset);
  }
  return query;
}

export async function getCostItemById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(costItems).where(
    withTenant(costItems, orgId, eq(costItems.id, id))
  );
  return rows[0] ?? null;
}

export async function createCostItem(orgId: string, data: InsertCostItemInput) {
  const db = getDb();
  const rows = await db.insert(costItems).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create cost item');
  }
  return inserted;
}

export async function updateCostItem(orgId: string, id: string, data: UpdateCostItemInput) {
  const db = getDb();
  const rows = await db.update(costItems)
    .set(data)
    .where(withTenant(costItems, orgId, eq(costItems.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCostItem(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'cost_items',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(costItems).where(
        withTenant(costItems, orgId, eq(costItems.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(costItems).where(
        withTenant(costItems, orgId, eq(costItems.id, id))
      );
    },
    reason
  );
}
