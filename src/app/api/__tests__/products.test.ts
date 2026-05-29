/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as listGET, POST as listPOST } from '../products/route';
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE } from '../products/[id]/route';
import {
  seedTestAuth,
  mockAuthSession,
  setLastRequest,
  createAuthenticatedRequest,
  mockAuthCall,
  TEST_ORG_ID,
  clearDatabase,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Products API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
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
    createAuthenticatedRequest('http://localhost/api/products');
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('should create a product and enforce multi-tenancy', async () => {
    const payload = {
      name: 'Test Product',
      sku: 'SKU-123',
      hsCode: '1234.56.78',
      category: 'Electronics',
      quantity: 100,
      reorderLevel: 20,
      unitCost: 1500, // $15.00
      currency: 'USD',
      supplier: 'Test Supplier',
      origin: 'Canada',
      status: 'in-stock',
    };

    const req = createAuthenticatedRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Test Product');
    expect(body.data.orgId).toBe(TEST_ORG_ID);
    expect(body.data.id).toBeDefined();
  });

  it('should reject invalid product payload with 400', async () => {
    const payload = {
      name: '', // invalid
      sku: 'SKU-123',
      quantity: -5, // invalid
    };

    const req = createAuthenticatedRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await listPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should retrieve a single product by id', async () => {
    const insertedResult = await db.insert(dbSchema.products).values({
      orgId: TEST_ORG_ID,
      name: 'Single Product',
      sku: 'SKU-SINGLE',
      hsCode: '1111.11.11',
      category: 'Clothing',
      quantity: 50,
      reorderLevel: 10,
      unitCost: 2000,
      currency: 'CAD',
      supplier: 'Local Supplier',
      origin: 'Canada',
      status: 'in-stock',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/products/${inserted.id}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);
    expect(body.data.name).toBe('Single Product');
  });

  it('should return 404 if product does not exist', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = createAuthenticatedRequest(`http://localhost/api/products/${fakeId}`);
    const res = await itemGET(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  it('should patch update a product', async () => {
    const insertedResult = await db.insert(dbSchema.products).values({
      orgId: TEST_ORG_ID,
      name: 'Patch Product',
      sku: 'SKU-PATCH',
      hsCode: '2222.22.22',
      category: 'Toys',
      quantity: 30,
      reorderLevel: 5,
      unitCost: 1000,
      currency: 'USD',
      supplier: 'Toy Supplier',
      origin: 'USA',
      status: 'in-stock',
    }).returning();
    const inserted = insertedResult[0]!;

    const payload = {
      name: 'Updated Product Name',
      quantity: 2,
      status: 'low-stock',
    };

    const req = createAuthenticatedRequest(`http://localhost/api/products/${inserted.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const res = await itemPATCH(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated Product Name');
    expect(body.data.quantity).toBe(2);
    expect(body.data.status).toBe('low-stock');
    expect(body.data.sku).toBe('SKU-PATCH'); // unchanged
  });

  it('should delete a product and write to deletion_logs', async () => {
    const insertedResult = await db.insert(dbSchema.products).values({
      orgId: TEST_ORG_ID,
      name: 'Delete Product',
      sku: 'SKU-DELETE',
      hsCode: '3333.33.33',
      category: 'Home',
      quantity: 5,
      reorderLevel: 10,
      unitCost: 5000,
      currency: 'EUR',
      supplier: 'Home Supplier',
      origin: 'Germany',
      status: 'low-stock',
    }).returning();
    const inserted = insertedResult[0]!;

    const req = createAuthenticatedRequest(`http://localhost/api/products/${inserted.id}?reason=Discontinued`, {
      method: 'DELETE',
    });

    const res = await itemDELETE(req, { params: Promise.resolve({ id: inserted.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(inserted.id);

    // Verify it is hard deleted from products
    const fetchRes = await db.select().from(dbSchema.products);
    expect(fetchRes.length).toBe(0);

    // Verify it is logged in activity_log
    const logRes = await db.select().from(dbSchema.activityLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.entityType).toBe('product');
    expect(log.entityId).toBe(inserted.id);
    const summary = log.changeSummary;
    if (summary && typeof summary === 'object' && 'snapshot' in summary) {
      expect((summary.snapshot as Record<string, unknown>).name).toBe('Delete Product');
    } else {
      throw new Error('Expected deletion snapshot in changeSummary');
    }
  });
});
