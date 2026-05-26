/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../shipments/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../shipments/[id]/route';

describe('Shipments API Integration Tests', () => {
  const db = getDb();
  let testProductId: string;

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.shipmentProducts);
    await db.delete(dbSchema.shipmentDocuments);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

    // Seed default org and user
    await db.insert(dbSchema.orgs).values({
      id: DEFAULT_ORG_ID,
      name: 'Test Org',
      country: 'Canada',
    });
    await db.insert(dbSchema.users).values({
      id: DEFAULT_USER_ID,
      email: 'test@example.com',
      displayName: 'Test User',
      orgId: DEFAULT_ORG_ID,
      role: 'owner',
    });

    const productsResult = await db.insert(dbSchema.products).values({
      orgId: DEFAULT_ORG_ID,
      name: 'Shipment Item',
      sku: 'SKU-SHIP',
      hsCode: '9999.99.99',
      category: 'General',
      quantity: 500,
      reorderLevel: 50,
      unitCost: 1000,
      currency: 'USD',
      supplier: 'Any Supplier',
      origin: 'Canada',
      status: 'in-stock',
    }).returning();
    const p = productsResult[0]!;
    testProductId = p.id;
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.shipmentProducts);
    await db.delete(dbSchema.shipmentDocuments);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should return an empty list initially', async () => {
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a shipment with products and documents', async () => {
    const payload = {
      reference: 'SHIP-2026-001',
      origin: 'Vancouver, CA',
      destination: 'Tokyo, JP',
      carrier: 'Ocean Express',
      status: 'ordered',
      estimatedArrival: '2026-06-15',
      products: [
        {
          productId: testProductId,
          quantity: 150,
        },
      ],
      documents: [
        {
          name: 'Commercial Invoice #100',
          type: 'commercial-invoice',
          status: 'submitted',
        },
      ],
    };

    const req = new NextRequest('http://localhost/api/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.reference).toBe('SHIP-2026-001');
    expect(body.data.products.length).toBe(1);
    expect(body.data.products[0].productId).toBe(testProductId);
    expect(body.data.products[0].productName).toBe('Shipment Item');
    expect(body.data.documents.length).toBe(1);
    expect(body.data.documents[0].name).toBe('Commercial Invoice #100');
  });

  it('should retrieve a single shipment with relations by id', async () => {
    const shipmentsResult = await db.insert(dbSchema.shipments).values({
      orgId: DEFAULT_ORG_ID,
      reference: 'SHIP-SINGLE',
      origin: 'Montreal, CA',
      destination: 'London, UK',
      carrier: 'Air Cargo',
      status: 'shipped',
      estimatedArrival: '2026-06-10',
    }).returning();
    const shipment = shipmentsResult[0]!;

    await db.insert(dbSchema.shipmentProducts).values({
      shipmentId: shipment.id,
      productId: testProductId,
      quantity: 80,
    });

    await db.insert(dbSchema.shipmentDocuments).values({
      shipmentId: shipment.id,
      name: 'Bill of Lading #12',
      type: 'bill-of-lading',
      status: 'approved',
    });

    const req = new NextRequest(`http://localhost/api/shipments/${shipment.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: shipment.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(shipment.id);
    expect(body.data.products.length).toBe(1);
    expect(body.data.products[0].productName).toBe('Shipment Item');
    expect(body.data.documents[0].name).toBe('Bill of Lading #12');
  });

  it('should patch update a shipment, replacing relations', async () => {
    const shipmentsResult = await db.insert(dbSchema.shipments).values({
      orgId: DEFAULT_ORG_ID,
      reference: 'SHIP-PATCH',
      origin: 'Montreal, CA',
      destination: 'London, UK',
      carrier: 'Air Cargo',
      status: 'in-transit',
      estimatedArrival: '2026-06-10',
    }).returning();
    const shipment = shipmentsResult[0]!;

    await db.insert(dbSchema.shipmentProducts).values({
      shipmentId: shipment.id,
      productId: testProductId,
      quantity: 50,
    });

    const payload = {
      carrier: 'Global Express',
      products: [], // clear products
      documents: [
        {
          name: 'Packing List File',
          type: 'packing-list',
          status: 'pending',
        },
      ],
    };

    const req = new NextRequest(`http://localhost/api/shipments/${shipment.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: shipment.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.carrier).toBe('Global Express');
    expect(body.data.products.length).toBe(0); // cleared
    expect(body.data.documents.length).toBe(1);
    expect(body.data.documents[0].name).toBe('Packing List File');
  });

  it('should delete a shipment and write full cascade snapshot to deletion_logs', async () => {
    const shipmentsResult = await db.insert(dbSchema.shipments).values({
      orgId: DEFAULT_ORG_ID,
      reference: 'SHIP-DELETE',
      origin: 'Halifax, CA',
      destination: 'Rotterdam, NL',
      carrier: 'Ocean Line',
      status: 'delivered',
      estimatedArrival: '2026-05-20',
    }).returning();
    const shipment = shipmentsResult[0]!;

    await db.insert(dbSchema.shipmentProducts).values({
      shipmentId: shipment.id,
      productId: testProductId,
      quantity: 200,
    });

    const req = new NextRequest(`http://localhost/api/shipments/${shipment.id}?reason=Cancelled`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: shipment.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(shipment.id);

    // Verify hard deletion of shipment and cascade of relations
    const fetchShipments = await db.select().from(dbSchema.shipments);
    expect(fetchShipments.length).toBe(0);
    const fetchProducts = await db.select().from(dbSchema.shipmentProducts);
    expect(fetchProducts.length).toBe(0);
    const fetchDocs = await db.select().from(dbSchema.shipmentDocuments);
    expect(fetchDocs.length).toBe(0);

    // Verify it is logged in deletion_logs (with nested products and docs snapshot!)
    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('shipments');
    expect(log.recordId).toBe(shipment.id);
    expect((log.deletedData as any).reference).toBe('SHIP-DELETE');
    expect((log.deletedData as any).products.length).toBe(1);
    expect((log.deletedData as any).products[0].quantity).toBe(200);
  });
});
