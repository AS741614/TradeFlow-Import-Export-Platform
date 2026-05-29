/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../financial-projections/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../financial-projections/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
  clearDatabase,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Financial Projections API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    await clearDatabase();
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
    createAuthenticatedRequest('http://localhost/api/financial-projections');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a projection and enforce multi-tenancy', async () => {
    const payload = {
      month: 'January 2026',
      revenue: 500000, // $5000.00
      expenses: 300000, // $3000.00
      profit: 200000, // $2000.00
      currency: 'USD',
    };

    const req = createAuthenticatedRequest('http://localhost/api/financial-projections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.month).toBe('January 2026');
    expect(body.data.revenue).toBe(500000);
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid projection payload with 400', async () => {
    const payload = {
      month: '', // invalid
      revenue: -50, // invalid
      expenses: -100, // invalid
      currency: 'CADCAD', // invalid
    };

    const req = createAuthenticatedRequest('http://localhost/api/financial-projections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single projection by id', async () => {
    const projResult = await db.insert(dbSchema.financialProjections).values({
      orgId: TEST_ORG_ID,
      month: 'February 2026',
      revenue: 600000,
      expenses: 400000,
      profit: 200000,
      currency: 'CAD',
    }).returning();
    const proj = projResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/financial-projections/${proj.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: proj.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(proj.id);
    expect(body.data.month).toBe('February 2026');
  });

  it('should patch update a projection', async () => {
    const projResult = await db.insert(dbSchema.financialProjections).values({
      orgId: TEST_ORG_ID,
      month: 'March 2026',
      revenue: 700000,
      expenses: 500000,
      profit: 200000,
      currency: 'USD',
    }).returning();
    const proj = projResult[0]!;

    const payload = {
      revenue: 750000,
      profit: 250000,
    };

    const req = createAuthenticatedRequest(`http://localhost/api/financial-projections/${proj.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: proj.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revenue).toBe(750000);
    expect(body.data.profit).toBe(250000);
  });

  it('should return 404 when updating non-existent projection', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = createAuthenticatedRequest(`http://localhost/api/financial-projections/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ month: 'April 2026' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a projection and write audit record to deletion_logs', async () => {
    const projResult = await db.insert(dbSchema.financialProjections).values({
      orgId: TEST_ORG_ID,
      month: 'April 2026',
      revenue: 800000,
      expenses: 600000,
      profit: 200000,
      currency: 'USD',
    }).returning();
    const proj = projResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/financial-projections/${proj.id}?reason=Stale%20data`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: proj.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(proj.id);

    const fetchProj = await db.select().from(dbSchema.financialProjections);
    expect(fetchProj.length).toBe(0);

    const logRes = await db.select().from(dbSchema.activityLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.entityType).toBe('financial-projection');
    expect(log.entityId).toBe(proj.id);
    const summary = log.changeSummary;
    if (summary && typeof summary === 'object' && 'snapshot' in summary) {
      expect((summary.snapshot as Record<string, unknown>).month).toBe('April 2026');
    } else {
      throw new Error('Expected deletion snapshot in changeSummary');
    }
    expect(log.reason).toBe('Stale data');
  });
});
