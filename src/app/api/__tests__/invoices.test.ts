/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../invoices/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../invoices/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Invoices API Integration Tests', () => {
  const db = getDb();
  let testContactId: string;

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.invoiceLineItems);
    await db.delete(dbSchema.invoices);
    await db.delete(dbSchema.contacts);
    
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();

    // Create a contact for relationship testing
    const contactsResult = await db.insert(dbSchema.contacts).values({
      orgId: TEST_ORG_ID,
      company: 'Invoice Client Corp',
      contactPerson: 'Alice Client',
      email: 'alice@client.com',
      phone: '555-5555',
      country: 'Canada',
      type: 'buyer',
      status: 'active',
    }).returning();
    testContactId = contactsResult[0]!.id;
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.invoiceLineItems);
    await db.delete(dbSchema.invoices);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
    setLastRequest(null);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const res = await listGET();
    expect(res.status).toBe(401);
  });

  it('should return an empty list initially for authenticated users', async () => {
    createAuthenticatedRequest('http://localhost/api/invoices');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create an invoice with line items', async () => {
    const payload = {
      number: 'INV-2026-001',
      contactId: testContactId,
      currency: 'USD',
      subtotal: 50000, // $500.00
      taxRate: 5,
      tax: 2500, // $25.00
      total: 52500, // $525.00
      status: 'draft',
      issuedDate: '2026-05-26',
      dueDate: '2026-06-26',
      lineItems: [
        {
          description: 'Custom Consulting Services',
          quantity: 5,
          unitPrice: 10000, // $100.00
        },
      ],
    };

    const req = createAuthenticatedRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.number).toBe('INV-2026-001');
    expect(body.data.contactName).toBe('Invoice Client Corp');
    expect(body.data.lineItems.length).toBe(1);
    expect(body.data.lineItems[0].description).toBe('Custom Consulting Services');
    expect(body.data.lineItems[0].total).toBe(50000); // 5 * 10000
  });

  it('should retrieve a single invoice by id', async () => {
    const invoicesResult = await db.insert(dbSchema.invoices).values({
      orgId: TEST_ORG_ID,
      number: 'INV-SINGLE',
      contactId: testContactId,
      currency: 'CAD',
      subtotal: 1000,
      taxRate: 0,
      tax: 0,
      total: 1000,
      status: 'sent',
      issuedDate: '2026-05-20',
      dueDate: '2026-06-20',
    }).returning();
    const invoice = invoicesResult[0]!;

    await db.insert(dbSchema.invoiceLineItems).values({
      invoiceId: invoice.id,
      description: 'Single Item',
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
    });

    const req = createAuthenticatedRequest(`http://localhost/api/invoices/${invoice.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: invoice.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(invoice.id);
    expect(body.data.contactName).toBe('Invoice Client Corp');
    expect(body.data.lineItems.length).toBe(1);
    expect(body.data.lineItems[0].description).toBe('Single Item');
  });

  it('should patch update an invoice, replacing line items', async () => {
    const invoicesResult = await db.insert(dbSchema.invoices).values({
      orgId: TEST_ORG_ID,
      number: 'INV-PATCH',
      contactId: testContactId,
      currency: 'USD',
      subtotal: 2000,
      taxRate: 5,
      tax: 100,
      total: 2100,
      status: 'draft',
      issuedDate: '2026-05-20',
      dueDate: '2026-06-20',
    }).returning();
    const invoice = invoicesResult[0]!;

    await db.insert(dbSchema.invoiceLineItems).values({
      invoiceId: invoice.id,
      description: 'Old Item',
      quantity: 2,
      unitPrice: 1000,
      total: 2000,
    });

    const payload = {
      status: 'sent',
      subtotal: 3000,
      tax: 150,
      total: 3150,
      lineItems: [
        {
          description: 'New Item',
          quantity: 3,
          unitPrice: 1000,
        },
      ],
    };

    const req = createAuthenticatedRequest(`http://localhost/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: invoice.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('sent');
    expect(body.data.lineItems.length).toBe(1);
    expect(body.data.lineItems[0].description).toBe('New Item');
    expect(body.data.lineItems[0].quantity).toBe(3);
  });

  it('should delete an invoice and write cascade snapshot to deletion_logs', async () => {
    const invoicesResult = await db.insert(dbSchema.invoices).values({
      orgId: TEST_ORG_ID,
      number: 'INV-DELETE',
      contactId: testContactId,
      currency: 'USD',
      subtotal: 4000,
      taxRate: 0,
      tax: 0,
      total: 4000,
      status: 'paid',
      issuedDate: '2026-05-15',
      dueDate: '2026-06-15',
    }).returning();
    const invoice = invoicesResult[0]!;

    await db.insert(dbSchema.invoiceLineItems).values({
      invoiceId: invoice.id,
      description: 'Paid Service',
      quantity: 4,
      unitPrice: 1000,
      total: 4000,
    });

    const req = createAuthenticatedRequest(`http://localhost/api/invoices/${invoice.id}?reason=Void`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: invoice.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(invoice.id);

    // Verify hard deletion of invoice and line items
    const fetchInvoices = await db.select().from(dbSchema.invoices);
    expect(fetchInvoices.length).toBe(0);
    const fetchLineItems = await db.select().from(dbSchema.invoiceLineItems);
    expect(fetchLineItems.length).toBe(0);

    // Verify it is logged in deletion_logs
    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('invoices');
    expect(log.recordId).toBe(invoice.id);
    expect((log.deletedData as any).number).toBe('INV-DELETE');
    expect((log.deletedData as any).lineItems.length).toBe(1);
    expect((log.deletedData as any).lineItems[0].description).toBe('Paid Service');
  });
});
