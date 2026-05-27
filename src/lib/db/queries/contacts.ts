import { getDb } from '../client';
import { contacts } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertContactInput, UpdateContactInput } from '../validation/contacts';

export async function getContacts(orgId: string) {
  const db = getDb();
  return db.select().from(contacts).where(withTenant(contacts, orgId));
}

export async function getContactById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(contacts).where(
    withTenant(contacts, orgId, eq(contacts.id, id))
  );
  return rows[0] ?? null;
}

export async function createContact(orgId: string, data: InsertContactInput) {
  const db = getDb();
  const rows = await db.insert(contacts).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create contact');
  }
  return inserted;
}

export async function updateContact(orgId: string, id: string, data: UpdateContactInput) {
  const db = getDb();
  const rows = await db.update(contacts)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(contacts, orgId, eq(contacts.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteContact(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'contacts',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(contacts).where(
        withTenant(contacts, orgId, eq(contacts.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(contacts).where(
        withTenant(contacts, orgId, eq(contacts.id, id))
      );
    },
    reason
  );
}
