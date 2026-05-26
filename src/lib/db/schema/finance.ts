import { pgTable, uuid, varchar, integer, index } from 'drizzle-orm/pg-core';
import { orgs, users } from './core';
import { costCategoryEnum } from './enums';

// ==========================================
// 1. COST ITEMS (Landed Costs)
// ==========================================
export const costItems = pgTable('cost_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  category: costCategoryEnum('category').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  amount: integer('amount').notNull(), // stored in cents
  currency: varchar('currency', { length: 3 }).notNull(), // ISO 4217 (e.g. USD)
}, (table) => [
  index('idx_cost_items_org_id').on(table.orgId),
  index('idx_cost_items_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 2. FINANCIAL PROJECTIONS
// ==========================================
export const financialProjections = pgTable('financial_projections', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  month: varchar('month', { length: 20 }).notNull(), // e.g. "January 2026"
  revenue: integer('revenue').notNull(), // stored in cents
  expenses: integer('expenses').notNull(), // stored in cents
  profit: integer('profit').notNull(), // stored in cents
  currency: varchar('currency', { length: 3 }).notNull(), // ISO 4217 (e.g. USD)
}, (table) => [
  index('idx_financial_projections_org_id').on(table.orgId),
  index('idx_financial_projections_created_by_user_id').on(table.createdByUserId),
]);
