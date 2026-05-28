import { getDb } from '../client';
import { tasks } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertTaskInput, UpdateTaskInput } from '../validation/tasks';

export async function getTasks(orgId: string, limit?: number, offset?: number) {
  const db = getDb();
  const query = db.select().from(tasks).where(withTenant(tasks, orgId)).orderBy(desc(tasks.createdAt));
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

export async function getTaskById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(tasks).where(
    withTenant(tasks, orgId, eq(tasks.id, id))
  );
  return rows[0] ?? null;
}

export async function createTask(orgId: string, data: InsertTaskInput) {
  const db = getDb();
  const rows = await db.insert(tasks).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create task');
  }
  return inserted;
}

export async function updateTask(orgId: string, id: string, data: UpdateTaskInput) {
  const db = getDb();
  const rows = await db.update(tasks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(tasks, orgId, eq(tasks.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTask(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'tasks',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(tasks).where(
        withTenant(tasks, orgId, eq(tasks.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(tasks).where(
        withTenant(tasks, orgId, eq(tasks.id, id))
      );
    },
    reason
  );
}
