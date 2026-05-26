import { getDb } from '../client';
import { products } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import { DEFAULT_ORG_ID } from '../constants';
import type { InsertProductInput, UpdateProductInput } from '../validation/products';

export async function getProducts() {
  const db = getDb();
  return db.select().from(products).where(withTenant(products));
}

export async function getProductById(id: string) {
  const db = getDb();
  const rows = await db.select().from(products).where(
    withTenant(products, eq(products.id, id))
  );
  return rows[0] ?? null;
}

export async function createProduct(data: InsertProductInput) {
  const db = getDb();
  const rows = await db.insert(products).values({
    ...data,
    orgId: DEFAULT_ORG_ID,
  }).returning();
  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create product');
  }
  return inserted;
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  const db = getDb();
  const rows = await db.update(products)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(withTenant(products, eq(products.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteProduct(id: string, reason?: string) {
  return deleteWithLog(
    'products',
    id,
    async (tx) => {
      const rows = await tx.select().from(products).where(
        withTenant(products, eq(products.id, id))
      );
      return rows[0] ?? null;
    },
    async (tx) => {
      await tx.delete(products).where(
        withTenant(products, eq(products.id, id))
      );
    },
    reason
  );
}
