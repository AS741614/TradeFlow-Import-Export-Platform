import { getDb } from '../client';
import { appMetadata } from '../schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_ORG_ID } from '../constants';

export async function getAppMetadataValue(key: string) {
  const db = getDb();
  const rows = await db.select().from(appMetadata).where(
    and(
      eq(appMetadata.orgId, DEFAULT_ORG_ID),
      eq(appMetadata.key, key)
    )
  );
  return rows[0] ?? null;
}

export async function setAppMetadataValue(key: string, value: string) {
  const db = getDb();
  const rows = await db.insert(appMetadata).values({
    orgId: DEFAULT_ORG_ID,
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

export async function deleteAppMetadataValue(key: string) {
  const db = getDb();
  await db.delete(appMetadata).where(
    and(
      eq(appMetadata.orgId, DEFAULT_ORG_ID),
      eq(appMetadata.key, key)
    )
  );
}
