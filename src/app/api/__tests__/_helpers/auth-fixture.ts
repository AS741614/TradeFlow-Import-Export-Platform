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

export async function seedTestAuth() {
  const db = getDb();
  
  // Clean up user and org tables to avoid duplicate key violations
  await db.delete(dbSchema.users);
  await db.delete(dbSchema.orgs);

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
