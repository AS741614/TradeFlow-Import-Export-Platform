/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../financial-projections/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../financial-projections/[id]/route';

describe('Financial Projections API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.financialProjections);
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
    await db.delete(dbSchema.financialProjections);
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

  it('should create a projection and enforce multi-tenancy', async () => {
    const payload = {
      month: 'January 2026',
      revenue: 500000, // $5000.00
      expenses: 300000, // $3000.00
      profit: 200000, // $2000.00
      currency: 'USD',
    };

    const req = new NextRequest('http://localhost/api/financial-projections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.month).toBe('January 2026');
    expect(body.data.revenue).toBe(500000);
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid projection payload with 400', async () => {
    const payload = {
      month: '', // invalid
      revenue: -50, // invalid
      expenses: -100, // invalid
      currency: 'CADCAD', // invalid
    };

    const req = new NextRequest('http://localhost/api/financial-projections', {
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
      orgId: DEFAULT_ORG_ID,
      month: 'February 2026',
      revenue: 600000,
      expenses: 400000,
      profit: 200000,
      currency: 'CAD',
    }).returning();
    const proj = projResult[0]!;

    const req = new NextRequest(`http://localhost/api/financial-projections/${proj.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: proj.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(proj.id);
    expect(body.data.month).toBe('February 2026');
  });

  it('should patch update a projection', async () => {
    const projResult = await db.insert(dbSchema.financialProjections).values({
      orgId: DEFAULT_ORG_ID,
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

    const req = new NextRequest(`http://localhost/api/financial-projections/${proj.id}`, {
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
    const req = new NextRequest(`http://localhost/api/financial-projections/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ month: 'April 2026' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a projection and write audit record to deletion_logs', async () => {
    const projResult = await db.insert(dbSchema.financialProjections).values({
      orgId: DEFAULT_ORG_ID,
      month: 'April 2026',
      revenue: 800000,
      expenses: 600000,
      profit: 200000,
      currency: 'USD',
    }).returning();
    const proj = projResult[0]!;

    const req = new NextRequest(`http://localhost/api/financial-projections/${proj.id}?reason=Stale%20data`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: proj.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(proj.id);

    const fetchProj = await db.select().from(dbSchema.financialProjections);
    expect(fetchProj.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('financial_projections');
    expect(log.recordId).toBe(proj.id);
    expect((log.deletedData as any).month).toBe('April 2026');
    expect(log.reason).toBe('Stale data');
  });
});
