import { getDb } from '../client';
import { shipments, shipmentProducts, shipmentDocuments, products } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { TxClient } from './base';
import type { InsertShipmentInput, UpdateShipmentInput } from '../validation/shipments';

export interface ShipmentProductInfo {
  productId: string;
  productName: string;
  quantity: number;
}

export type GroupedShipment = typeof shipments.$inferSelect & {
  products: ShipmentProductInfo[];
  documents: (typeof shipmentDocuments.$inferSelect)[];
};

export async function getShipments(orgId: string, limit?: number, offset?: number): Promise<GroupedShipment[]> {
  const db = getDb();
  
  const baseSubquery = db
    .select({ id: shipments.id })
    .from(shipments)
    .where(withTenant(shipments, orgId))
    .orderBy(desc(shipments.createdAt));

  let idsTable;
  if (limit !== undefined && offset !== undefined) {
    idsTable = baseSubquery.limit(limit).offset(offset).as('ids');
  } else if (limit !== undefined) {
    idsTable = baseSubquery.limit(limit).as('ids');
  } else if (offset !== undefined) {
    idsTable = baseSubquery.offset(offset).as('ids');
  } else {
    idsTable = baseSubquery.as('ids');
  }

  // 2. Fetch shipments, products, and documents in a single query
  const rows = await db
    .select({
      shipment: shipments,
      shipmentProduct: {
        productId: shipmentProducts.productId,
        productName: products.name,
        quantity: shipmentProducts.quantity,
      },
      document: shipmentDocuments,
    })
    .from(shipments)
    .innerJoin(idsTable, eq(shipments.id, idsTable.id))
    .leftJoin(shipmentProducts, eq(shipments.id, shipmentProducts.shipmentId))
    .leftJoin(products, eq(shipmentProducts.productId, products.id))
    .leftJoin(shipmentDocuments, eq(shipments.id, shipmentDocuments.shipmentId))
    .orderBy(desc(shipments.createdAt));

  // 3. Group the results in memory, maintaining ordering and deduplicating
  const shipmentMap = new Map<string, GroupedShipment>();
  const orderedIds: string[] = [];

  for (const row of rows) {
    const shId = row.shipment.id;
    let current = shipmentMap.get(shId);
    if (!current) {
      orderedIds.push(shId);
      current = {
        ...row.shipment,
        products: [],
        documents: [],
      };
      shipmentMap.set(shId, current);
    }

    // Deduplicate products
    const sp = row.shipmentProduct;
    if (sp.productId !== null && sp.productName !== null && sp.quantity !== null) {
      const prodId = sp.productId;
      const prodName = sp.productName;
      const qty = sp.quantity;
      const prodExists = current.products.some(
        (p) => p.productId === prodId
      );
      if (!prodExists) {
        current.products.push({
          productId: prodId,
          productName: prodName,
          quantity: qty,
        });
      }
    }

    // Deduplicate documents
    const doc = row.document;
    if (doc?.id) {
      const docId = doc.id;
      const docExists = current.documents.some(
        (d) => d.id === docId
      );
      if (!docExists) {
        current.documents.push(doc);
      }
    }
  }

  return orderedIds.map(id => {
    const sh = shipmentMap.get(id);
    if (!sh) throw new Error('Assertion failed: shipment not found in map');
    return sh;
  });
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
