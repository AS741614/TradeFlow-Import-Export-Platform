import { getDb } from '../client';
import { tasks } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertTaskInput, UpdateTaskInput } from '../validation/tasks';

export async function getTasks() {
  const db = getDb();
  return db.select().from(tasks).where(withTenant(tasks));
}

export async function getTaskById(id: string) {
  const db = getDb();
  const rows = await db.select().from(tasks).where(
    withTenant(tasks, eq(tasks.id, id))
  );
  return rows[0] ?? null;
}

export async function createTask(data: InsertTaskInput) {
  const db = getDb();
  const rows = await db.insert(tasks).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create task');
  }
  return inserted;
}

export async function updateTask(id: string, data: UpdateTaskInput) {
  const db = getDb();
  const rows = await db.update(tasks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(tasks, eq(tasks.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTask(id: string, reason?: string) {
  return deleteWithLog(
    'tasks',
    id,
    async (tx) => {
      const rows = await tx.select().from(tasks).where(
        withTenant(tasks, eq(tasks.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(tasks).where(
        withTenant(tasks, eq(tasks.id, id))
      );
    },
    reason
  );
}
