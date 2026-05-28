import { getDb } from '../client';
import { contacts, products, shipments, invoices, tasks, campaigns, swotItems, businessPlanSections, orgs } from '../schema';
import { count, eq, ne, sql } from 'drizzle-orm';
import { withTenant } from './base';
import { getSampleProducts, getSampleContacts, getDefaultTasks, getDefaultSwotItems, getDefaultBusinessPlan } from '@/lib/constants';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';

type DBClient = ReturnType<typeof getDb>;
type TxClient = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

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
  const runCounts = async (txClient: DBClient | TxClient = db) => {
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
      txClient.select({ value: count() }).from(swotItems).where(withTenant(swotItems, orgId)),
      txClient.select({ value: count() }).from(businessPlanSections).where(withTenant(businessPlanSections, orgId)),
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
  let totalCampaignsSent = results[10][0]?.value ?? 0;
  const swotCount = results[11][0]?.value ?? 0;
  const sectionCount = results[12][0]?.value ?? 0;

  // Seeding when the organization is brand new
  if (
    contactsCount === 0 &&
    productsCount === 0 &&
    tasksCount === 0 &&
    swotCount === 0 &&
    sectionCount === 0 &&
    process.env.DISABLE_AUTO_SEEDING !== 'true'
  ) {
    await db.transaction(async (tx) => {
      // 1. Lock the organization row
      await tx.select({ id: orgs.id }).from(orgs).where(eq(orgs.id, orgId)).for('update');

      // 2. Re-verify counts inside the transaction
      const txResults = await runCounts(tx);
      const txContactsCount = txResults[0][0]?.value ?? 0;
      const txProductsCount = txResults[1][0]?.value ?? 0;
      const txTasksCount = txResults[4][0]?.value ?? 0;
      const txSwotCount = txResults[11][0]?.value ?? 0;
      const txSectionCount = txResults[12][0]?.value ?? 0;

      if (
        txContactsCount === 0 &&
        txProductsCount === 0 &&
        txTasksCount === 0 &&
        txSwotCount === 0 &&
        txSectionCount === 0
      ) {
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

        // Seed default SWOT items
        const defaultSwot = getDefaultSwotItems().map(s => ({
          text: s.text,
          category: s.category,
          orgId,
          createdByUserId: userId,
        }));
        if (defaultSwot.length > 0) {
          await tx.insert(swotItems).values(defaultSwot);
        }

        // Seed default business plan sections
        const defaultSections = getDefaultBusinessPlan().map(s => ({
          title: s.title,
          content: s.content,
          sortOrder: s.sortOrder,
          orgId,
          createdByUserId: userId,
        }));
        if (defaultSections.length > 0) {
          await tx.insert(businessPlanSections).values(defaultSections);
        }
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
    totalCampaignsSent = afterSeedingResults[10][0]?.value ?? 0;
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
