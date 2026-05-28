import { getDb } from '../client';
import { products } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { InsertProductInput, UpdateProductInput } from '../validation/products';

export async function getProducts(orgId: string, limit?: number, offset?: number) {
  const db = getDb();
  const query = db.select().from(products).where(withTenant(products, orgId)).orderBy(desc(products.createdAt));
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

export async function getProductById(orgId: string, id: string) {
  const db = getDb();
  const rows = await db.select().from(products).where(
    withTenant(products, orgId, eq(products.id, id))
  );
  return rows[0] ?? null;
}

export async function createProduct(orgId: string, data: InsertProductInput) {
  const db = getDb();
  const rows = await db.insert(products).values({
    ...data,
    orgId,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create product');
  }
  return inserted;
}

export async function updateProduct(orgId: string, id: string, data: UpdateProductInput) {
  const db = getDb();
  const rows = await db.update(products)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(products, orgId, eq(products.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProduct(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'products',
    id,
    userId,
    async (tx) => {
      const rows = await tx.select().from(products).where(
        withTenant(products, orgId, eq(products.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(products).where(
        withTenant(products, orgId, eq(products.id, id))
      );
    },
    reason
  );
}
