/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { POST as bulkImportPOST } from '../contacts/bulk-import/route';
import {
  seedTestAuth,
  mockAuthSession,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
} from './_helpers/auth-fixture';
import { count } from 'drizzle-orm';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Contacts Bulk Import API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.contacts);
    
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const res = await bulkImportPOST({} as any);
    expect(res.status).toBe(401);
  });

  it('should reject requests with 413 Payload Too Large if rows > 1000', async () => {
    const largeRows = Array.from({ length: 1001 }, () => ({}));
    createAuthenticatedRequest('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: largeRows }),
    });

    const res = await bulkImportPOST(
      new Request('http://localhost/api/contacts/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows: largeRows }),
      }) as any
    );
    expect(res.status).toBe(413);
  });

  it('should reject requests with invalid request bodies with 400', async () => {
    createAuthenticatedRequest('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ wrongKey: [] }),
    });

    const res = await bulkImportPOST(
      new Request('http://localhost/api/contacts/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ wrongKey: [] }),
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it('should successfully import all valid rows', async () => {
    const validRows = [
      { company: 'Company A', contactPerson: 'Person A', email: 'a@example.com', phone: '123', country: 'USA', type: 'buyer', status: 'active' },
      { company: 'Company B', contactPerson: 'Person B', email: 'b@example.com', phone: '456', country: 'Canada', type: 'supplier', status: 'prospect' },
      { company: 'Company C', contactPerson: 'Person C', email: 'c@example.com', phone: '789', country: 'Germany', type: 'both', status: 'inactive' },
    ];

    const req = new Request('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });
    createAuthenticatedRequest('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });

    const res = await bulkImportPOST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.imported).toBe(3);
    expect(body.data.failed.length).toBe(0);

    // Verify DB count
    const [dbCount] = await db.select({ value: count() }).from(dbSchema.contacts);
    expect(dbCount.value).toBe(3);
  });

  it('should support continuation reporting mixed successes and errors', async () => {
    const mixedRows = [
      { company: 'Company A', contactPerson: 'Person A', email: 'a@example.com', phone: '123', country: 'USA', type: 'buyer', status: 'active' },
      { company: '', contactPerson: 'Person B', email: 'invalid-email', phone: '456', country: 'Canada', type: 'supplier', status: 'prospect' }, // invalid
      { company: 'Company C', contactPerson: 'Person C', email: 'c@example.com', phone: '789', country: 'Germany', type: 'both', status: 'inactive' },
    ];

    const req = new Request('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: mixedRows, continueOnError: true }),
    });
    createAuthenticatedRequest('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: mixedRows, continueOnError: true }),
    });

    const res = await bulkImportPOST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.failed.length).toBe(1);
    expect(body.data.failed[0].row).toBe(2);
    expect(body.data.failed[0].errors).toContain('company: Company name is required');

    // Verify DB count (only valid rows inserted)
    const [dbCount] = await db.select({ value: count() }).from(dbSchema.contacts);
    expect(dbCount.value).toBe(2);
  });

  it('should support transactional rollback on error when continueOnError is false', async () => {
    const mixedRows = [
      { company: 'Company A', contactPerson: 'Person A', email: 'a@example.com', phone: '123', country: 'USA', type: 'buyer', status: 'active' },
      { company: '', contactPerson: 'Person B', email: 'invalid-email', phone: '456', country: 'Canada', type: 'supplier', status: 'prospect' }, // invalid
      { company: 'Company C', contactPerson: 'Person C', email: 'c@example.com', phone: '789', country: 'Germany', type: 'both', status: 'inactive' },
    ];

    const req = new Request('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: mixedRows, continueOnError: false }),
    });
    createAuthenticatedRequest('http://localhost/api/contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: mixedRows, continueOnError: false }),
    });

    const res = await bulkImportPOST(req as any);
    // Since it's transactional rollback, it will throw a validation error inside the query helper, returning 400 Bad Request via the handleRouteError sanitizer!
    expect(res.status).toBe(400);

    // Verify DB count remains 0 due to transaction rollback
    const [dbCount] = await db.select({ value: count() }).from(dbSchema.contacts);
    expect(dbCount.value).toBe(0);
  });
});
