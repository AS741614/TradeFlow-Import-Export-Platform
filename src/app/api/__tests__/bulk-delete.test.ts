/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { POST as contactsBulkDeletePOST } from '../contacts/bulk-delete/route';
import {
  seedTestAuth,
  mockAuthSession,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Bulk Delete API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Keep it clean
    const cleanDb = getDb();
    await cleanDb.delete(dbSchema.invoiceLineItems);
    await cleanDb.delete(dbSchema.invoices);
    await cleanDb.delete(dbSchema.shipments);
    await cleanDb.delete(dbSchema.contacts);
    await cleanDb.delete(dbSchema.activityLogs);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const req = createAuthenticatedRequest('http://localhost/api/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: ['1'] }),
    });
    const res = await contactsBulkDeletePOST(req);
    expect(res.status).toBe(401);
  });

  it('should bulk delete multiple contacts successfully and log activity', async () => {
    // Insert 3 contacts
    const records = await db.insert(dbSchema.contacts).values([
      { orgId: TEST_ORG_ID, company: 'C1', contactPerson: 'P1', email: 'c1@test.com', phone: '555-0001', country: 'Canada', type: 'buyer', status: 'active' },
      { orgId: TEST_ORG_ID, company: 'C2', contactPerson: 'P2', email: 'c2@test.com', phone: '555-0002', country: 'Canada', type: 'supplier', status: 'active' },
      { orgId: TEST_ORG_ID, company: 'C3', contactPerson: 'P3', email: 'c3@test.com', phone: '555-0003', country: 'Canada', type: 'both', status: 'active' },
    ]).returning();

    const ids = records.map(r => r.id);

    const req = createAuthenticatedRequest('http://localhost/api/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });

    const res = await contactsBulkDeletePOST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.deleted).toBe(3);
    expect(body.data.failed).toHaveLength(0);

    // Verify deleted in DB
    const dbContacts = await db.select().from(dbSchema.contacts);
    expect(dbContacts).toHaveLength(0);

    // Verify bulk_deleted log is written to activityLogs
    const logs = await db.select().from(dbSchema.activityLogs);
    const bulkLog = logs.find(l => l.action === 'bulk_deleted');
    expect(bulkLog).toBeDefined();
    expect(bulkLog!.entityType).toBe('contact');
    expect(bulkLog!.entityId).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('should handle foreign key constraint violations gracefully', async () => {
    // 1. Create a contact
    const [contact] = await db.insert(dbSchema.contacts).values({
      orgId: TEST_ORG_ID,
      company: 'Referenced LLC',
      contactPerson: 'Ref Person',
      email: 'referenced@test.com',
      phone: '555-0004',
      country: 'Canada',
      type: 'buyer',
      status: 'active',
    }).returning();

    // 2. Create another contact (not referenced)
    const [freeContact] = await db.insert(dbSchema.contacts).values({
      orgId: TEST_ORG_ID,
      company: 'Free Corp',
      contactPerson: 'Free Person',
      email: 'free@test.com',
      phone: '555-0005',
      country: 'Canada',
      type: 'supplier',
      status: 'active',
    }).returning();

    // 3. Create an invoice referencing the first contact to create a foreign key link
    await db.insert(dbSchema.invoices).values({
      orgId: TEST_ORG_ID,
      contactId: contact!.id,
      number: 'INV-1001',
      issuedDate: '2026-05-01',
      dueDate: '2026-06-01',
      status: 'draft',
      currency: 'USD',
      subtotal: 1000,
      taxRate: 5,
      tax: 50,
      total: 1050,
    });

    // 4. Try bulk deleting both
    const req = createAuthenticatedRequest('http://localhost/api/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: [contact!.id, freeContact!.id] }),
    });

    const res = await contactsBulkDeletePOST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.deleted).toBe(1);
    expect(body.data.failed).toHaveLength(1);
    expect(body.data.failed?.[0]?.id).toBe(contact!.id);
    expect(body.data.failed?.[0]?.error).toContain('Foreign key constraint violation');

    // Verify referenced contact still exists, free contact is deleted
    const dbContacts = await db.select().from(dbSchema.contacts);
    expect(dbContacts).toHaveLength(1);
    expect(dbContacts[0]!.id).toBe(contact!.id);
  });
});
