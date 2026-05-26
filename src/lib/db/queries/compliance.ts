import { getDb } from '../client';
import { complianceItems } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertComplianceInput, UpdateComplianceInput } from '../validation/compliance';

export async function getComplianceItems() {
  const db = getDb();
  return db.select().from(complianceItems).where(withTenant(complianceItems));
}

export async function getComplianceItemById(id: string) {
  const db = getDb();
  const rows = await db.select().from(complianceItems).where(
    withTenant(complianceItems, eq(complianceItems.id, id))
  );
  return rows[0] ?? null;
}

export async function createComplianceItem(data: InsertComplianceInput) {
  const db = getDb();
  const rows = await db.insert(complianceItems).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create compliance item');
  }
  return inserted;
}

export async function updateComplianceItem(id: string, data: UpdateComplianceInput) {
  const db = getDb();
  const rows = await db.update(complianceItems)
    .set(data)
    .where(withTenant(complianceItems, eq(complianceItems.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteComplianceItem(id: string, reason?: string) {
  return deleteWithLog(
    'compliance_items',
    id,
    async (tx) => {
      const rows = await tx.select().from(complianceItems).where(
        withTenant(complianceItems, eq(complianceItems.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(complianceItems).where(
        withTenant(complianceItems, eq(complianceItems.id, id))
      );
    },
    reason
  );
}
