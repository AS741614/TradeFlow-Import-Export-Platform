# Implementation Plan — Phase 7: PostgreSQL Database Schema and Migrations

This plan defines the production-grade PostgreSQL database schema to be implemented via Drizzle ORM, mapping current TypeScript interfaces and STORAGE_KEYS into a multi-tenant relational schema.

## User Review Required

> [!IMPORTANT]
> - **Zero application code changes**: All client-side code and UI components remain completely untouched, operating on `localStorage` via `storage.ts`. Existing 105 tests are preserved.
> - **Multi-tenancy from Day One**: Every business table enforces tenancy with `org_id` (foreign key to `orgs`) and `created_by_user_id` (foreign key to `users`).
> - **Normalization Strategy**: Instead of keeping nested collections (e.g. `Shipment.products`, `Shipment.documents`, `Invoice.lineItems`) as arrays inside JSONB columns, we normalize them into proper relational join tables (`shipment_products`, `shipment_documents`, `invoice_line_items`) to ensure high relational index performance and integrity.
> - **Financial Fields Pinned to Cents**: All money/cost fields are converted to `integer` fields representing cents (e.g. `$10.50` -> `1050`). ISO 4217 currency codes are stored in separate columns (e.g. `USD`).

---

## Catalog Mappings

### 1. Domain → Table Mapping
We will define **16 tables** across 5 domains:

| Domain | Table Name | Purpose |
| :--- | :--- | :--- |
| **core** | `orgs` | Organization tenant list |
| **core** | `users` | User accounts belonging to organizations |
| **core** | `deletion_logs` | Audit trail for tracking hard-deleted records |
| **operations** | `products` | Inventory catalog items |
| **operations** | `contacts` | Directory of buyers, suppliers, or both |
| **operations** | `shipments` | Import/export shipments tracking |
| **operations** | `shipment_products` | Normalized junction table for products in a shipment |
| **operations** | `shipment_documents` | Normalized table tracking documents for a shipment |
| **operations** | `compliance_items` | Critical checklist entries for shipments and customs |
| **operations** | `invoices` | Transactional billing records |
| **operations** | `invoice_line_items` | Normalized table for invoice individual charges |
| **finance** | `cost_items` | Sourcing margins and landed costs tracking |
| **finance** | `financial_projections` | Monthly P&L estimation data |
| **outreach** | `outreach_contacts` | Contact directory for cold and warm emailing campaigns |
| **outreach** | `email_templates` | Composed email layouts with variable placeholders |
| **outreach** | `campaigns` | Sourcing email campaigns tracking and scheduling |
| **outreach** | `campaign_contacts` | normalised junction table tracking campaign receipt and status per contact |
| **business** | `business_plan_sections` | strategic SWOT and planning text sections |
| **business** | `swot_items` | Individual entries inside the SWOT matrix quadrants |
| **business** | `tasks` | Project management board cards (Kanban) |

*Note: `campaign_contacts` acts as the junction table normalized mapping, bringing the total expected table count to **17**.*

---

### 2. TypeScript Interface → Database Table Mapping

| Interface (in `types.ts`) | Target Table / Column | Mapping Details |
| :--- | :--- | :--- |
| `Product` | `products` | Maps directly. `unitCost` -> integer cents, `status` -> `product_status_enum`. |
| `Shipment` | `shipments` | Normalized. Nested `products` -> `shipment_products`. Nested `documents` -> `shipment_documents`. |
| `ShipmentProduct` | `shipment_products` | Normalised junction. |
| `ShipmentDocument` | `shipment_documents` | Normalized related table. `type` -> `shipment_doc_type_enum`. |
| `Invoice` | `invoices` | Normalized. Nested `lineItems` -> `invoice_line_items`. Money fields -> integer cents. |
| `LineItem` | `invoice_line_items` | Normalized related table. Money fields -> integer cents. |
| `Contact` | `contacts` | Maps directly. `type` -> `contact_type_enum`, `status` -> `contact_status_enum`. |
| `ComplianceItem` | `compliance_items` | Maps directly. `status` -> `shipment_doc_status_enum`. |
| `SwotItem` | `swot_items` | Maps directly. `category` -> `swot_category_enum`. |
| `BusinessPlanSection` | `business_plan_sections` | Maps directly. `order` -> `sort_order` integer. |
| `Task` | `tasks` | Maps directly. `status` -> `task_status_enum`, `priority` -> `task_priority_enum`, `tags` -> `jsonb` array. |
| `CostItem` | `cost_items` | Maps directly. `category` -> `cost_category_enum`, `amount` -> integer cents. |
| `FinancialProjection` | `financial_projections` | Maps directly. Money fields -> integer cents. |
| `OutreachContact` | `outreach_contacts` | Normalized. `tags` -> `jsonb` array, `campaignHistory` -> junction table `campaign_contacts`. |
| `EmailTemplate` | `email_templates` | Maps directly. `category` -> `template_category_enum`, `variables` -> `jsonb` array. |
| `Campaign` | `campaigns` | Normalized. `contactIds` & `stats` -> `campaign_contacts` junction / `campaigns.stats` `jsonb`. |
| `CampaignSchedule` | Embedded in `campaigns` | Columns `schedule_type`, `scheduled_at`, `sends_per_hour`. |
| `CampaignStats` | Embedded in `campaigns` | Stored as a single `jsonb` column `stats` on the campaign table. |

---

### 3. consolidated pgEnums Catalog
We will define **17 enums** in Drizzle schema:

| Enum Name | Target Values | Used By |
| :--- | :--- | :--- |
| `user_role_enum` | `'owner', 'admin', 'member'` | `users.role` |
| `product_status_enum` | `'in-stock', 'low-stock', 'out-of-stock'` | `products.status` |
| `shipment_status_enum` | `'ordered', 'shipped', 'in-transit', 'customs', 'delivered'` | `shipments.status` |
| `shipment_doc_type_enum` | `'bill-of-lading', 'commercial-invoice', 'packing-list', 'certificate-of-origin', 'customs-declaration', 'insurance', 'other'` | `shipment_documents.type` |
| `shipment_doc_status_enum` | `'pending', 'submitted', 'approved', 'rejected'` | `shipment_documents.status`, `compliance_items.status` |
| `invoice_status_enum` | `'draft', 'sent', 'paid', 'overdue'` | `invoices.status` |
| `contact_type_enum` | `'buyer', 'supplier', 'both'` | `contacts.type` |
| `contact_status_enum` | `'active', 'prospect', 'inactive'` | `contacts.status` |
| `swot_category_enum` | `'strength', 'weakness', 'opportunity', 'threat'` | `swot_items.category` |
| `task_status_enum` | `'todo', 'in-progress', 'review', 'done'` | `tasks.status` |
| `task_priority_enum` | `'low', 'medium', 'high', 'urgent'` | `tasks.priority` |
| `cost_category_enum` | `'purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other'` | `cost_items.category` |
| `email_status_enum` | `'pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'` | `campaign_contacts.status` |
| `outreach_source_enum` | `'csv', 'excel', 'json', 'manual'` | `outreach_contacts.source` |
| `template_category_enum` | `'introduction', 'catalog', 'quotation', 'follow-up', 're-engagement', 'notification', 'custom'` | `email_templates.category` |
| `campaign_status_enum` | `'draft', 'scheduled', 'sending', 'paused', 'completed'` | `campaigns.status` |
| `campaign_schedule_type_enum` | `'immediate', 'scheduled', 'drip'` | `campaigns.schedule_type` |

---

### 4. Foreign Key Directed Graph (FK Matrix)

```
[users] ───────────────> [orgs] <─────────────── [deletion_logs]
   ^                         ^                          │
   │ (created_by)            │ (org_id)                 v (deleted_by)
   ├─────────────────────────┼───────────────────── [users]
   │                         │
   ├─> [products] ───────────┤
   ├─> [contacts] ───────────┤
   ├─> [shipments] ──────────┤
   │      ^                  │
   │      ├─ [shipment_products] (Cascade) ─> [products] (Cascade)
   │      └─ [shipment_documents] (Cascade)
   │
   ├─> [compliance_items] ───┼─> [shipments] (Set Null)
   │
   ├─> [invoices] ───────────┼─> [contacts] (Restrict)
   │      │                  │
   │      └─ [invoice_line_items] (Cascade)
   │
   ├─> [cost_items] ─────────┤
   ├─> [financial_projections]
   │
   ├─> [outreach_contacts] ──┤
   ├─> [email_templates] ────┤
   │      ^                  │
   ├─> [campaigns] ──────────┼─> [email_templates] (Restrict)
   │      │
   │      └─ [campaign_contacts] (Cascade) ─> [outreach_contacts] (Cascade)
   │
   ├─> [business_plan_sections]
   ├─> [swot_items] ─────────┤
   └─> [tasks] ──────────────┘
```

*Indexes are established on all foreign key columns (`org_id`, `created_by_user_id`, and table-specific FKs).*

---

## Per-Table Schema Layouts

All schema tables are defined in TypeScript Drizzle DDL format:

### enums.ts
```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role_enum', ['owner', 'admin', 'member']);
export const productStatusEnum = pgEnum('product_status_enum', ['in-stock', 'low-stock', 'out-of-stock']);
export const shipmentStatusEnum = pgEnum('shipment_status_enum', ['ordered', 'shipped', 'in-transit', 'customs', 'delivered']);
export const shipmentDocTypeEnum = pgEnum('shipment_doc_type_enum', ['bill-of-lading', 'commercial-invoice', 'packing-list', 'certificate-of-origin', 'customs-declaration', 'insurance', 'other']);
export const shipmentDocStatusEnum = pgEnum('shipment_doc_status_enum', ['pending', 'submitted', 'approved', 'rejected']);
export const invoiceStatusEnum = pgEnum('invoice_status_enum', ['draft', 'sent', 'paid', 'overdue']);
export const contactTypeEnum = pgEnum('contact_type_enum', ['buyer', 'supplier', 'both']);
export const contactStatusEnum = pgEnum('contact_status_enum', ['active', 'prospect', 'inactive']);
export const swotCategoryEnum = pgEnum('swot_category_enum', ['strength', 'weakness', 'opportunity', 'threat']);
export const taskStatusEnum = pgEnum('task_status_enum', ['todo', 'in-progress', 'review', 'done']);
export const taskPriorityEnum = pgEnum('task_priority_enum', ['low', 'medium', 'high', 'urgent']);
export const costCategoryEnum = pgEnum('cost_category_enum', ['purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other']);
export const emailStatusEnum = pgEnum('email_status_enum', ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']);
export const outreachSourceEnum = pgEnum('outreach_source_enum', ['csv', 'excel', 'json', 'manual']);
export const templateCategoryEnum = pgEnum('template_category_enum', ['introduction', 'catalog', 'quotation', 'follow-up', 're-engagement', 'notification', 'custom']);
export const campaignStatusEnum = pgEnum('campaign_status_enum', ['draft', 'scheduled', 'sending', 'paused', 'completed']);
export const campaignScheduleTypeEnum = pgEnum('campaign_schedule_type_enum', ['immediate', 'scheduled', 'drip']);
```

### core.ts
- **`orgs`**:
  ```typescript
  export const orgs = pgTable('orgs', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    country: varchar('country', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  });
  ```
- **`users`**:
  ```typescript
  export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    orgId: uuid('org_id').references(() => orgs.id).notNull(),
    role: userRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  });
  ```
- **`deletion_logs`**:
  ```typescript
  export const deletionLogs = pgTable('deletion_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id').notNull(),
    deletedData: jsonb('deleted_data').notNull(),
    deletedByUserId: uuid('deleted_by_user_id').references(() => users.id).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    reason: text('reason'),
  });
  ```

### operations.ts
Contains schemas for `products`, `contacts`, `shipments`, `shipment_products`, `shipment_documents`, `compliance_items`, `invoices`, and `invoice_line_items`.
Dates and Timestamps use `{ mode: 'string' }` to returns string results matching Typescript interface expectations.

### finance.ts
Contains schemas for `cost_items` and `financial_projections`.

### outreach.ts
Contains schemas for `outreach_contacts`, `email_templates`, `campaigns`, and `campaign_contacts`.

### business.ts
Contains schemas for `business_plan_sections`, `swot_items`, and `tasks`.

---

## Verification Plan

### 1. Schema Smoke Test Plan (`src/lib/db/__tests__/schema.test.ts`)
We will write a test suite verify that:
- Drizzle client boots successfully.
- Schema definitions are valid.
- We can connect to the running container and successfully insert/select mock records from `orgs`, `users`, and a subset of business tables.
- Foreign key constraints correctly block orphan inserts.

### 2. Manual Migration Checks
- Run `npx drizzle-kit generate` to generate the migration file `drizzle/0000_*.sql` and inspect it.
- Run `npx drizzle-kit migrate` (or apply the SQL migration directly) to execute the DDL in our Postgres container.
- Connect via `psql` to check `\dt` and `\dT` logs.
- Run typechecks and tests (`npm test` checking 105 tests + schema tests).
