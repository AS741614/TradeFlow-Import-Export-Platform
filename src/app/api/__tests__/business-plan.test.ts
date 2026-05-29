/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../business-plan/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../business-plan/[id]/route';
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

describe('Business Plan API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
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
    createAuthenticatedRequest('http://localhost/api/business-plan');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a business plan section and enforce multi-tenancy', async () => {
    const payload = {
      title: 'Executive Summary',
      content: 'This is the executive summary description.',
      sortOrder: 1,
    };

    const req = createAuthenticatedRequest('http://localhost/api/business-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe('Executive Summary');
    expect(body.data.content).toBe('This is the executive summary description.');
    expect(body.data.sortOrder).toBe(1);
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid business plan payload with 400', async () => {
    const payload = {
      title: '', // invalid
      content: 'Some content',
      sortOrder: 1.5, // invalid (not integer)
    };

    const req = createAuthenticatedRequest('http://localhost/api/business-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single business plan section by id', async () => {
    const sectionResult = await db.insert(dbSchema.businessPlanSections).values({
      orgId: TEST_ORG_ID,
      title: 'Market Analysis',
      content: 'Detailed analysis of import export trend',
      sortOrder: 2,
    }).returning();
    const section = sectionResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/business-plan/${section.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: section.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(section.id);
    expect(body.data.title).toBe('Market Analysis');
  });

  it('should patch update a business plan section', async () => {
    const sectionResult = await db.insert(dbSchema.businessPlanSections).values({
      orgId: TEST_ORG_ID,
      title: 'Financial Plan',
      content: 'Projections for Q3 and Q4',
      sortOrder: 3,
    }).returning();
    const section = sectionResult[0]!;

    const payload = {
      content: 'Updated projections for Q3, Q4 and next fiscal year',
      sortOrder: 4,
    };

    const req = createAuthenticatedRequest(`http://localhost/api/business-plan/${section.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: section.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.content).toBe('Updated projections for Q3, Q4 and next fiscal year');
    expect(body.data.sortOrder).toBe(4);
  });

  it('should return 404 when updating non-existent business plan section', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = createAuthenticatedRequest(`http://localhost/api/business-plan/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New section title' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a business plan section and write audit record to deletion_logs', async () => {
    const sectionResult = await db.insert(dbSchema.businessPlanSections).values({
      orgId: TEST_ORG_ID,
      title: 'Operations Plan Obsolete',
      content: 'Operational workflow details',
      sortOrder: 5,
    }).returning();
    const section = sectionResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/business-plan/${section.id}?reason=Merged%20with%20market%20plan`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: section.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(section.id);

    const fetchSections = await db.select().from(dbSchema.businessPlanSections);
    expect(fetchSections.length).toBe(0);

    const logRes = await db.select().from(dbSchema.activityLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.entityType).toBe('business-plan');
    expect(log.entityId).toBe(section.id);
    expect(log.changeSummary).toEqual({ snapshot: section });
    expect(log.reason).toBe('Merged with market plan');
  });

  it('should auto-assign sortOrder if not provided', async () => {
    const payload1 = {
      title: 'First Section',
      content: 'Content 1',
    };
    const req1 = createAuthenticatedRequest('http://localhost/api/business-plan', {
      method: 'POST',
      body: JSON.stringify(payload1),
    });
    const res1 = await listPOST(req1);
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    expect(body1.data.sortOrder).toBe(1);

    const payload2 = {
      title: 'Second Section',
      content: 'Content 2',
    };
    const req2 = createAuthenticatedRequest('http://localhost/api/business-plan', {
      method: 'POST',
      body: JSON.stringify(payload2),
    });
    const res2 = await listPOST(req2);
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.data.sortOrder).toBe(2);
  });
});
