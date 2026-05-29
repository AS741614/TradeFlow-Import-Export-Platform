import { pgTable, uuid, varchar, timestamp, jsonb, text, index } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

/**
 * BOOTSTRAP PATTERN: 
 * First user signup creates orgs row FIRST, then users row pointing at it. 
 * Both inserts must occur in a single transaction. 
 * The data migration tool will seed one default org and one default user before 
 * migrating localStorage records.
 */

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  image: varchar('image', { length: 255 }),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  passwordHash: varchar('password_hash', { length: 255 }),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_users_org_id').on(table.orgId),
]);

export type ActivityLogChangeSummary =
  | { snapshot: Record<string, unknown> }  // for 'deleted'
  | { created: Record<string, unknown> }   // for 'created'
  | { before: Record<string, unknown>; after: Record<string, unknown>; changedFields: string[] }  // for 'updated'
  | { count: number }                      // for 'bulk_imported'
  | { count: number; ids: string[] };      // for 'bulk_deleted'

export const activityLogs = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  changeSummary: jsonb('change_summary').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  reason: text('reason'),
}, (table) => [
  index('idx_activity_log_org_created').on(table.orgId, table.createdAt),
  index('idx_activity_log_entity').on(table.entityType, table.entityId),
]);

