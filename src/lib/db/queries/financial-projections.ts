import { getDb } from '../client';
import { financialProjections } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertFinancialProjectionInput, UpdateFinancialProjectionInput } from '../validation/financial-projections';

export async function getFinancialProjections() {
  const db = getDb();
  return db.select().from(financialProjections).where(withTenant(financialProjections));
}

export async function getFinancialProjectionById(id: string) {
  const db = getDb();
  const rows = await db.select().from(financialProjections).where(
    withTenant(financialProjections, eq(financialProjections.id, id))
  );
  return rows[0] ?? null;
}

export async function createFinancialProjection(data: InsertFinancialProjectionInput) {
  const db = getDb();
  const rows = await db.insert(financialProjections).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create financial projection');
  }
  return inserted;
}

export async function updateFinancialProjection(id: string, data: UpdateFinancialProjectionInput) {
  const db = getDb();
  const rows = await db.update(financialProjections)
    .set(data)
    .where(withTenant(financialProjections, eq(financialProjections.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteFinancialProjection(id: string, reason?: string) {
  return deleteWithLog(
    'financial_projections',
    id,
    async (tx) => {
      const rows = await tx.select().from(financialProjections).where(
        withTenant(financialProjections, eq(financialProjections.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(financialProjections).where(
        withTenant(financialProjections, eq(financialProjections.id, id))
      );
    },
    reason
  );
}
