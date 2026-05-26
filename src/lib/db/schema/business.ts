import { pgTable, uuid, varchar, integer, timestamp, date, jsonb, text, index } from 'drizzle-orm/pg-core';
import { orgs, users } from './core';
import { swotCategoryEnum, taskStatusEnum, taskPriorityEnum } from './enums';

// ==========================================
// 1. BUSINESS PLAN SECTIONS
// ==========================================
export const businessPlanSections = pgTable('business_plan_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  sortOrder: integer('sort_order').notNull(), // maps to 'order' in TypeScript
}, (table) => [
  index('idx_business_plan_sections_org_id').on(table.orgId),
  index('idx_business_plan_sections_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 2. SWOT MATRIX ITEMS
// ==========================================
export const swotItems = pgTable('swot_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  text: text('text').notNull(),
  category: swotCategoryEnum('category').notNull(),
}, (table) => [
  index('idx_swot_items_org_id').on(table.orgId),
  index('idx_swot_items_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 3. TASKS (Kanban Dashboard)
// ==========================================
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  status: taskStatusEnum('status').notNull(),
  priority: taskPriorityEnum('priority').notNull(),
  dueDate: date('due_date', { mode: 'string' }),
  assignee: varchar('assignee', { length: 255 }),
  tags: jsonb('tags').notNull(), // string array (e.g. ['finance', 'legal'])
  category: varchar('category', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_tasks_org_id').on(table.orgId),
  index('idx_tasks_created_by_user_id').on(table.createdByUserId),
]);
