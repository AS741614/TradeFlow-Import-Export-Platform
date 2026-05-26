import { getDb } from '../client';
import { contacts } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertContactInput, UpdateContactInput } from '../validation/contacts';

export async function getContacts() {
  const db = getDb();
  return db.select().from(contacts).where(withTenant(contacts));
}

export async function getContactById(id: string) {
  const db = getDb();
  const rows = await db.select().from(contacts).where(
    withTenant(contacts, eq(contacts.id, id))
  );
  return rows[0] ?? null;
}

export async function createContact(data: InsertContactInput) {
  const db = getDb();
  const rows = await db.insert(contacts).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create contact');
  }
  return inserted;
}

export async function updateContact(id: string, data: UpdateContactInput) {
  const db = getDb();
  const rows = await db.update(contacts)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(contacts, eq(contacts.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteContact(id: string, reason?: string) {
  return deleteWithLog(
    'contacts',
    id,
    async (tx) => {
      const rows = await tx.select().from(contacts).where(
        withTenant(contacts, eq(contacts.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(contacts).where(
        withTenant(contacts, eq(contacts.id, id))
      );
    },
    reason
  );
}
