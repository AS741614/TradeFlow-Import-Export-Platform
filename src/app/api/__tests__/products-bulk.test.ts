/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { POST as bulkImportPOST } from '../products/bulk-import/route';
import {
  seedTestAuth,
  mockAuthSession,
  createAuthenticatedRequest,
  mockAuthCall,
  clearDatabase,
} from './_helpers/auth-fixture';
import { count } from 'drizzle-orm';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Products Bulk Import API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const res = await bulkImportPOST({} as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('should reject requests with 413 Payload Too Large if rows > 1000', async () => {
    const largeRows = Array.from({ length: 1001 }, () => ({}));
    createAuthenticatedRequest('http://localhost/api/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: largeRows }),
    });

    const res = await bulkImportPOST(
      new Request('http://localhost/api/products/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows: largeRows }),
      }) as unknown as NextRequest
    );
    expect(res.status).toBe(413);
  });

  it('should reject requests with invalid request bodies with 400', async () => {
    createAuthenticatedRequest('http://localhost/api/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ wrongKey: [] }),
    });

    const res = await bulkImportPOST(
      new Request('http://localhost/api/products/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ wrongKey: [] }),
      }) as unknown as NextRequest
    );
    expect(res.status).toBe(400);
  });

  it('should successfully import all valid rows', async () => {
    const validRows = [
      {
        name: 'Product A',
        sku: 'SKU-A',
        hsCode: '1234.56',
        category: 'Electronics',
        quantity: 10,
        reorderLevel: 5,
        unitCost: 1000,
        currency: 'USD',
        supplier: 'Supplier A',
        origin: 'US',
        status: 'in-stock',
      },
      {
        name: 'Product B',
        sku: 'SKU-B',
        hsCode: '7890.12',
        category: 'Clothing',
        quantity: 0,
        reorderLevel: 2,
        unitCost: 500,
        currency: 'EUR',
        supplier: 'Supplier B',
        origin: 'DE',
        status: 'out-of-stock',
      },
    ];

    const req = new Request('http://localhost/api/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });
    createAuthenticatedRequest('http://localhost/api/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });

    const res = await bulkImportPOST(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.failed.length).toBe(0);

    const dbCountResult = await db.select({ value: count() }).from(dbSchema.products);
    expect(dbCountResult[0]?.value).toBe(2);

    // Verify activity logging
    const logged = await db.select().from(dbSchema.activityLogs);
    expect(logged).toHaveLength(1);
    const logItem = logged[0];
    expect(logItem).toBeDefined();
    if (logItem) {
      expect(logItem.action).toBe('bulk_imported');
      expect(logItem.entityType).toBe('product');
      const summary = logItem.changeSummary as { count?: number } | null;
      expect(summary?.count).toBe(2);
    }
  });
});
