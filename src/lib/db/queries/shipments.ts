import { getDb } from '../client';
import { shipments, shipmentProducts, shipmentDocuments, products } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { TxClient } from './base';
import type { InsertShipmentInput, UpdateShipmentInput } from '../validation/shipments';

export async function getShipments(orgId: string) {
  const db = getDb();
  
  // 1. Fetch shipments
  const shipmentRows = await db.select().from(shipments).where(withTenant(shipments, orgId));
  
  // 2. Fetch products and documents for each shipment
  const result = [];
  for (const shipment of shipmentRows) {
    const productsList = await db
      .select({
        productId: shipmentProducts.productId,
        productName: products.name,
        quantity: shipmentProducts.quantity,
      })
      .from(shipmentProducts)
      .leftJoin(products, eq(shipmentProducts.productId, products.id))
      .where(eq(shipmentProducts.shipmentId, shipment.id));

    const documentsList = await db
      .select()
      .from(shipmentDocuments)
      .where(eq(shipmentDocuments.shipmentId, shipment.id));

    result.push({
      ...shipment,
      products: productsList,
      documents: documentsList,
    });
  }
  
  return result;
}

export async function getShipmentById(orgId: string, id: string, tx?: TxClient) {
  const client = tx ?? getDb();
  const rows = await client.select().from(shipments).where(
    withTenant(shipments, orgId, eq(shipments.id, id))
  );
  const shipment = rows[0];
  if (!shipment) return null;

  const productsList = await client
    .select({
      productId: shipmentProducts.productId,
      productName: products.name,
      quantity: shipmentProducts.quantity,
    })
    .from(shipmentProducts)
    .leftJoin(products, eq(shipmentProducts.productId, products.id))
    .where(eq(shipmentProducts.shipmentId, shipment.id));

  const documentsList = await client
    .select()
    .from(shipmentDocuments)
    .where(eq(shipmentDocuments.shipmentId, shipment.id));

  return {
    ...shipment,
    products: productsList,
    documents: documentsList,
  };
}

export async function createShipment(orgId: string, data: InsertShipmentInput) {
  const db = getDb();
  const { products: productsData, documents: documentsData, ...shipmentFields } = data;

  return db.transaction(async (tx: TxClient) => {
    // 1. Insert shipment
    const shipmentResult = await tx.insert(shipments).values({
      ...shipmentFields,
      orgId,
    }).returning();
    const shipment = shipmentResult[0];
    if (!shipment) {
      throw new Error('Failed to create shipment');
    }

    // 2. Insert shipment products
    const insertedProducts = [];
    if (productsData.length > 0) {
      const pRows = await tx.insert(shipmentProducts).values(
        productsData.map(p => ({
          shipmentId: shipment.id,
          productId: p.productId,
          quantity: p.quantity,
        }))
      ).returning();
      
      // Map names for return payload
      for (const pr of pRows) {
        const [prod] = await tx.select().from(products).where(eq(products.id, pr.productId));
        insertedProducts.push({
          productId: pr.productId,
          productName: prod?.name ?? '',
          quantity: pr.quantity,
        });
      }
    }

    // 3. Insert shipment documents
    const insertedDocs = [];
    if (documentsData.length > 0) {
      const dRows = await tx.insert(shipmentDocuments).values(
        documentsData.map(d => ({
          shipmentId: shipment.id,
          name: d.name,
          type: d.type,
          status: d.status,
          uploadedAt: d.uploadedAt ?? null,
        }))
      ).returning();
      insertedDocs.push(...dRows);
    }

    return {
      ...shipment,
      products: insertedProducts,
      documents: insertedDocs,
    };
  });
}

export async function updateShipment(orgId: string, id: string, data: UpdateShipmentInput) {
  const db = getDb();
  const { products: productsData, documents: documentsData, ...shipmentFields } = data;

  return db.transaction(async (tx: TxClient) => {
    // 1. Update shipment parameters
    const shipmentResult = await tx.update(shipments)
      .set({
        ...shipmentFields,
        updatedAt: new Date().toISOString(),
      })
      .where(withTenant(shipments, orgId, eq(shipments.id, id)))
      .returning();
    const shipment = shipmentResult[0];

    if (!shipment) return null;

    // 2. Update products if provided in payload
    if (productsData !== undefined) {
      await tx.delete(shipmentProducts).where(eq(shipmentProducts.shipmentId, id));
      if (productsData.length > 0) {
        await tx.insert(shipmentProducts).values(
          productsData.map(p => ({
            shipmentId: id,
            productId: p.productId,
            quantity: p.quantity,
          }))
        );
      }
    }

    // 3. Update documents if provided in payload
    if (documentsData !== undefined) {
      await tx.delete(shipmentDocuments).where(eq(shipmentDocuments.shipmentId, id));
      if (documentsData.length > 0) {
        await tx.insert(shipmentDocuments).values(
          documentsData.map(d => ({
            shipmentId: id,
            name: d.name,
            type: d.type,
            status: d.status,
            uploadedAt: d.uploadedAt ?? null,
          }))
        );
      }
    }

    // Fetch the final updated nested record using tx
    const updated = await getShipmentById(orgId, id, tx);
    return updated;
  });
}

export async function deleteShipment(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'shipments',
    id,
    userId,
    async (tx: TxClient) => {
      // Get the complete nested shipment structure
      const shipment = await getShipmentById(orgId, id, tx);
      return shipment;
    },
    async (tx: TxClient) => {
      // Cascade delete handles shipment_products and shipment_documents
      await tx.delete(shipments).where(
        withTenant(shipments, orgId, eq(shipments.id, id))
      );
    },
    reason
  );
}
