import { getDb } from '../client';
import { outreachContacts } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertOutreachContactInput, UpdateOutreachContactInput } from '../validation/outreach-contacts';

export async function getOutreachContacts(orgId: string, limit?: number, offset?: number) {
  const db = getDb();
  const query = db.select().from(outreachContacts).where(withTenant(outreachContacts, orgId)).orderBy(desc(outreachContacts.importedAt));
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

export async function getOutreachContactById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(outreachContacts).where(
    withTenant(outreachContacts, orgId, eq(outreachContacts.id, id))
  );
  return rows[0] ?? null;
}

export async function createOutreachContact(orgId: string, data: InsertOutreachContactInput) {
  const db = getDb();
  const rows = await db.insert(outreachContacts).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create outreach contact');
  }
  return inserted;
}

export async function updateOutreachContact(orgId: string, id: string, data: UpdateOutreachContactInput) {
  const db = getDb();
  const rows = await db.update(outreachContacts)
    .set(data)
    .where(withTenant(outreachContacts, orgId, eq(outreachContacts.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOutreachContact(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'outreach_contacts',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(outreachContacts).where(
        withTenant(outreachContacts, orgId, eq(outreachContacts.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(outreachContacts).where(
        withTenant(outreachContacts, orgId, eq(outreachContacts.id, id))
      );
    },
    reason
  );
}
