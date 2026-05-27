/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET, PUT, DELETE } from '../app-metadata/[key]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('App Metadata API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear dependencies and seed basic info
    await db.delete(dbSchema.appMetadata);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);

    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    await db.delete(dbSchema.appMetadata);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
    setLastRequest(null);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/test-key');
    const res = await GET(req, { params: Promise.resolve({ key: 'test-key' }) });
    expect(res.status).toBe(401);
  });

  it('should return null when the key does not exist', async () => {
    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/non-existent-key');
    const res = await GET(req, { params: Promise.resolve({ key: 'non-existent-key' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it('should save/upsert a metadata value using PUT', async () => {
    const payload = { value: JSON.stringify('saved-value-123') };
    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/test-key', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'test-key' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.key).toBe('test-key');
    expect(body.data.value).toBe(JSON.stringify('saved-value-123'));

    // Verify it exists in db
    const rows = await db.select().from(dbSchema.appMetadata);
    expect(rows.length).toBe(1);
    expect(rows[0]!.value).toBe(JSON.stringify('saved-value-123'));
    expect(rows[0]!.orgId).toBe(TEST_ORG_ID);
  });

  it('should return 400 on PUT with invalid payload', async () => {
    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/test-key', {
      method: 'PUT',
      body: JSON.stringify({ invalidFieldName: 'some-value' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'test-key' }) });
    expect(res.status).toBe(400);
  });

  it('should retrieve a previously saved metadata value using GET', async () => {
    await db.insert(dbSchema.appMetadata).values({
      orgId: TEST_ORG_ID,
      key: 'my-saved-key',
      value: JSON.stringify({ time: '2026-05-27T11:00:00Z' }),
    });

    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/my-saved-key');
    const res = await GET(req, { params: Promise.resolve({ key: 'my-saved-key' }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { key: string; value: string } };
    expect(body.data.key).toBe('my-saved-key');
    expect(JSON.parse(body.data.value)).toEqual({ time: '2026-05-27T11:00:00Z' });
  });

  it('should update an existing value using PUT', async () => {
    await db.insert(dbSchema.appMetadata).values({
      orgId: TEST_ORG_ID,
      key: 'upsert-key',
      value: JSON.stringify('first-value'),
    });

    const payload = { value: JSON.stringify('second-value') };
    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/upsert-key', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const res = await PUT(req, { params: Promise.resolve({ key: 'upsert-key' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.value).toBe(JSON.stringify('second-value'));

    // Check database
    const rows = await db.select().from(dbSchema.appMetadata);
    expect(rows.length).toBe(1);
    expect(rows[0]!.value).toBe(JSON.stringify('second-value'));
  });

  it('should delete a metadata value using DELETE', async () => {
    await db.insert(dbSchema.appMetadata).values({
      orgId: TEST_ORG_ID,
      key: 'delete-me',
      value: JSON.stringify('something'),
    });

    const req = createAuthenticatedRequest('http://localhost/api/app-metadata/delete-me', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ key: 'delete-me' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);

    const rows = await db.select().from(dbSchema.appMetadata);
    expect(rows.length).toBe(0);
  });
});
