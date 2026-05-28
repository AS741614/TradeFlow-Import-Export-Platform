import { pgTable, uuid, varchar, integer, timestamp, date, text, index } from 'drizzle-orm/pg-core';
import { orgs, users } from './core';
import { 
  productStatusEnum, 
  contactTypeEnum, 
  contactStatusEnum, 
  shipmentStatusEnum, 
  shipmentDocTypeEnum, 
  shipmentDocStatusEnum, 
  invoiceStatusEnum 
} from './enums';

// ==========================================
// 1. PRODUCTS
// ==========================================
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  hsCode: varchar('hs_code', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull(),
  reorderLevel: integer('reorder_level').notNull(),
  unitCost: integer('unit_cost').notNull(), // stored in cents
  currency: varchar('currency', { length: 3 }).notNull(), // ISO 4217 (e.g. USD)
  supplier: varchar('supplier', { length: 255 }).notNull(),
  origin: varchar('origin', { length: 100 }).notNull(),
  status: productStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_products_org_id').on(table.orgId),
  index('idx_products_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 2. CONTACTS
// ==========================================
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  company: varchar('company', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  address: text('address'),
  type: contactTypeEnum('type').notNull(),
  status: contactStatusEnum('status').notNull(),
  tradeTerms: varchar('trade_terms', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_contacts_org_id').on(table.orgId),
  index('idx_contacts_created_by_user_id').on(table.createdByUserId),
  index('idx_contacts_email').on(table.email),
]);

// ==========================================
// 3. SHIPMENTS
// ==========================================
export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  reference: varchar('reference', { length: 100 }).notNull(),
  origin: varchar('origin', { length: 100 }).notNull(),
  destination: varchar('destination', { length: 100 }).notNull(),
  carrier: varchar('carrier', { length: 100 }).notNull(),
  status: shipmentStatusEnum('status').notNull(),
  estimatedArrival: date('estimated_arrival', { mode: 'string' }).notNull(),
  actualArrival: date('actual_arrival', { mode: 'string' }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_shipments_org_id').on(table.orgId),
  index('idx_shipments_created_by_user_id').on(table.createdByUserId),
]);

// ==========================================
// 4. SHIPMENT PRODUCTS (Normalized nested array)
// ==========================================
export const shipmentProducts = pgTable('shipment_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
}, (table) => [
  index('idx_shipment_products_shipment_id').on(table.shipmentId),
  index('idx_shipment_products_product_id').on(table.productId),
]);

// ==========================================
// 5. SHIPMENT DOCUMENTS (Normalized nested array)
// ==========================================
export const shipmentDocuments = pgTable('shipment_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: shipmentDocTypeEnum('type').notNull(),
  status: shipmentDocStatusEnum('status').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
  index('idx_shipment_documents_shipment_id').on(table.shipmentId),
]);

// ==========================================
// 6. COMPLIANCE CHECKLIST
// ==========================================
export const complianceItems = pgTable('compliance_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'set null' }),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  status: shipmentDocStatusEnum('status').notNull(),
  requiredBy: date('required_by', { mode: 'string' }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'string' }),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }),
  notes: text('notes'),
}, (table) => [
  index('idx_compliance_items_org_id').on(table.orgId),
  index('idx_compliance_items_created_by_user_id').on(table.createdByUserId),
  index('idx_compliance_items_shipment_id').on(table.shipmentId),
]);

// ==========================================
// 7. INVOICES
// ==========================================
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  // Nullable because pre-auth migrated data has no user attribution; enforced at app layer when auth is active
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  number: varchar('number', { length: 100 }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'restrict' }).notNull(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'set null' }),
  currency: varchar('currency', { length: 3 }).notNull(), // ISO 4217 (e.g. USD)
  subtotal: integer('subtotal').notNull(), // cents
  taxRate: integer('tax_rate').notNull(), // e.g. 5 for 5%
  tax: integer('tax').notNull(), // cents
  total: integer('total').notNull(), // cents
  status: invoiceStatusEnum('status').notNull(),
  issuedDate: date('issued_date', { mode: 'string' }).notNull(),
  dueDate: date('due_date', { mode: 'string' }).notNull(),
  paidDate: date('paid_date', { mode: 'string' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_invoices_org_id').on(table.orgId),
  index('idx_invoices_created_by_user_id').on(table.createdByUserId),
  index('idx_invoices_contact_id').on(table.contactId),
  index('idx_invoices_shipment_id').on(table.shipmentId),
]);

// ==========================================
// 8. INVOICE LINE ITEMS (Normalized nested array)
// ==========================================
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // cents
  total: integer('total').notNull(), // cents
}, (table) => [
  index('idx_invoice_line_items_invoice_id').on(table.invoiceId),
]);
