import { getDb } from '../client';
import { businessPlanSections } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertBusinessPlanInput, UpdateBusinessPlanInput } from '../validation/business-plan';

export async function getBusinessPlanSections() {
  const db = getDb();
  return db.select().from(businessPlanSections).where(withTenant(businessPlanSections));
}

export async function getBusinessPlanSectionById(id: string) {
  const db = getDb();
  const rows = await db.select().from(businessPlanSections).where(
    withTenant(businessPlanSections, eq(businessPlanSections.id, id))
  );
  return rows[0] ?? null;
}

export async function createBusinessPlanSection(data: InsertBusinessPlanInput) {
  const db = getDb();
  const rows = await db.insert(businessPlanSections).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create business plan section');
  }
  return inserted;
}

export async function updateBusinessPlanSection(id: string, data: UpdateBusinessPlanInput) {
  const db = getDb();
  const rows = await db.update(businessPlanSections)
    .set(data)
    .where(withTenant(businessPlanSections, eq(businessPlanSections.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteBusinessPlanSection(id: string, reason?: string) {
  return deleteWithLog(
    'business_plan_sections',
    id,
    async (tx) => {
      const rows = await tx.select().from(businessPlanSections).where(
        withTenant(businessPlanSections, eq(businessPlanSections.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(businessPlanSections).where(
        withTenant(businessPlanSections, eq(businessPlanSections.id, id))
      );
    },
    reason
  );
}
