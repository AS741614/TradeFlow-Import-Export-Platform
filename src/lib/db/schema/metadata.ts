import { pgTable, uuid, varchar, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { orgs } from './core';

export const appMetadata = pgTable('app_metadata', {
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: 'app_metadata_pkey', columns: [table.orgId, table.key] }),
]);
