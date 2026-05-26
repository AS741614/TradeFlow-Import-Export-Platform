/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { DEFAULT_ORG_ID, DEFAULT_USER_ID } from '@/lib/db/constants';
import { GET as listGET, POST as listPOST } from '../tasks/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../tasks/[id]/route';

describe('Tasks API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.tasks);
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
    await db.delete(dbSchema.tasks);
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

  it('should create a task and enforce multi-tenancy', async () => {
    const payload = {
      title: 'Review compliance documents',
      description: 'Check custom declaration forms',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-06-15',
      assignee: 'Alice',
      tags: ['compliance', 'import'],
      category: 'operations',
    };

    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe('Review compliance documents');
    expect(body.data.description).toBe('Check custom declaration forms');
    expect(body.data.orgId).toBe(DEFAULT_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid task payload with 400', async () => {
    const payload = {
      title: '', // invalid
      status: 'invalid-status', // invalid
      priority: 'urgent',
      category: '', // invalid
    };

    const req = new NextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single task by id', async () => {
    const taskResult = await db.insert(dbSchema.tasks).values({
      orgId: DEFAULT_ORG_ID,
      title: 'Submit customs filing',
      description: 'Need it done by tomorrow',
      status: 'in-progress',
      priority: 'urgent',
      category: 'logistics',
      tags: [],
    }).returning();
    const task = taskResult[0]!;

    const req = new NextRequest(`http://localhost/api/tasks/${task.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: task.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(task.id);
    expect(body.data.title).toBe('Submit customs filing');
  });

  it('should patch update a task', async () => {
    const taskResult = await db.insert(dbSchema.tasks).values({
      orgId: DEFAULT_ORG_ID,
      title: 'Audit inventory',
      description: 'Prepare report for manager',
      status: 'review',
      priority: 'medium',
      category: 'operations',
      tags: [],
    }).returning();
    const task = taskResult[0]!;

    const payload = {
      status: 'done',
      priority: 'low',
    };

    const req = new NextRequest(`http://localhost/api/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: task.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('done');
    expect(body.data.priority).toBe('low');
  });

  it('should return 404 when updating non-existent task', async () => {
    const nonExistentId = '00000000-0000-0000-0000-999999999999';
    const req = new NextRequest(`http://localhost/api/tasks/${nonExistentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New title' }),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: nonExistentId }) });
    expect(res.status).toBe(404);
  });

  it('should delete a task and write audit record to deletion_logs', async () => {
    const taskResult = await db.insert(dbSchema.tasks).values({
      orgId: DEFAULT_ORG_ID,
      title: 'Plan marketing campaign',
      description: 'Discuss with sales team',
      status: 'todo',
      priority: 'low',
      category: 'outreach',
      tags: [],
    }).returning();
    const task = taskResult[0]!;

    const req = new NextRequest(`http://localhost/api/tasks/${task.id}?reason=Task%20obsolete`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: task.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(task.id);

    const fetchTasks = await db.select().from(dbSchema.tasks);
    expect(fetchTasks.length).toBe(0);

    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('tasks');
    expect(log.recordId).toBe(task.id);
    expect((log.deletedData as any).title).toBe('Plan marketing campaign');
    expect(log.reason).toBe('Task obsolete');
  });
});
