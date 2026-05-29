/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET } from '../activity-log/route';
import { GET as itemGET } from '../activity-log/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  mockAuthCall,
  clearDatabase,
} from './_helpers/auth-fixture';
import { logActivity } from '@/lib/audit-logger';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Activity Logs API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated list requests with 401', async () => {
    mockAuthSession(null);
    const res = await listGET({} as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('should successfully filter and paginate activity logs', async () => {
    const session = mockAuthCall();
    if (!session?.user) throw new Error('Unseeded user');

    // Insert mock activity logs directly
    await logActivity({
      orgId: session.user.orgId,
      userId: session.user.id,
      entityType: 'contact',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'created',
      changeSummary: { created: { name: 'Contact A' } },
    });

    await logActivity({
      orgId: session.user.orgId,
      userId: session.user.id,
      entityType: 'product',
      entityId: '00000000-0000-0000-0000-000000000001',
      action: 'updated',
      changeSummary: { before: {}, after: {}, changedFields: [] },
    });

    // 1. Get all logs
    let req = new Request('http://localhost/api/activity-log') as unknown as NextRequest;
    let res = await listGET(req);
    expect(res.status).toBe(200);
    let body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);

    // 2. Filter by entityType=product
    req = new Request('http://localhost/api/activity-log?entityType=product') as unknown as NextRequest;
    res = await listGET(req);
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].entityType).toBe('product');

    // 3. Paginate (limit=1)
    req = new Request('http://localhost/api/activity-log?limit=1') as unknown as NextRequest;
    res = await listGET(req);
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.limit).toBe(1);
  });

  it('should retrieve a single activity log by id', async () => {
    const session = mockAuthCall();
    if (!session?.user) throw new Error('Unseeded user');

    await logActivity({
      orgId: session.user.orgId,
      userId: session.user.id,
      entityType: 'contact',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: 'created',
      changeSummary: { created: { name: 'Contact A' } },
    });

    const logs = await db.select().from(dbSchema.activityLogs);
    expect(logs).toHaveLength(1);
    const logItem = logs[0];
    expect(logItem).toBeDefined();
    if (!logItem) throw new Error('Log item not found');
    const logId = logItem.id;

    // Retrieve via itemGET
    const req = new Request(`http://localhost/api/activity-log/${logId}`) as unknown as NextRequest;
    const res = await itemGET(req, { params: Promise.resolve({ id: logId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(logId);
    expect(body.data.entityType).toBe('contact');
  });

  it('should return 404 for non-existent activity log detail request', async () => {
    const req = new Request('http://localhost/api/activity-log/00000000-0000-0000-0000-000000000000') as unknown as NextRequest;
    const res = await itemGET(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    expect(res.status).toBe(404);
  });
});
