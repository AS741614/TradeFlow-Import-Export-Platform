/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../compliance/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../compliance/[id]/route';
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

describe('Compliance API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.complianceItems);
    
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.complianceItems);
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
    createAuthenticatedRequest('http://localhost/api/compliance');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a compliance item and enforce multi-tenancy', async () => {
    const payload = {
      documentName: 'Customs Declaration A',
      documentType: 'customs-declaration',
      status: 'pending',
      requiredBy: '2026-06-01',
      notes: 'Needs review by broker',
    };

    const req = createAuthenticatedRequest('http://localhost/api/compliance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.documentName).toBe('Customs Declaration A');
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid compliance payload with 400', async () => {
    const payload = {
      documentName: '', // invalid
      requiredBy: 'not-a-date', // invalid
    };

    const req = createAuthenticatedRequest('http://localhost/api/compliance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single compliance item by id', async () => {
    const insertedResult = await db.insert(dbSchema.complianceItems).values({
      orgId: TEST_ORG_ID,
      documentName: 'Bill of Lading Doc',
      documentType: 'bill-of-lading',
      status: 'submitted',
      requiredBy: '2026-07-01',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/compliance/${inserted.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);
    expect(body.data.documentName).toBe('Bill of Lading Doc');
  });

  it('should return 404 if compliance item does not exist', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createAuthenticatedRequest(`http://localhost/api/compliance/${fakeId}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  it('should patch update a compliance item', async () => {
    const insertedResult = await db.insert(dbSchema.complianceItems).values({
      orgId: TEST_ORG_ID,
      documentName: 'Insurance Certificate',
      documentType: 'insurance',
      status: 'pending',
      requiredBy: '2026-08-01',
    }).returning();
    const inserted = insertedResult[0]!;

    const payload = {
      status: 'approved',
      notes: 'Approved by safety manager',
    };

    const req = createAuthenticatedRequest(`http://localhost/api/compliance/${inserted.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('approved');
    expect(body.data.notes).toBe('Approved by safety manager');
    expect(body.data.documentName).toBe('Insurance Certificate'); // unchanged
  });

  it('should delete a compliance item and write to deletion_logs', async () => {
    const insertedResult = await db.insert(dbSchema.complianceItems).values({
      orgId: TEST_ORG_ID,
      documentName: 'Packing List File',
      documentType: 'packing-list',
      status: 'rejected',
      requiredBy: '2026-09-01',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/compliance/${inserted.id}?reason=ObsoleteDoc`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);

    // Verify it is hard deleted from compliance_items
    const fetchRes = await db.select().from(dbSchema.complianceItems);
    expect(fetchRes.length).toBe(0);

    // Verify it is logged in deletion_logs
    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('compliance_items');
    expect(log.recordId).toBe(inserted.id);
    expect((log.deletedData as any).documentName).toBe('Packing List File');
  });
});
