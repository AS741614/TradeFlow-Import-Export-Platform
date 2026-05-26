/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../swot/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../swot/[id]/route';

describe('SWOT API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.swotItems);
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
    await db.delete(dbSchema.swotItems);
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

  it('should create a SWOT item and enforce multi-tenancy', async () => {
    const payload = {
      text: 'Experienced logistics team',
      category: 'strength',
    };

    const req = new NextRequest('http://localhost/api/swot', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.text).toBe('Experienced logistics team');
    expect(body.data.category).toBe('strength');
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid SWOT payload with 400', async () => {
    const payload = {
      text: '', // invalid
      category: 'invalid-category', // invalid
    };

    const req = new NextRequest('http://localhost/api/swot', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single SWOT item by id', async () => {
    const swotResult = await db.insert(dbSchema.swotItems).values({
      orgId: DEFAULT_ORG_ID,
      text: 'High dependency on third-party suppliers',
      category: 'weakness',
    }).returning();
    const swot = swotResult[0]!;

    const req = new NextRequest(`http://localhost/api/swot/${swot.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: swot.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(swot.id);
    expect(body.data.text).toBe('High dependency on third-party suppliers');
  });

  it('should patch update a SWOT item', async () => {
    const swotResult = await db.insert(dbSchema.swotItems).values({
      orgId: DEFAULT_ORG_ID,
      text: 'Expanding into South American market',
      category: 'opportunity',
    }).returning();
    const swot = swotResult[0]!;

    const payload = {
      text: 'Expanding into LATAM market',
    };

    const req = new NextRequest(`http://localhost/api/swot/${swot.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: swot.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.text).toBe('Expanding into LATAM market');
  });

  it('should return 404 when updating non-existent SWOT item', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = new NextRequest(`http://localhost/api/swot/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'New text' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a SWOT item and write audit record to deletion_logs', async () => {
    const swotResult = await db.insert(dbSchema.swotItems).values({
      orgId: DEFAULT_ORG_ID,
      text: 'New trade tariffs from key partners',
      category: 'threat',
    }).returning();
    const swot = swotResult[0]!;

    const req = new NextRequest(`http://localhost/api/swot/${swot.id}?reason=Obsolete%20threat`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: swot.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(swot.id);

    const fetchItems = await db.select().from(dbSchema.swotItems);
    expect(fetchItems.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('swot_items');
    expect(log.recordId).toBe(swot.id);
    expect((log.deletedData as any).text).toBe('New trade tariffs from key partners');
    expect(log.reason).toBe('Obsolete threat');
  });
});
