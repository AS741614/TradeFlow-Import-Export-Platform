import { getDb } from '../client';
import { appMetadata } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getAppMetadataValue(orgId: string, key: string) {
  const db = getDb();
  const rows = await db.select().from(appMetadata).where(
    and(
      eq(appMetadata.orgId, orgId),
      eq(appMetadata.key, key)
    )
  );
  return rows[0] ?? null;
}

export async function setAppMetadataValue(orgId: string, key: string, value: string) {
  const db = getDb();
  const rows = await db.insert(appMetadata).values({
    orgId,
    key,
    value,
    updatedAt: new Date().toISOString(),
  })
  .onConflictDoUpdate({
    target: [appMetadata.orgId, appMetadata.key],
    set: {
      value,
      updatedAt: new Date().toISOString(),
    }
  })
  .returning();
  return rows[0] ?? null;
}

export async function deleteAppMetadataValue(orgId: string, key: string) {
  const db = getDb();
  await db.delete(appMetadata).where(
    and(
      eq(appMetadata.orgId, orgId),
      eq(appMetadata.key, key)
    )
  );
}
