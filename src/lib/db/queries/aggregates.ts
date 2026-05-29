import { getDb } from '../client';
import { invoices, shipments, contacts } from '../schema';
import { eq, and, gte, lte, sql, SQL } from 'drizzle-orm';
import { withTenant } from './base';

export interface InvoiceAggregateFilters {
  startDate?: string | undefined;
  endDate?: string | undefined;
  contactId?: string | undefined;
  status?: string | undefined;
}

export interface ShipmentAggregateFilters {
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string | undefined;
}

export interface ContactAggregateFilters {
  status?: string | undefined;
  type?: string | undefined;
  country?: string | undefined;
}

export async function getInvoiceAggregates(orgId: string, filters: InvoiceAggregateFilters) {
  const db = getDb();
  let conditions: SQL = withTenant(invoices, orgId);

  const addCond = (newCond: SQL | undefined) => {
    if (newCond) {
      const merged = and(conditions, newCond);
      if (merged) {
        conditions = merged;
      }
    }
  };

  if (filters.contactId) {
    addCond(eq(invoices.contactId, filters.contactId));
  }
  if (filters.status) {
    addCond(eq(invoices.status, filters.status as unknown as 'draft' | 'sent' | 'paid' | 'overdue'));
  }
  if (filters.startDate) {
    addCond(gte(invoices.issuedDate, filters.startDate));
  }
  if (filters.endDate) {
    addCond(lte(invoices.issuedDate, filters.endDate));
  }

  // 1. Overall stats
  const q1 = await db.select({
    totalVolume: sql<number>`COALESCE(SUM(${invoices.total}), 0)::int`,
    count: sql<number>`COUNT(*)::int`,
    avgVolume: sql<number>`COALESCE(ROUND(AVG(${invoices.total})), 0)::int`,
    outstandingVolume: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} != 'paid' THEN ${invoices.total} ELSE 0 END), 0)::int`
  }).from(invoices).where(conditions);

  const summary = q1[0] ?? { totalVolume: 0, count: 0, avgVolume: 0, outstandingVolume: 0 };

  // 2. Status distribution
  const statusStats = await db.select({
    status: invoices.status,
    count: sql<number>`COUNT(*)::int`,
    total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::int`
  }).from(invoices).where(conditions).groupBy(invoices.status);

  // 3. Currency distribution
  const currencyStats = await db.select({
    currency: invoices.currency,
    count: sql<number>`COUNT(*)::int`,
    total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::int`
  }).from(invoices).where(conditions).groupBy(invoices.currency);

  // 4. Monthly trend
  const trendStats = await db.select({
    month: sql<string>`DATE_TRUNC('month', ${invoices.createdAt})::text`,
    count: sql<number>`COUNT(*)::int`,
    total: sql<number>`COALESCE(SUM(${invoices.total}), 0)::int`
  }).from(invoices)
    .where(conditions)
    .groupBy(sql`DATE_TRUNC('month', ${invoices.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${invoices.createdAt}) DESC`)
    .limit(12);

  return {
    summary,
    byStatus: statusStats,
    byCurrency: currencyStats,
    trend: trendStats
  };
}

export async function getShipmentAggregates(orgId: string, filters: ShipmentAggregateFilters) {
  const db = getDb();
  let conditions: SQL = withTenant(shipments, orgId);

  const addCond = (newCond: SQL | undefined) => {
    if (newCond) {
      const merged = and(conditions, newCond);
      if (merged) {
        conditions = merged;
      }
    }
  };

  if (filters.status) {
    addCond(eq(shipments.status, filters.status as unknown as 'ordered' | 'shipped' | 'in-transit' | 'customs' | 'delivered'));
  }
  if (filters.startDate) {
    addCond(gte(shipments.estimatedArrival, filters.startDate));
  }
  if (filters.endDate) {
    addCond(lte(shipments.estimatedArrival, filters.endDate));
  }

  // 1. Overall stats
  const q1 = await db.select({
    count: sql<number>`COUNT(*)::int`
  }).from(shipments).where(conditions);

  const countVal = q1[0]?.count ?? 0;

  // 2. Status counts
  const statusStats = await db.select({
    status: shipments.status,
    count: sql<number>`COUNT(*)::int`
  }).from(shipments).where(conditions).groupBy(shipments.status);

  // 3. Origin distribution
  const originStats = await db.select({
    origin: shipments.origin,
    count: sql<number>`COUNT(*)::int`
  }).from(shipments).where(conditions).groupBy(shipments.origin);

  // 4. Destination distribution
  const destinationStats = await db.select({
    destination: shipments.destination,
    count: sql<number>`COUNT(*)::int`
  }).from(shipments).where(conditions).groupBy(shipments.destination);

  // 5. Monthly trend
  const trendStats = await db.select({
    month: sql<string>`DATE_TRUNC('month', ${shipments.createdAt})::text`,
    count: sql<number>`COUNT(*)::int`
  }).from(shipments)
    .where(conditions)
    .groupBy(sql`DATE_TRUNC('month', ${shipments.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${shipments.createdAt}) DESC`)
    .limit(12);

  return {
    total: countVal,
    byStatus: statusStats,
    byOrigin: originStats,
    byDestination: destinationStats,
    trend: trendStats
  };
}

export async function getContactAggregates(orgId: string, filters: ContactAggregateFilters) {
  const db = getDb();
  let conditions: SQL = withTenant(contacts, orgId);

  const addCond = (newCond: SQL | undefined) => {
    if (newCond) {
      const merged = and(conditions, newCond);
      if (merged) {
        conditions = merged;
      }
    }
  };

  if (filters.status) {
    addCond(eq(contacts.status, filters.status as unknown as 'active' | 'prospect' | 'inactive'));
  }
  if (filters.type) {
    addCond(eq(contacts.type, filters.type as unknown as 'buyer' | 'supplier' | 'both'));
  }
  if (filters.country) {
    addCond(eq(contacts.country, filters.country));
  }

  // 1. Overall count
  const q1 = await db.select({
    count: sql<number>`COUNT(*)::int`
  }).from(contacts).where(conditions);

  const countVal = q1[0]?.count ?? 0;

  // 2. Type counts
  const typeStats = await db.select({
    type: contacts.type,
    count: sql<number>`COUNT(*)::int`
  }).from(contacts).where(conditions).groupBy(contacts.type);

  // 3. Status counts
  const statusStats = await db.select({
    status: contacts.status,
    count: sql<number>`COUNT(*)::int`
  }).from(contacts).where(conditions).groupBy(contacts.status);

  // 4. Country distribution
  const countryStats = await db.select({
    country: contacts.country,
    count: sql<number>`COUNT(*)::int`
  }).from(contacts).where(conditions).groupBy(contacts.country);

  return {
    total: countVal,
    byType: typeStats,
    byStatus: statusStats,
    byCountry: countryStats
  };
}
