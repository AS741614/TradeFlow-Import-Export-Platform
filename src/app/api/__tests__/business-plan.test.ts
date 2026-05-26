/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../business-plan/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../business-plan/[id]/route';

describe('Business Plan API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.businessPlanSections);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

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
  });

  afterEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.businessPlanSections);
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

  it('should create a business plan section and enforce multi-tenancy', async () => {
    const payload = {
      title: 'Executive Summary',
      content: 'This is the executive summary description.',
      sortOrder: 1,
    };

    const req = new NextRequest('http://localhost/api/business-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe('Executive Summary');
    expect(body.data.content).toBe('This is the executive summary description.');
    expect(body.data.sortOrder).toBe(1);
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid business plan payload with 400', async () => {
    const payload = {
      title: '', // invalid
      content: 'Some content',
      sortOrder: 1.5, // invalid (not integer)
    };

    const req = new NextRequest('http://localhost/api/business-plan', {
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
      orgId: DEFAULT_ORG_ID,
      title: 'Market Analysis',
      content: 'Detailed analysis of import export trend',
      sortOrder: 2,
    }).returning();
    const section = sectionResult[0]!;

    const req = new NextRequest(`http://localhost/api/business-plan/${section.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: section.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(section.id);
    expect(body.data.title).toBe('Market Analysis');
  });

  it('should patch update a business plan section', async () => {
    const sectionResult = await db.insert(dbSchema.businessPlanSections).values({
      orgId: DEFAULT_ORG_ID,
      title: 'Financial Plan',
      content: 'Projections for Q3 and Q4',
      sortOrder: 3,
    }).returning();
    const section = sectionResult[0]!;

    const payload = {
      content: 'Updated projections for Q3, Q4 and next fiscal year',
      sortOrder: 4,
    };

    const req = new NextRequest(`http://localhost/api/business-plan/${section.id}`, {
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
    const req = new NextRequest(`http://localhost/api/business-plan/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New section title' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a business plan section and write audit record to deletion_logs', async () => {
    const sectionResult = await db.insert(dbSchema.businessPlanSections).values({
      orgId: DEFAULT_ORG_ID,
      title: 'Operations Plan Obsolete',
      content: 'Operational workflow details',
      sortOrder: 5,
    }).returning();
    const section = sectionResult[0]!;

    const req = new NextRequest(`http://localhost/api/business-plan/${section.id}?reason=Merged%20with%20market%20plan`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: section.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(section.id);

    const fetchSections = await db.select().from(dbSchema.businessPlanSections);
    expect(fetchSections.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('business_plan_sections');
    expect(log.recordId).toBe(section.id);
    expect((log.deletedData as any).title).toBe('Operations Plan Obsolete');
    expect(log.reason).toBe('Merged with market plan');
  });
});
