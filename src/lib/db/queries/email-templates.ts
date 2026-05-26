import { getDb } from '../client';
import { emailTemplates } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertEmailTemplateInput, UpdateEmailTemplateInput } from '../validation/email-templates';

export async function getEmailTemplates() {
  const db = getDb();
  return db.select().from(emailTemplates).where(withTenant(emailTemplates));
}

export async function getEmailTemplateById(id: string) {
  const db = getDb();
  const rows = await db.select().from(emailTemplates).where(
    withTenant(emailTemplates, eq(emailTemplates.id, id))
  );
  return rows[0] ?? null;
}

export async function createEmailTemplate(data: InsertEmailTemplateInput) {
  const db = getDb();
  const rows = await db.insert(emailTemplates).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create email template');
  }
  return inserted;
}

export async function updateEmailTemplate(id: string, data: UpdateEmailTemplateInput) {
  const db = getDb();
  const rows = await db.update(emailTemplates)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(emailTemplates, eq(emailTemplates.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteEmailTemplate(id: string, reason?: string) {
  return deleteWithLog(
    'email_templates',
    id,
    async (tx) => {
      const rows = await tx.select().from(emailTemplates).where(
        withTenant(emailTemplates, eq(emailTemplates.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(emailTemplates).where(
        withTenant(emailTemplates, eq(emailTemplates.id, id))
      );
    },
    reason
  );
}
