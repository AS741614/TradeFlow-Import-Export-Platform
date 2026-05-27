/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
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
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Products API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.products);
    
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.products);
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

    // Verify it is logged in deletion_logs
    const logRes = await db.select().from(dbSchema.deletionLogs);
    expect(logRes.length).toBe(1);
    const log = logRes[0]!;
    expect(log.tableName).toBe('products');
    expect(log.recordId).toBe(inserted.id);
    expect((log.deletedData as any).name).toBe('Delete Product');
  });
});
