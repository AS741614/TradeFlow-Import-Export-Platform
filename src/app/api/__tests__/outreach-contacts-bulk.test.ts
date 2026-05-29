/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { POST as bulkImportPOST } from '../outreach-contacts/bulk-import/route';
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

describe('Outreach Contacts Bulk Import API Integration Tests', () => {
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

  it('should successfully import valid rows', async () => {
    const validRows = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        company: 'Doe Inc',
        phone: '555-0199',
        country: 'Canada',
        tags: ['lead'],
        source: 'manual',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        company: 'Smith LLC',
        country: 'UK',
        tags: ['partner'],
        source: 'csv',
      },
    ];

    const req = new Request('http://localhost/api/outreach-contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });
    createAuthenticatedRequest('http://localhost/api/outreach-contacts/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows: validRows, continueOnError: true }),
    });

    const res = await bulkImportPOST(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.failed.length).toBe(0);

    const dbCountResult = await db.select({ value: count() }).from(dbSchema.outreachContacts);
    expect(dbCountResult[0]?.value).toBe(2);

    // Verify activity logging
    const logged = await db.select().from(dbSchema.activityLogs);
    expect(logged).toHaveLength(1);
    const logItem = logged[0];
    expect(logItem).toBeDefined();
    if (logItem) {
      expect(logItem.action).toBe('bulk_imported');
      expect(logItem.entityType).toBe('outreach-contact');
      const summary = logItem.changeSummary as { count?: number } | null;
      expect(summary?.count).toBe(2);
    }
  });
});
