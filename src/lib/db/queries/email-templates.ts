import { getDb } from '../client';
import { emailTemplates } from '../schema';
import { eq, desc, and, SQL } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertEmailTemplateInput, UpdateEmailTemplateInput } from '../validation/email-templates';

export async function getEmailTemplates(orgId: string, limit?: number, offset?: number, where?: SQL, orderBy?: SQL) {
  const db = getDb();
  let conditions = withTenant(emailTemplates, orgId);
  if (where) {
    const merged = and(conditions, where);
    if (merged) {
      conditions = merged;
    }
  }
  const query = db.select().from(emailTemplates).where(conditions);
  if (orderBy) {
    query.orderBy(orderBy);
  } else {
    query.orderBy(desc(emailTemplates.createdAt));
  }
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

export async function getEmailTemplateById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(emailTemplates).where(
    withTenant(emailTemplates, orgId, eq(emailTemplates.id, id))
  );
  return rows[0] ?? null;
}

export async function createEmailTemplate(orgId: string, data: InsertEmailTemplateInput) {
  const db = getDb();
  const rows = await db.insert(emailTemplates).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create email template');
  }
  return inserted;
}

export async function updateEmailTemplate(orgId: string, id: string, data: UpdateEmailTemplateInput) {
  const db = getDb();
  const rows = await db.update(emailTemplates)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(emailTemplates, orgId, eq(emailTemplates.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteEmailTemplate(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'email_templates',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(emailTemplates).where(
        withTenant(emailTemplates, orgId, eq(emailTemplates.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(emailTemplates).where(
        withTenant(emailTemplates, orgId, eq(emailTemplates.id, id))
      );
    },
    reason
  );
}
