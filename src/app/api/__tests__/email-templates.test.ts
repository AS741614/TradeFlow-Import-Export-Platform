/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../email-templates/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../email-templates/[id]/route';

describe('Email Templates API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.emailTemplates);
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
    await db.delete(dbSchema.emailTemplates);
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

  it('should create an email template and enforce multi-tenancy', async () => {
    const payload = {
      name: 'Introduction Mail',
      category: 'introduction',
      subject: 'Hello {{name}}',
      body: 'Welcome to TradeFlow',
      variables: ['name'],
    };

    const req = new NextRequest('http://localhost/api/email-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Introduction Mail');
    expect(body.data.category).toBe('introduction');
    expect(body.data.subject).toBe('Hello {{name}}');
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid email template payload with 400', async () => {
    const payload = {
      name: '', // invalid
      category: 'invalid-category', // invalid
      subject: '', // invalid
    };

    const req = new NextRequest('http://localhost/api/email-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single email template by id', async () => {
    const templateResult = await db.insert(dbSchema.emailTemplates).values({
      orgId: DEFAULT_ORG_ID,
      name: 'Quotation Follow Up',
      category: 'follow-up',
      subject: 'Follow up regarding quotation {{quote_id}}',
      body: 'Hi, just following up on your quote.',
      variables: ['quote_id'],
    }).returning();
    const template = templateResult[0]!;

    const req = new NextRequest(`http://localhost/api/email-templates/${template.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: template.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(template.id);
    expect(body.data.name).toBe('Quotation Follow Up');
  });

  it('should patch update an email template', async () => {
    const templateResult = await db.insert(dbSchema.emailTemplates).values({
      orgId: DEFAULT_ORG_ID,
      name: 'Product Catalog Email',
      category: 'catalog',
      subject: 'Here is our new catalog',
      body: 'Check out the attached files.',
      variables: [],
    }).returning();
    const template = templateResult[0]!;

    const payload = {
      subject: 'New revised catalog is here!',
      body: 'Updated files are attached.',
    };

    const req = new NextRequest(`http://localhost/api/email-templates/${template.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: template.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subject).toBe('New revised catalog is here!');
    expect(body.data.body).toBe('Updated files are attached.');
  });

  it('should return 404 when updating non-existent email template', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = new NextRequest(`http://localhost/api/email-templates/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New template name' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete an email template and write audit record to deletion_logs', async () => {
    const templateResult = await db.insert(dbSchema.emailTemplates).values({
      orgId: DEFAULT_ORG_ID,
      name: 'Temporary Catalog',
      category: 'catalog',
      subject: 'Temp catalog subject',
      body: 'Temp catalog body',
      variables: [],
    }).returning();
    const template = templateResult[0]!;

    const req = new NextRequest(`http://localhost/api/email-templates/${template.id}?reason=Obsolete%20catalog`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: template.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(template.id);

    const fetchTemplates = await db.select().from(dbSchema.emailTemplates);
    expect(fetchTemplates.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('email_templates');
    expect(log.recordId).toBe(template.id);
    expect((log.deletedData as any).name).toBe('Temporary Catalog');
    expect(log.reason).toBe('Obsolete catalog');
  });
});
