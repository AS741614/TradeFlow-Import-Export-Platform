/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as statsGET } from '../dashboard/stats/route';
import {
  seedTestAuth,
  mockAuthSession,
  createAuthenticatedRequest,
  mockAuthCall,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Dashboard Stats API Integration Tests', () => {
  const db = getDb();

  beforeEach(async () => {
    // Clear test tables in dependency order
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.tasks);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.campaigns);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.invoices);
    
    // Seed default org and user via auth helper
    await seedTestAuth();
    mockAuthSession();
  });

  afterEach(async () => {
    // Clear tables to keep DB clean
    await db.delete(dbSchema.deletionLogs);
    await db.delete(dbSchema.tasks);
    await db.delete(dbSchema.contacts);
    await db.delete(dbSchema.products);
    await db.delete(dbSchema.campaigns);
    await db.delete(dbSchema.shipments);
    await db.delete(dbSchema.invoices);
    await db.delete(dbSchema.users);
    await db.delete(dbSchema.orgs);
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should reject unauthenticated requests with 401', async () => {
    mockAuthSession(null);
    const res = await statsGET();
    expect(res.status).toBe(401);
  });

  it('should trigger server-side seeding and return default metrics when db is empty', async () => {
    createAuthenticatedRequest('http://localhost/api/dashboard/stats');
    const res = await statsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    
    // Default seeded counts from getSampleProducts, getSampleContacts, getDefaultTasks
    expect(body.data).toBeDefined();
    expect(body.data.productsCount).toBe(5);
    expect(body.data.contactsCount).toBe(5);
    expect(body.data.tasksCount).toBe(12);
    expect(body.data.activeProductsCount).toBe(3); // 'in-stock' count: Cotton Fabric, LED Panel, Bamboo Board
    expect(body.data.pendingTasksCount).toBe(12);
  });
});
