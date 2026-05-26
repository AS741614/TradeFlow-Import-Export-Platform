import { pgTable, uuid, varchar, integer, timestamp, jsonb, text, index } from 'drizzle-orm/pg-core';
import { orgs, users } from './core';
import { 
  outreachSourceEnum, 
  templateCategoryEnum, 
  campaignStatusEnum, 
  campaignScheduleTypeEnum, 
  emailStatusEnum 
} from './enums';

// ==========================================
// 1. OUTREACH CONTACTS
// ==========================================
export const outreachContacts = pgTable('outreach_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  country: varchar('country', { length: 100 }).notNull(),
  tags: jsonb('tags').notNull(), // string array (e.g. ['vip', 'textiles'])
  source: outreachSourceEnum('source').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  lastContacted: timestamp('last_contacted', { withTimezone: true, mode: 'string' }),
}, (table) => [
  index('idx_outreach_contacts_org_id').on(table.orgId),
  index('idx_outreach_contacts_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 2. EMAIL TEMPLATES
// ==========================================
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  category: templateCategoryEnum('category').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  variables: jsonb('variables').notNull(), // string array of variables found in template
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_email_templates_org_id').on(table.orgId),
  index('idx_email_templates_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 3. CAMPAIGNS
// ==========================================
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  templateId: uuid('template_id').references(() => emailTemplates.id, { onDelete: 'restrict' }).notNull(),
  status: campaignStatusEnum('status').notNull(),
  scheduleType: campaignScheduleTypeEnum('schedule_type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true, mode: 'string' }),
  sendsPerHour: integer('sends_per_hour'),
  subjectLineA: text('subject_line_a').notNull(),
  subjectLineB: text('subject_line_b'),
  stats: jsonb('stats').notNull(), // JSON CampaignStats: total, sent, delivered, opened, clicked, replied, bounced, failed
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_campaigns_org_id').on(table.orgId),
  index('idx_campaigns_created_by_user_id').on(table.createdByUserId),
  index('idx_campaigns_template_id').on(table.templateId),
]);

// ==========================================
// 4. CAMPAIGN CONTACTS JUNCTION (Normalized campaignHistory & contact lists)
// ==========================================
export const campaignContacts = pgTable('campaign_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => outreachContacts.id, { onDelete: 'cascade' }).notNull(),
  status: emailStatusEnum('status').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_campaign_contacts_campaign_id').on(table.campaignId),
  index('idx_campaign_contacts_contact_id').on(table.contactId),
]);
