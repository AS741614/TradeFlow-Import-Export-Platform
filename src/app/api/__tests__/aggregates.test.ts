/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '@/lib/db/client';
import * as dbSchema from '@/lib/db/schema';
import { GET as invoicesGET } from '../invoices/aggregate/route';
import { GET as shipmentsGET } from '../shipments/aggregate/route';
import { GET as contactsGET } from '../contacts/aggregate/route';
import {
  seedTestAuth,
  mockAuthSession,
  mockAuthCall,
  clearDatabase,
} from './_helpers/auth-fixture';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockAuthCall())),
}));

describe('Aggregate API Integration Tests', () => {
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

  it('should return a zeroed structured response when tables are empty', async () => {
    // 1. Invoices
    let req = new Request('http://localhost/api/invoices/aggregate') as unknown as NextRequest;
    let res = await invoicesGET(req);
    expect(res.status).toBe(200);
    let body = await res.json();
    expect(body.data.summary).toEqual({
      totalVolume: 0,
      count: 0,
      avgVolume: 0,
      outstandingVolume: 0,
    });
    expect(body.data.byStatus).toHaveLength(0);
    expect(body.data.byCurrency).toHaveLength(0);
    expect(body.data.trend).toHaveLength(0);

    // 2. Shipments
    req = new Request('http://localhost/api/shipments/aggregate') as unknown as NextRequest;
    res = await shipmentsGET(req);
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.data.total).toBe(0);
    expect(body.data.byStatus).toHaveLength(0);
    expect(body.data.byOrigin).toHaveLength(0);
    expect(body.data.byDestination).toHaveLength(0);
    expect(body.data.trend).toHaveLength(0);

    // 3. Contacts
    req = new Request('http://localhost/api/contacts/aggregate') as unknown as NextRequest;
    res = await contactsGET(req);
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.data.total).toBe(0);
    expect(body.data.byType).toHaveLength(0);
    expect(body.data.byStatus).toHaveLength(0);
    expect(body.data.byCountry).toHaveLength(0);
  });

  it('should calculate aggregates correctly when data is present', async () => {
    const session = mockAuthCall();
    if (!session?.user) throw new Error('Unseeded user');

    const orgId = session.user.orgId;
    const userId = session.user.id;

    // A. Seed Contact
    const [contact] = await db.insert(dbSchema.contacts).values({
      orgId,
      createdByUserId: userId,
      company: 'Test Company',
      contactPerson: 'John Test',
      email: 'john@test.com',
      phone: '123456',
      country: 'France',
      type: 'buyer',
      status: 'active',
    }).returning();
    expect(contact).toBeDefined();
    if (!contact) throw new Error('Contact not seeded');
    const contactId = contact.id;

    // B. Seed Shipments
    await db.insert(dbSchema.shipments).values([
      {
        orgId,
        createdByUserId: userId,
        reference: 'SH-1',
        origin: 'France',
        destination: 'Germany',
        carrier: 'DHL',
        status: 'delivered',
        estimatedArrival: '2026-06-01',
      },
      {
        orgId,
        createdByUserId: userId,
        reference: 'SH-2',
        origin: 'Spain',
        destination: 'Germany',
        carrier: 'FedEx',
        status: 'shipped',
        estimatedArrival: '2026-06-05',
      },
    ]);

    // C. Seed Invoices
    await db.insert(dbSchema.invoices).values([
      {
        orgId,
        createdByUserId: userId,
        number: 'INV-1',
        contactId,
        currency: 'EUR',
        subtotal: 10000,
        taxRate: 20,
        tax: 2000,
        total: 12000,
        status: 'paid',
        issuedDate: '2026-05-01',
        dueDate: '2026-06-01',
      },
      {
        orgId,
        createdByUserId: userId,
        number: 'INV-2',
        contactId,
        currency: 'USD',
        subtotal: 20000,
        taxRate: 10,
        tax: 2000,
        total: 22000,
        status: 'sent',
        issuedDate: '2026-05-15',
        dueDate: '2026-06-15',
      },
    ]);

    // Run aggregate GET requests
    // Invoices Aggregate
    let req = new Request('http://localhost/api/invoices/aggregate') as unknown as NextRequest;
    let res = await invoicesGET(req);
    expect(res.status).toBe(200);
    const invoicesBody = (await res.json()) as {
      data: {
        summary: { count: number; totalVolume: number; outstandingVolume: number };
        byStatus: { status: string; count: number; total: number }[];
      };
    };

    expect(invoicesBody.data.summary.count).toBe(2);
    expect(invoicesBody.data.summary.totalVolume).toBe(34000);
    expect(invoicesBody.data.summary.outstandingVolume).toBe(22000); // Only open invoice total

    expect(invoicesBody.data.byStatus).toHaveLength(2);
    const paidStatus = invoicesBody.data.byStatus.find((s) => s.status === 'paid');
    expect(paidStatus).toBeDefined();
    if (paidStatus) {
      expect(paidStatus.count).toBe(1);
      expect(paidStatus.total).toBe(12000);
    }

    // Shipments Aggregate
    req = new Request('http://localhost/api/shipments/aggregate') as unknown as NextRequest;
    res = await shipmentsGET(req);
    expect(res.status).toBe(200);
    const shipmentsBody = (await res.json()) as {
      data: {
        total: number;
        byStatus: { status: string; count: number }[];
        byOrigin: { origin: string; count: number }[];
      };
    };
    expect(shipmentsBody.data.total).toBe(2);
    expect(shipmentsBody.data.byStatus).toHaveLength(2);
    expect(shipmentsBody.data.byOrigin).toHaveLength(2);

    // Contacts Aggregate
    req = new Request('http://localhost/api/contacts/aggregate') as unknown as NextRequest;
    res = await contactsGET(req);
    expect(res.status).toBe(200);
    const contactsBody = (await res.json()) as {
      data: {
        total: number;
        byType: { type: string; count: number }[];
        byCountry: { country: string; count: number }[];
      };
    };
    expect(contactsBody.data.total).toBe(1);
    expect(contactsBody.data.byType[0]).toBeDefined();
    expect(contactsBody.data.byCountry[0]).toBeDefined();
    if (contactsBody.data.byType[0] && contactsBody.data.byCountry[0]) {
      expect(contactsBody.data.byType[0].type).toBe('buyer');
      expect(contactsBody.data.byCountry[0].country).toBe('France');
    }
  });
});
