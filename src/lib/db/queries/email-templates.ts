import { getDb } from '../client';
import { emailTemplates } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertEmailTemplateInput, UpdateEmailTemplateInput } from '../validation/email-templates';

export async function getEmailTemplates(orgId: string) {
  const db = getDb();
  return db.select().from(emailTemplates).where(withTenant(emailTemplates, orgId));
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
