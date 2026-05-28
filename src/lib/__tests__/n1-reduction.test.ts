import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getInvoices } from '../db/queries/invoices';
import { getShipments } from '../db/queries/shipments';
import { getDb, queryHistory, clearQueryHistory } from '../db/client';
import * as dbSchema from '../db/schema';
import { seedTestAuth, TEST_ORG_ID } from '../../app/api/__tests__/_helpers/auth-fixture';

describe('N+1 Query Reduction Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clean up relevant tables in dependency order
    await db.delete(dbSchema.invoiceLineItems);
    await db.delete(dbSchema.invoices);
    await db.delete(dbSchema.shipmentProducts);
    await db.delete(dbSchema.shipmentDocuments);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

    await seedTestAuth();
  });

  afterEach(async () => {
    // Clean up relevant tables in dependency order
    await db.delete(dbSchema.invoiceLineItems);
    await db.delete(dbSchema.invoices);
    await db.delete(dbSchema.shipmentProducts);
    await db.delete(dbSchema.shipmentDocuments);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
  });

  it('should fetch all invoices and their line items in a single query', async () => {
    // Create contact
    const [contact] = await db.insert(dbSchema.contacts).values({
      orgId: TEST_ORG_ID,
      company: 'Test Company',
      contactPerson: 'Alice',
      email: 'alice@test.com',
      phone: '123-456',
      country: 'US',
      type: 'buyer',
      status: 'active',
    }).returning();
    if (!contact) throw new Error('Seeding failed: contact is undefined');

    // Create 3 invoices
    for (let i = 0; i < 3; i++) {
      const [invoice] = await db.insert(dbSchema.invoices).values({
        orgId: TEST_ORG_ID,
        number: `INV-${String(i)}`,
        contactId: contact.id,
        currency: 'USD',
        subtotal: 1000,
        taxRate: 5,
        tax: 50,
        total: 1050,
        status: 'draft',
        issuedDate: '2026-05-28',
        dueDate: '2026-06-28',
      }).returning();
      if (!invoice) throw new Error('Seeding failed: invoice is undefined');

      // Create 2 line items per invoice
      await db.insert(dbSchema.invoiceLineItems).values([
        { invoiceId: invoice.id, description: 'Item 1', quantity: 1, unitPrice: 500, total: 500 },
        { invoiceId: invoice.id, description: 'Item 2', quantity: 1, unitPrice: 500, total: 500 },
      ]);
    }

    clearQueryHistory();

    const results = await getInvoices(TEST_ORG_ID);
    expect(results.length).toBe(3);
    const firstResult = results[0];
    expect(firstResult).toBeDefined();
    if (!firstResult) throw new Error('First result should be defined');
    expect(firstResult.lineItems.length).toBe(2);

    // We verify that exactly 1 query is executed
    expect(queryHistory.length).toBe(1);
  });

  it('should fetch all shipments and their products/documents in a single query', async () => {
    // Create product
    const [product] = await db.insert(dbSchema.products).values({
      orgId: TEST_ORG_ID,
      name: 'Test Product',
      sku: 'SKU-001',
      hsCode: '1234.56',
      category: 'Goods',
      quantity: 100,
      reorderLevel: 10,
      unitCost: 1000,
      currency: 'USD',
      supplier: 'Supplier Corp',
      origin: 'US',
      status: 'in-stock',
    }).returning();
    if (!product) throw new Error('Seeding failed: product is undefined');

    // Create 3 shipments
    for (let i = 0; i < 3; i++) {
      const [shipment] = await db.insert(dbSchema.shipments).values({
        orgId: TEST_ORG_ID,
        reference: `REF-${String(i)}`,
        origin: 'US',
        destination: 'CA',
        carrier: 'DHL',
        status: 'ordered',
        estimatedArrival: '2026-06-01',
      }).returning();
      if (!shipment) throw new Error('Seeding failed: shipment is undefined');

      // Add product
      await db.insert(dbSchema.shipmentProducts).values({
        shipmentId: shipment.id,
        productId: product.id,
        quantity: 5,
      });

      // Add document
      await db.insert(dbSchema.shipmentDocuments).values({
        shipmentId: shipment.id,
        name: `Doc-${String(i)}`,
        type: 'bill-of-lading',
        status: 'pending',
      });
    }

    clearQueryHistory();

    const results = await getShipments(TEST_ORG_ID);
    expect(results.length).toBe(3);
    const firstResult = results[0];
    expect(firstResult).toBeDefined();
    if (!firstResult) throw new Error('First result should be defined');
    expect(firstResult.products.length).toBe(1);
    expect(firstResult.documents.length).toBe(1);

    // We verify that exactly 1 query is executed
    expect(queryHistory.length).toBe(1);
  });
});
