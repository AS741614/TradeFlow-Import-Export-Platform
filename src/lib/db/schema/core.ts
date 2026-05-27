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

export const deletionLogs = pgTable('deletion_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  deletedData: jsonb('deleted_data').notNull(),
  deletedByUserId: uuid('deleted_by_user_id').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  reason: text('reason'),
}, (table) => [
  index('idx_deletion_logs_deleted_by_user_id').on(table.deletedByUserId),
]);
