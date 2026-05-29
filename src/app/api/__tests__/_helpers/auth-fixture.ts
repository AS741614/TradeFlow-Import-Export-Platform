/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';
export const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';

export const TEST_SESSION = {
  user: {
    id: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    role: 'owner',
  },
};

let currentSession: any = TEST_SESSION;
let lastRequest: NextRequest | null = null;

export function mockAuthSession(sessionData: any = TEST_SESSION) {
  currentSession = sessionData;
}

export function getCurrentSession() {
  return currentSession;
}

export function setLastRequest(req: NextRequest | null) {
  lastRequest = req;
}

export function getLastRequest() {
  return lastRequest;
}

export async function clearDatabase() {
  const db = getDb();
  
  // Clean up all tables in dependency order to avoid foreign key violations
  await db.delete(dbSchema.campaignContacts);
  await db.delete(dbSchema.campaigns);
  await db.delete(dbSchema.emailTemplates);
  await db.delete(dbSchema.outreachContacts);
  await db.delete(dbSchema.invoiceLineItems);
  await db.delete(dbSchema.invoices);
  await db.delete(dbSchema.shipmentProducts);
  await db.delete(dbSchema.shipmentDocuments);
  await db.delete(dbSchema.shipments);
  await db.delete(dbSchema.complianceItems);
  await db.delete(dbSchema.contacts);
  await db.delete(dbSchema.products);
  await db.delete(dbSchema.costItems);
  await db.delete(dbSchema.financialProjections);
  await db.delete(dbSchema.businessPlanSections);
  await db.delete(dbSchema.swotItems);
  await db.delete(dbSchema.tasks);
  await db.delete(dbSchema.appMetadata);
  await db.delete(dbSchema.activityLogs);
  await db.delete(dbSchema.accounts);
  await db.delete(dbSchema.sessions);
  await db.delete(dbSchema.verificationTokens);
  await db.delete(dbSchema.users);
  await db.delete(dbSchema.orgs);
}

export async function seedTestAuth() {
  const db = getDb();
  await clearDatabase();

  await db.insert(dbSchema.orgs).values({
    id: TEST_ORG_ID,
    name: 'Test Org',
    country: 'Canada',
  });

  await db.insert(dbSchema.users).values({
    id: TEST_USER_ID,
    email: 'test@example.com',
    displayName: 'Test User',
    orgId: TEST_ORG_ID,
    role: 'owner',
  });
}

export function createAuthenticatedRequest(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Cookie', 'next-auth.session-token=mock-token');
  const init: RequestInit = { headers };
  if (options.method !== undefined) init.method = options.method;
  if (options.body !== undefined) init.body = options.body;
  const req = new NextRequest(url, init as any);
  setLastRequest(req);
  return req;
}

export function mockAuthCall() {
  if (!lastRequest) {
    return currentSession;
  }
  const cookie = lastRequest.headers.get('cookie') ?? '';
  if (cookie.includes('next-auth.session-token=mock-token')) {
    return currentSession;
  }
  return null;
}
