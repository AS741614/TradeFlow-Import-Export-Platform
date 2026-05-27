/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../outreach-contacts/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../outreach-contacts/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
  TEST_USER_ID,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Outreach Contacts API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.outreachContacts);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.outreachContacts);
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
    createAuthenticatedRequest('http://localhost/api/outreach-contacts');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create an outreach contact and enforce multi-tenancy', async () => {
    const payload = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      company: 'ACME Corp',
      phone: '+1-555-0199',
      country: 'USA',
      tags: ['leads', 'importer'],
      source: 'manual',
    };

    const req = createAuthenticatedRequest('http://localhost/api/outreach-contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.firstName).toBe('John');
    expect(body.data.lastName).toBe('Doe');
    expect(body.data.email).toBe('john.doe@example.com');
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid outreach contact payload with 400', async () => {
    const payload = {
      firstName: '', // invalid
      lastName: 'Doe',
      email: 'invalid-email', // invalid
      company: '', // invalid
      country: 'USA',
      source: 'invalid-source', // invalid
    };

    const req = createAuthenticatedRequest('http://localhost/api/outreach-contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single outreach contact by id', async () => {
    const contactResult = await db.insert(dbSchema.outreachContacts).values({
      orgId: TEST_ORG_ID,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      company: 'Global Trade Ltd',
      phone: '+1-555-0188',
      country: 'UK',
      tags: ['vip'],
      source: 'csv',
    }).returning();
    const contact = contactResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/outreach-contacts/${contact.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: contact.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(contact.id);
    expect(body.data.firstName).toBe('Jane');
  });

  it('should patch update an outreach contact', async () => {
    const contactResult = await db.insert(dbSchema.outreachContacts).values({
      orgId: TEST_ORG_ID,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.j@example.com',
      company: 'Transit Logistics',
      phone: '+1-555-0177',
      country: 'Germany',
      tags: [],
      source: 'json',
    }).returning();
    const contact = contactResult[0]!;

    const payload = {
      company: 'Transit Logistics Updated',
      phone: '+1-555-0170',
      tags: ['partner'],
    };

    const req = createAuthenticatedRequest(`http://localhost/api/outreach-contacts/${contact.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: contact.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.company).toBe('Transit Logistics Updated');
    expect(body.data.phone).toBe('+1-555-0170');
    expect(body.data.tags).toEqual(['partner']);
  });

  it('should return 404 when updating non-existent outreach contact', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = createAuthenticatedRequest(`http://localhost/api/outreach-contacts/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Bob' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete an outreach contact and write audit record to deletion_logs', async () => {
    const contactResult = await db.insert(dbSchema.outreachContacts).values({
      orgId: TEST_ORG_ID,
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie.b@example.com',
      company: 'Peanuts Inc',
      phone: '+1-555-0166',
      country: 'France',
      tags: [],
      source: 'manual',
    }).returning();
    const contact = contactResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/outreach-contacts/${contact.id}?reason=Duplicate%20entry`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: contact.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(contact.id);

    const fetchContacts = await db.select().from(dbSchema.outreachContacts);
    expect(fetchContacts.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('outreach_contacts');
    expect(log.recordId).toBe(contact.id);
    expect((log.deletedData as any).firstName).toBe('Charlie');
    expect(log.reason).toBe('Duplicate entry');
    expect(log.deletedByUserId).toBe(TEST_USER_ID);
  });
});
