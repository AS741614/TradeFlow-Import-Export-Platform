import { getDb } from '../client';
import { complianceItems } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertComplianceInput, UpdateComplianceInput } from '../validation/compliance';

export async function getComplianceItems(orgId: string) {
  const db = getDb();
  return db.select().from(complianceItems).where(withTenant(complianceItems, orgId));
}

export async function getComplianceItemById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(complianceItems).where(
    withTenant(complianceItems, orgId, eq(complianceItems.id, id))
  );
  return rows[0] ?? null;
}

export async function createComplianceItem(orgId: string, data: InsertComplianceInput) {
  const db = getDb();
  const rows = await db.insert(complianceItems).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create compliance item');
  }
  return inserted;
}

export async function updateComplianceItem(orgId: string, id: string, data: UpdateComplianceInput) {
  const db = getDb();
  const rows = await db.update(complianceItems)
    .set(data)
    .where(withTenant(complianceItems, orgId, eq(complianceItems.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteComplianceItem(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'compliance_items',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(complianceItems).where(
        withTenant(complianceItems, orgId, eq(complianceItems.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(complianceItems).where(
        withTenant(complianceItems, orgId, eq(complianceItems.id, id))
      );
    },
    reason
  );
}
