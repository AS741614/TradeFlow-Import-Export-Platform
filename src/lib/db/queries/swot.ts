import { getDb } from '../client';
import { swotItems } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertSwotInput, UpdateSwotInput } from '../validation/swot';

export async function getSwotItems(orgId: string) {
  const db = getDb();
  return db.select().from(swotItems).where(withTenant(swotItems, orgId));
}

export async function getSwotItemById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(swotItems).where(
    withTenant(swotItems, orgId, eq(swotItems.id, id))
  );
  return rows[0] ?? null;
}

export async function createSwotItem(orgId: string, data: InsertSwotInput) {
  const db = getDb();
  const rows = await db.insert(swotItems).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create SWOT item');
  }
  return inserted;
}

export async function updateSwotItem(orgId: string, id: string, data: UpdateSwotInput) {
  const db = getDb();
  const rows = await db.update(swotItems)
    .set(data)
    .where(withTenant(swotItems, orgId, eq(swotItems.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteSwotItem(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'swot_items',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(swotItems).where(
        withTenant(swotItems, orgId, eq(swotItems.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(swotItems).where(
        withTenant(swotItems, orgId, eq(swotItems.id, id))
      );
    },
    reason
  );
}
