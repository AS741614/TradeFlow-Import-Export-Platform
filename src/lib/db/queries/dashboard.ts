import { getDb } from '../client';
import { contacts, products, shipments, invoices, tasks, campaigns } from '../schema';
import { count, eq, ne, sql } from 'drizzle-orm';
import { withTenant } from './base';
import { getSampleProducts, getSampleContacts, getDefaultTasks } from '../../constants';

export interface DashboardStats {
  contactsCount: number;
  productsCount: number;
  shipmentsCount: number;
  invoicesCount: number;
  tasksCount: number;
  campaignsCount: number;
  activeProductsCount: number;
  openInvoicesCount: number;
  pendingTasksCount: number;
  inTransitShipmentsCount: number;
  totalCampaignsSent: number;
}

export async function getDashboardStats(orgId: string, userId: string): Promise<DashboardStats> {
  const db = getDb();

  // Helper to execute all count queries
  const runCounts = async (txClient = db) => {
    return Promise.all([
      txClient.select({ value: count() }).from(contacts).where(withTenant(contacts, orgId)),
      txClient.select({ value: count() }).from(products).where(withTenant(products, orgId)),
      txClient.select({ value: count() }).from(shipments).where(withTenant(shipments, orgId)),
      txClient.select({ value: count() }).from(invoices).where(withTenant(invoices, orgId)),
      txClient.select({ value: count() }).from(tasks).where(withTenant(tasks, orgId)),
      txClient.select({ value: count() }).from(campaigns).where(withTenant(campaigns, orgId)),
      txClient.select({ value: count() }).from(products).where(withTenant(products, orgId, eq(products.status, 'in-stock'))),
      txClient.select({ value: count() }).from(invoices).where(withTenant(invoices, orgId, sql`${invoices.status} IN ('draft', 'sent')`)),
      txClient.select({ value: count() }).from(tasks).where(withTenant(tasks, orgId, ne(tasks.status, 'done'))),
      txClient.select({ value: count() }).from(shipments).where(withTenant(shipments, orgId, ne(shipments.status, 'delivered'))),
      txClient.select({
        value: sql<number>`COALESCE(SUM((stats->>'sent')::integer), 0)`,
      }).from(campaigns).where(withTenant(campaigns, orgId)),
    ]);
  };

  const results = await runCounts();

  let contactsCount = results[0][0]?.value ?? 0;
  let productsCount = results[1][0]?.value ?? 0;
  let shipmentsCount = results[2][0]?.value ?? 0;
  let invoicesCount = results[3][0]?.value ?? 0;
  let tasksCount = results[4][0]?.value ?? 0;
  let campaignsCount = results[5][0]?.value ?? 0;
  let activeProductsCount = results[6][0]?.value ?? 0;
  let openInvoicesCount = results[7][0]?.value ?? 0;
  let pendingTasksCount = results[8][0]?.value ?? 0;
  let inTransitShipmentsCount = results[9][0]?.value ?? 0;
  let totalCampaignsSent = Number(results[10][0]?.value ?? 0);

  // Adjustment 3: Server-side seeding when the organization is brand new
  if (contactsCount === 0 && productsCount === 0 && tasksCount === 0) {
    await db.transaction(async (tx) => {
      // Seed default products
      const defaultProducts = getSampleProducts().map(p => ({
        name: p.name,
        sku: p.sku,
        hsCode: p.hsCode,
        category: p.category,
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        unitCost: p.unitCost,
        currency: p.currency,
        supplier: p.supplier,
        origin: p.origin,
        status: p.status,
        orgId,
        createdByUserId: userId,
      }));
      if (defaultProducts.length > 0) {
        await tx.insert(products).values(defaultProducts);
      }

      // Seed default contacts
      const defaultContacts = getSampleContacts().map(c => ({
        company: c.company,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        country: c.country,
        type: c.type,
        status: c.status,
        tradeTerms: c.tradeTerms,
        orgId,
        createdByUserId: userId,
      }));
      if (defaultContacts.length > 0) {
        await tx.insert(contacts).values(defaultContacts);
      }

      // Seed default tasks
      const defaultTasks = getDefaultTasks().map(t => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee,
        tags: t.tags,
        category: t.category,
        orgId,
        createdByUserId: userId,
      }));
      if (defaultTasks.length > 0) {
        await tx.insert(tasks).values(defaultTasks);
      }
    });

    // Re-run count queries after seeding
    const afterSeedingResults = await runCounts();
    contactsCount = afterSeedingResults[0][0]?.value ?? 0;
    productsCount = afterSeedingResults[1][0]?.value ?? 0;
    shipmentsCount = afterSeedingResults[2][0]?.value ?? 0;
    invoicesCount = afterSeedingResults[3][0]?.value ?? 0;
    tasksCount = afterSeedingResults[4][0]?.value ?? 0;
    campaignsCount = afterSeedingResults[5][0]?.value ?? 0;
    activeProductsCount = afterSeedingResults[6][0]?.value ?? 0;
    openInvoicesCount = afterSeedingResults[7][0]?.value ?? 0;
    pendingTasksCount = afterSeedingResults[8][0]?.value ?? 0;
    inTransitShipmentsCount = afterSeedingResults[9][0]?.value ?? 0;
    totalCampaignsSent = Number(afterSeedingResults[10][0]?.value ?? 0);
  }

  return {
    contactsCount,
    productsCount,
    shipmentsCount,
    invoicesCount,
    tasksCount,
    campaignsCount,
    activeProductsCount,
    openInvoicesCount,
    pendingTasksCount,
    inTransitShipmentsCount,
    totalCampaignsSent,
  };
}
