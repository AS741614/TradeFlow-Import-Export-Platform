/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../contacts/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../contacts/[id]/route';

describe('Contacts API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

    // Seed default org and user
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
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.contacts);
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

  it('should create a contact and enforce multi-tenancy', async () => {
    const payload = {
      company: 'Integration LLC',
      contactPerson: 'Alice Integrator',
      email: 'alice@integration.com',
      phone: '555-9000',
      country: 'Canada',
      type: 'buyer',
      status: 'active',
      notes: 'Some notes',
    };

    const req = new NextRequest('http://localhost/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.company).toBe('Integration LLC');
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid contact payload with 400', async () => {
    const payload = {
      company: '', // invalid
      email: 'not-an-email', // invalid
    };

    const req = new NextRequest('http://localhost/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single contact by id', async () => {
    const insertedResult = await db.insert(dbSchema.contacts).values({
      orgId: DEFAULT_ORG_ID,
      company: 'Single Corp',
      contactPerson: 'Bob Single',
      email: 'bob@single.com',
      phone: '555-1111',
      country: 'Canada',
      type: 'supplier',
      status: 'active',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = new NextRequest(`http://localhost/api/contacts/${inserted.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);
    expect(body.data.company).toBe('Single Corp');
  });

  it('should return 404 if contact does not exist', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest(`http://localhost/api/contacts/${fakeId}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  it('should patch update a contact', async () => {
    const insertedResult = await db.insert(dbSchema.contacts).values({
      orgId: DEFAULT_ORG_ID,
      company: 'Patch Corp',
      contactPerson: 'Charlie Patch',
      email: 'charlie@patch.com',
      phone: '555-2222',
      country: 'Canada',
      type: 'both',
      status: 'active',
    }).returning();
    const inserted = insertedResult[0]!;

    const payload = {
      company: 'Updated Patch Corp',
    };

    const req = new NextRequest(`http://localhost/api/contacts/${inserted.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.company).toBe('Updated Patch Corp');
    expect(body.data.contactPerson).toBe('Charlie Patch'); // unchanged
  });

  it('should delete a contact and write to deletion_logs', async () => {
    const insertedResult = await db.insert(dbSchema.contacts).values({
      orgId: DEFAULT_ORG_ID,
      company: 'Delete Corp',
      contactPerson: 'David Delete',
      email: 'david@delete.com',
      phone: '555-3333',
      country: 'Canada',
      type: 'buyer',
      status: 'active',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = new NextRequest(`http://localhost/api/contacts/${inserted.id}?reason=ClosedBusiness`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);

    // Verify it is hard deleted from contacts
    const fetchRes = await db.select().from(dbSchema.contacts);
    expect(fetchRes.length).toBe(0);

    // Verify it is logged in deletion_logs
    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('contacts');
    expect(log.recordId).toBe(inserted.id);
    expect((log.deletedData as any).company).toBe('Delete Corp');
    expect(log.deletedByUserId).toBe(DEFAULT_USER_ID);
    expect(log.reason).toBe('ClosedBusiness');
  });
});
