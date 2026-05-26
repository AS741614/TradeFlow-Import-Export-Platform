/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../cost-items/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../cost-items/[id]/route';

describe('Cost Items API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.costItems);
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
    await db.delete(dbSchema.costItems);
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

  it('should create a cost item and enforce multi-tenancy', async () => {
    const payload = {
      category: 'freight',
      description: 'Air freight shipping fee',
      amount: 150000, // $1500.00
      currency: 'USD',
    };

    const req = new NextRequest('http://localhost/api/cost-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.category).toBe('freight');
    expect(body.data.description).toBe('Air freight shipping fee');
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid cost item payload with 400', async () => {
    const payload = {
      category: 'invalid-category', // invalid
      description: '', // invalid
      amount: -100, // invalid
      currency: 'USDT', // invalid
    };

    const req = new NextRequest('http://localhost/api/cost-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single cost item by id', async () => {
    const costResult = await db.insert(dbSchema.costItems).values({
      orgId: DEFAULT_ORG_ID,
      category: 'insurance',
      description: 'Marine cargo insurance',
      amount: 30000,
      currency: 'CAD',
    }).returning();
    const costItem = costResult[0]!;

    const req = new NextRequest(`http://localhost/api/cost-items/${costItem.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: costItem.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(costItem.id);
    expect(body.data.category).toBe('insurance');
  });

  it('should patch update a cost item', async () => {
    const costResult = await db.insert(dbSchema.costItems).values({
      orgId: DEFAULT_ORG_ID,
      category: 'customs',
      description: 'Duty tax',
      amount: 50000,
      currency: 'USD',
    }).returning();
    const costItem = costResult[0]!;

    const payload = {
      amount: 55000,
      description: 'Duty tax revised',
    };

    const req = new NextRequest(`http://localhost/api/cost-items/${costItem.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: costItem.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.amount).toBe(55000);
    expect(body.data.description).toBe('Duty tax revised');
  });

  it('should return 404 when updating non-existent cost item', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = new NextRequest(`http://localhost/api/cost-items/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Testing' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a cost item and write audit record to deletion_logs', async () => {
    const costResult = await db.insert(dbSchema.costItems).values({
      orgId: DEFAULT_ORG_ID,
      category: 'logistics',
      description: 'Trucking delivery fee',
      amount: 80000,
      currency: 'USD',
    }).returning();
    const costItem = costResult[0]!;

    const req = new NextRequest(`http://localhost/api/cost-items/${costItem.id}?reason=Cancelled%20service`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: costItem.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(costItem.id);

    const fetchItems = await db.select().from(dbSchema.costItems);
    expect(fetchItems.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('cost_items');
    expect(log.recordId).toBe(costItem.id);
    expect((log.deletedData as any).description).toBe('Trucking delivery fee');
    expect(log.reason).toBe('Cancelled service');
  });
});
