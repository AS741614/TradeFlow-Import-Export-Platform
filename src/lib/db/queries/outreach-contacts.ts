import { getDb } from '../client';
import { outreachContacts } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertOutreachContactInput, UpdateOutreachContactInput } from '../validation/outreach-contacts';

export async function getOutreachContacts() {
  const db = getDb();
  return db.select().from(outreachContacts).where(withTenant(outreachContacts));
}

export async function getOutreachContactById(id: string) {
  const db = getDb();
  const rows = await db.select().from(outreachContacts).where(
    withTenant(outreachContacts, eq(outreachContacts.id, id))
  );
  return rows[0] ?? null;
}

export async function createOutreachContact(data: InsertOutreachContactInput) {
  const db = getDb();
  const rows = await db.insert(outreachContacts).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create outreach contact');
  }
  return inserted;
}

export async function updateOutreachContact(id: string, data: UpdateOutreachContactInput) {
  const db = getDb();
  const rows = await db.update(outreachContacts)
    .set(data)
    .where(withTenant(outreachContacts, eq(outreachContacts.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOutreachContact(id: string, reason?: string) {
  return deleteWithLog(
    'outreach_contacts',
    id,
    async (tx) => {
      const rows = await tx.select().from(outreachContacts).where(
        withTenant(outreachContacts, eq(outreachContacts.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(outreachContacts).where(
        withTenant(outreachContacts, eq(outreachContacts.id, id))
      );
    },
    reason
  );
}
