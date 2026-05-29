/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../campaigns/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../campaigns/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
  TEST_USER_ID,
  clearDatabase,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Campaigns API Integration Tests', () => {
  const db = getDb();
  let templateId: string;
  let contactId1: string;
  let contactId2: string;

  beforeEach(async () => {
    await seedTestAuth();
    mockAuthSession();

    const templateRes = await db.insert(dbSchema.emailTemplates).values({
      orgId: TEST_ORG_ID,
      name: 'Newsletter',
      category: 'introduction',
      subject: 'Weekly Updates',
      body: 'Check our new catalog',
      variables: [],
    }).returning();
    templateId = templateRes[0]!.id;

    const contactRes1 = await db.insert(dbSchema.outreachContacts).values({
      orgId: TEST_ORG_ID,
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      company: 'ACME',
      country: 'USA',
      tags: [],
      source: 'manual',
    }).returning();
    contactId1 = contactRes1[0]!.id;

    const contactRes2 = await db.insert(dbSchema.outreachContacts).values({
      orgId: TEST_ORG_ID,
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      company: 'Globex',
      country: 'Canada',
      tags: [],
      source: 'manual',
    }).returning();
    contactId2 = contactRes2[0]!.id;
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
    createAuthenticatedRequest('http://localhost/api/campaigns');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a campaign and write junction records', async () => {
    const payload = {
      name: 'Summer Outreach',
      templateId,
      status: 'draft',
      scheduleType: 'immediate',
      subjectLineA: 'Summer Catalog 2026',
      stats: { total: 2, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0 },
      contactIds: [contactId1, contactId2],
    };

    const req = createAuthenticatedRequest('http://localhost/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Summer Outreach');
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
    expect(body.data.contactIds).toEqual([contactId1, contactId2]);

    const junctions = await db.select().from(dbSchema.campaignContacts);
    expect(junctions.length).toBe(2);
    expect(junctions.map(j => j.contactId)).toContain(contactId1);
    expect(junctions.map(j => j.contactId)).toContain(contactId2);
  });

  it('should reject invalid campaign payload with 400', async () => {
    const payload = {
      name: '', // invalid
      templateId: 'invalid-uuid', // invalid
      status: 'invalid-status', // invalid
      scheduleType: 'drip',
      subjectLineA: '', // invalid
    };

    const req = createAuthenticatedRequest('http://localhost/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single campaign by id with contactIds populated', async () => {
    const campaignRes = await db.insert(dbSchema.campaigns).values({
      orgId: TEST_ORG_ID,
      name: 'Winter Promo',
      templateId,
      status: 'scheduled',
      scheduleType: 'scheduled',
      scheduledAt: '2026-12-01T10:00:00Z',
      subjectLineA: 'Winter Clearance',
      stats: { total: 1, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0 },
    }).returning();
    const campaign = campaignRes[0]!;

    await db.insert(dbSchema.campaignContacts).values({
      campaignId: campaign.id,
      contactId: contactId1,
      status: 'pending',
    });

    const req = createAuthenticatedRequest(`http://localhost/api/campaigns/${campaign.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: campaign.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(campaign.id);
    expect(body.data.name).toBe('Winter Promo');
    expect(body.data.contactIds).toEqual([contactId1]);
  });

  it('should patch update a campaign and rewrite junction records', async () => {
    const campaignRes = await db.insert(dbSchema.campaigns).values({
      orgId: TEST_ORG_ID,
      name: 'Drip Email Campaign',
      templateId,
      status: 'sending',
      scheduleType: 'drip',
      sendsPerHour: 50,
      subjectLineA: 'Introduction to TradeFlow',
      stats: { total: 1, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0 },
    }).returning();
    const campaign = campaignRes[0]!;

    await db.insert(dbSchema.campaignContacts).values({
      campaignId: campaign.id,
      contactId: contactId1,
      status: 'pending',
    });

    const payload = {
      name: 'Drip Email Campaign Revised',
      contactIds: [contactId2], // replaces contactId1 with contactId2
    };

    const req = createAuthenticatedRequest(`http://localhost/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: campaign.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Drip Email Campaign Revised');
    expect(body.data.contactIds).toEqual([contactId2]);

    const junctions = await db.select().from(dbSchema.campaignContacts);
    expect(junctions.length).toBe(1);
    expect(junctions[0]!.contactId).toBe(contactId2);
  });

  it('should return 404 when updating non-existent campaign', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = createAuthenticatedRequest(`http://localhost/api/campaigns/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Campaign' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a campaign, cascade junction rows, and record contactIds in deletion_logs', async () => {
    const campaignRes = await db.insert(dbSchema.campaigns).values({
      orgId: TEST_ORG_ID,
      name: 'To Be Deleted Campaign',
      templateId,
      status: 'paused',
      scheduleType: 'immediate',
      subjectLineA: 'Self Destruct Subject',
      stats: { total: 2, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, failed: 0 },
    }).returning();
    const campaign = campaignRes[0]!;

    await db.insert(dbSchema.campaignContacts).values([
      { campaignId: campaign.id, contactId: contactId1, status: 'pending' },
      { campaignId: campaign.id, contactId: contactId2, status: 'pending' },
    ]);

    const req = createAuthenticatedRequest(`http://localhost/api/campaigns/${campaign.id}?reason=End%20of%20quarter`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: campaign.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(campaign.id);

    const fetchCampaigns = await db.select().from(dbSchema.campaigns);
    expect(fetchCampaigns.length).toBe(0);

    const fetchJunctions = await db.select().from(dbSchema.campaignContacts);
    expect(fetchJunctions.length).toBe(0); // Cascade works!

    const logRes = await db.select().from(dbSchema.activityLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.entityType).toBe('campaign');
    expect(log.entityId).toBe(campaign.id);
    expect(log.changeSummary).toEqual({ snapshot: { ...campaign, contactIds: [contactId1, contactId2] } });
    expect(log.reason).toBe('End of quarter');
    expect(log.userId).toBe(TEST_USER_ID);
  });
});
