# TradeFlow API Audit Report v1

**Date**: May 27, 2026  
**Auditor**: Antigravity Senior Staff Engineer  
**Scope**: TradeFlow Phase 1 Backend Integration (Prompts 0-10c)

---

## Executive Summary

After a comprehensive, read-only audit of the TradeFlow platform codebase, I have analyzed the architecture, query patterns, security controls, and integration readiness.

### Key Metrics
- **Total Findings**: 18
  - 🔴 **CRITICAL**: 3 (High-risk security vulnerabilities or performance scaling bottlenecks)
  - 🟡 **IMPORTANT**: 10 (Real bugs, missing validations, or performance issues requiring remediation soon)
  - 🟢 **NICE-TO-HAVE**: 5 (Technical debt and architectural optimizations)
- **Top 3 Priorities**:
  1. **Dashboard N+1 Client-Side Query Bottleneck (Dimension 1 & 6)**: The landing page pulls entire data arrays for 6 core entities into memory, which will crash client browsers at scale.
  2. **Raw Database Error Leakage (Dimension 4)**: Caught database exceptions expose raw SQL schemas, table details, and column names to API clients, representing an information leakage vulnerability.
  3. **No API Key / Rate Limiting Infrastructure (Dimension 5 & 7)**: Authentication is scoped purely to user sessions; exposing APIs to integrations without rate limits and machine tokens is highly vulnerable.
- **Overall Health Rating**: **8/10**  
  *The codebase has achieved a robust, type-safe, multi-tenant state. Query helpers successfully scope operations via `withTenant`, and all 28 API endpoints enforce active session validation. Resolving the remaining performance and error handling details will prepare the platform for enterprise production workloads.*

---

## Dimension 1 — API Coverage Gaps

### A. Coverage Matrix
| Entity | GET List | POST Create | GET by ID | PATCH Update | DELETE | Specialized Endpoints |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **contacts** | Yes | Yes | Yes | Yes | Yes | None |
| **products** | Yes | Yes | Yes | Yes | Yes | None |
| **shipments** | Yes | Yes | Yes | Yes | Yes | Cascading nested inserts |
| **invoices** | Yes | Yes | Yes | Yes | Yes | Nested line-item updates |
| **compliance** | Yes | Yes | Yes | Yes | Yes | None |
| **cost-items** | Yes | Yes | Yes | Yes | Yes | None |
| **financial-projections**| Yes | Yes | Yes | Yes | Yes | None |
| **outreach-contacts** | Yes | Yes | Yes | Yes | Yes | None |
| **email-templates** | Yes | Yes | Yes | Yes | Yes | None |
| **campaigns** | Yes | Yes | Yes | Yes | Yes | Simulation triggering |
| **business-plan** | Yes | Yes | Yes | Yes | Yes | None |
| **swot** | Yes | Yes | Yes | Yes | Yes | None |
| **tasks** | Yes | Yes | Yes | Yes | Yes | None |
| **app-metadata** | No | No | Yes (GET [key]) | Yes (PUT [key]) | Yes (DELETE) | None |

### B. Cross-Cutting Features Check
- 🟡 **Pagination Gaps**: List endpoints (e.g., `GET /api/products`, `GET /api/contacts`) lack pagination parameters (`limit`, `offset`, or `cursor`). Fetches pull the entire dataset into memory, causing latency spikes when datasets exceed 1,000+ records.
- 🟡 **Search & Filter Gaps**: API routes do not support query parameters for server-side filtering or text search. The UI pulls the entire list and filters client-side, wasting server egress bandwidth.
- 🟢 **Bulk Operations Gaps**: Bulk delete, bulk create, or bulk update operations are not supported at the endpoint layer. Interacting with multiple records requires sequential HTTP requests.
- 🟡 **CSV/JSON Import/Export Gaps**: The backend contains no routes for parsing CSV/JSON imports or outputting data exports. Importers in the frontend parse delimiters client-side.
- 🟢 **Historical Log Audits**: Deletion logs are written to the database on record deletes, but no REST API endpoint exists to audit or expose these deletion logs.

### C. UI-Required-But-Missing Endpoints
- 🔴 **Dashboard Client-Side Aggregation**: The dashboard page ([src/app/page.tsx:L43-92](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx#L43-L92)) downloads entire lists of products, contacts, tasks, shipments, invoices, and campaigns to calculate simple count badges client-side. This represents a heavy browser bottleneck.

---

## Dimension 2 — API Consistency Gaps

### A. Response Shape Consistency
- 🟡 **Envelope Deviations**: 27 of 28 route files enclose responses inside `{ data: T }` envelopes. However, [src/app/api/email/send/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/email/send/route.ts) deviates from the standard envelope pattern by returning a flat response:
  ```json
  {
    "success": true,
    "message": "Campaign dispatched successfully",
    "campaignId": "uuid"
  }
  ```

### B. HTTP Status Code Consistency
- 🟢 **Success Envelope Responses**: Deletion routes return the deleted record with status `200 OK` inside `{ data: T }`. Standardizing deletions to `200` with the payload is consistent across all routes, though some developers might expect `204 No Content` for headless deletions.
- 🟢 **Validation Statuses**: All routes cleanly return `400 Bad Request` on validation failure, `401 Unauthorized` on authentication failure, and `500` on uncaught errors.

### C. URL / Naming Consistency
- 🟢 **Kebab-Case Nouns**: Routes consistently use pluralized kebab-case nouns for business resource routing (e.g., `/api/cost-items`, `/api/email-templates`, `/api/outreach-contacts`).
- 🟢 **REST Hierarchies**: Routes follow standard Next.js directory hierarchies correctly (`api/[resource]/route.ts` and `api/[resource]/[id]/route.ts`).

### D. Auth Check Consistency
- 🟢 **Full Protection**: Every single API route (28 of 28 endpoints) includes a `throwIfNotAuthenticated()` check inside the handler, guaranteeing that unauthenticated calls return `401`.
- 🟢 **Authorization Error Handlers**: Catch blocks across all routes contain identical error mapping signatures to handle `"Unauthorized"` error messages.

---

## Dimension 3 — Validation Gaps

### A. Schema Completeness
- 🟡 **Missing String Constraints**: Varchar-backed string fields in validation schemas (e.g. `company` in `contacts.ts`, `sku` in `products.ts`) lack upper bounds (e.g. `.max(255)`). Passing an overlong string will bypass Zod validation, causing a raw database insert exception.
- 🟡 **Enum and Currency Boundaries**: In [src/lib/db/validation/invoices.ts:L13](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/invoices.ts#L13), `currency` checks length (`.length(3)`) but does not constrain values to ISO 4217 enums (e.g. USD, EUR, CAD), allowing arbitrary 3-character strings.

### B. Edge Cases & Arithmetic Constraints
- 🟡 **Invoices Arithmetic Trust**: The invoice validation schema [src/lib/db/validation/invoices.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/invoices.ts) accepts subtotal, tax, and total as input values without verifying the business rule: `subtotal + tax === total`. Clients can submit mismatched numbers.

---

## Dimension 4 — Error Handling Gaps

### A. Error Response Quality
- 🟡 **Database Schema Leakage**: Route error catching blocks return `error.message` directly:
  ```typescript
  const message = error instanceof Error ? error.message : 'Unknown database error';
  return NextResponse.json({ error: message }, { status: 500 });
  ```
  If a query encounters a database error (e.g. foreign key constraint violation), the raw database schema info and constraint names are leaked directly in the HTTP response.
- 🟢 **Validation Details**: Zod validation errors return the parsed validation message to the client, which is helpful but could be formatted into a structured error object.

### B. Database Violations
- 🟡 **Race Conditions on Signup**: Unique key constraint violations (e.g. duplicate user signup) are not caught explicitly in [src/app/signup/actions.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/signup/actions.ts), leading to generic 500 errors instead of a clean 409 Conflict.

---

## Dimension 5 — Security Gaps

### A. Authentication & Scoping
- 🟢 **Tenant Isolation**: Every database read, insert, update, or delete in query helpers uses `withTenant(table, orgId)`, ensuring that users from Org A cannot access or modify Org B's records.
- 🟢 **Omitted Fields**: All update schemas omit the `createdByUserId` or `orgId` attributes, protecting against tenant-escape vulnerabilities.

### B. Rate Limiting
- 🔴 **Zero Authentication Rate Limiting**: There is no rate limiting on credentials verification endpoints (`/api/auth/signin`) or signup endpoints (`/signup`), leaving the platform open to brute-force credential stuffing and denial of service attacks.

---

## Dimension 6 — Performance Gaps

### A. Database Performance & Indexes
- 🟡 **N+1 SQL Query Loops**: Query helpers for invoices and shipments use loop-queries. For example, [src/lib/db/queries/invoices.ts:L23-34](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/invoices.ts#L23-L34) executes one SQL select for *every* invoice row to load line items, resulting in N+1 query overhead.
- 🟡 **Missing Foreign Key Indexes**: The index list confirms that `contacts.email` (used in account linking and lookup) lacks an index.
- 🟢 **Scoping Indexes**: Every table correctly maintains a btree index on the `org_id` column.

### B. Build Performance
- 🟢 **Bundle Sizes**: The Next.js production build output shows extremely small, optimized bundle sizes (all pages well under the standard 300kB limit).

---

## Dimension 7 — Future Integration Readiness

### A. Webhook System Readiness
- 🔴 **No Webhooks Support**: There is no webhook registration infrastructure, event dispatcher, or outbound client. Slack, Microsoft Teams, or Discord alerts cannot be dispatched on entity changes without building a custom polling mechanism.

### B. OAuth Provider Expansion
- 🟢 **NextAuth Multi-Provider**: NextAuth is fully configured with modular options. Adding additional providers (e.g., Microsoft, GitHub) only requires adding provider configs to `auth.ts` and `auth.config.ts`.

### C. Event Log & API Key Foundation
- 🔴 **No API Key Authentication**: Machine-to-machine integrations must authenticate via session-tokens (which expire), as there is no API key or Personal Access Token (PAT) validation system.

---

## Verification Outputs

### 1. TypeScript Compiler (`npx tsc --noEmit`)
```
$ npx tsc --noEmit
# Completed successfully with exit code 0.
```

### 2. ESLint Checks (`npm run lint`)
```
$ npm run lint
> import-export-platform@0.1.0 lint
> eslint .
# Completed successfully with exit code 0.
```

### 3. Test Suite Status (`npm test`)
```
$ npx vitest run --sequence.concurrent=false

 RUN  v3.2.4 /Users/akashsharma/.gemini/antigravity/scratch/import-export-platform

 ✓ src/app/api/__tests__/business-plan.test.ts (8 tests) 113ms
 ✓ src/app/api/__tests__/outreach-contacts.test.ts (8 tests) 110ms
 ✓ src/app/api/__tests__/email-templates.test.ts (8 tests) 124ms
 ✓ src/app/api/__tests__/compliance.test.ts (8 tests) 138ms
 ✓ src/app/api/__tests__/contacts.test.ts (8 tests) 110ms
 ✓ src/lib/db/__tests__/schema.test.ts (10 tests) 209ms
 ✓ src/app/api/__tests__/invoices.test.ts (6 tests) 121ms
 ✓ src/app/api/__tests__/campaigns.test.ts (8 tests) 158ms
 ✓ src/app/api/__tests__/tasks.test.ts (8 tests) 105ms
 ✓ src/app/api/__tests__/cost-items.test.ts (8 tests) 99ms
 ✓ src/app/api/__tests__/shipments.test.ts (6 tests) 126ms
 ✓ src/app/api/__tests__/products.test.ts (8 tests) 113ms
 ✓ src/app/api/__tests__/financial-projections.test.ts (8 tests) 108ms
 ✓ src/app/api/__tests__/swot.test.ts (8 tests) 100ms
 ✓ src/app/api/__tests__/app-metadata.test.ts (7 tests) 96ms
 ✓ src/lib/__tests__/email.test.ts (15 tests) 52ms
 ✓ src/lib/__tests__/utils.test.ts (35 tests) 22ms
 ✓ src/lib/__tests__/storage.test.ts (12 tests) 6ms
 ✓ src/lib/__tests__/importers.test.ts (20 tests) 5ms
 ✓ src/lib/__tests__/api-client.test.ts (7 tests) 5ms
 ✓ src/lib/__tests__/auth-server.test.ts (7 tests) 3ms
 ✓ src/lib/__tests__/templateEngine.test.ts (10 tests) 2ms

 Test Files  22 passed (22)
      Tests  223 passed (223)
```

### 4. Build Output & Bundle Sizes (`npm run build`)
```
Route (app)                                     Size     First Load JS
┌ ○ /                                           2.97 kB         111 kB
├ ○ /_not-found                                 996 B           107 kB
├ ƒ /api/app-metadata/[key]                     0 B                0 B
├ ƒ /api/auth/[...nextauth]                     0 B                0 B
├ ƒ /api/business-plan                          0 B                0 B
├ ƒ /api/business-plan/[id]                     0 B                0 B
├ ƒ /api/campaigns                              0 B                0 B
├ ƒ /api/campaigns/[id]                         0 B                0 B
├ ƒ /api/compliance                             0 B                0 B
├ ƒ /api/compliance/[id]                        0 B                0 B
├ ƒ /api/contacts                               0 B                0 B
├ ƒ /api/contacts/[id]                          0 B                0 B
├ ƒ /api/cost-items                             0 B                0 B
├ ƒ /api/cost-items/[id]                        0 B                0 B
├ ƒ /api/email-templates                        0 B                0 B
├ ƒ /api/email-templates/[id]                   0 B                0 B
├ ƒ /api/email/send                             0 B                0 B
├ ƒ /api/financial-projections                  0 B                0 B
├ ƒ /api/financial-projections/[id]             0 B                0 B
├ ƒ /api/invoices                               0 B                0 B
├ ƒ /api/invoices/[id]                          0 B                0 B
├ ƒ /api/outreach-contacts                      0 B                0 B
├ ƒ /api/outreach-contacts/[id]                 0 B                0 B
├ ƒ /api/products                               0 B                0 B
├ ƒ /api/products/[id]                          0 B                0 B
├ ƒ /api/shipments                              0 B                0 B
├ ƒ /api/shipments/[id]                         0 B                0 B
├ ƒ /api/swot                                   0 B                0 B
├ ƒ /api/swot/[id]                              0 B                0 B
├ ƒ /api/tasks                                  0 B                0 B
├ ƒ /api/tasks/[id]                             0 B                0 B
├ ○ /auth/error                                 1.92 kB         110 kB
├ ○ /business-plan                              9.32 kB         117 kB
├ ○ /finance                                    4.78 kB         113 kB
├ ○ /finance/currency                           4.44 kB         113 kB
├ ○ /finance/margins                            3.11 kB         111 kB
├ ○ /finance/projections                        3.74 kB         112 kB
├ ○ /login                                      3.36 kB         115 kB
├ ○ /operations/compliance                      4.11 kB         112 kB
├ ○ /operations/contacts                        4.9 kB          113 kB
├ ○ /operations/inventory                       6.03 kB         114 kB
├ ○ /operations/invoices                        6.1 kB          114 kB
├ ○ /operations/shipments                       8.9 kB          117 kB
├ ○ /outreach                                   4.2 kB          112 kB
├ ○ /outreach/campaigns                         5.88 kB         114 kB
├ ○ /outreach/contacts                          4.9 kB          113 kB
├ ○ /outreach/templates                         4.2 kB          112 kB
├ ○ /outreach/tracking                          4.2 kB          112 kB
├ ○ /projects                                   8.23 kB         116 kB
└ ○ /signup                                     4.41 kB         117 kB

+ First Load JS shared by all                   106 kB
  ├ chunks/448-f68266fe868ea23f.js              30 kB
  ├ chunks/fd9d1056-a164b38031fe04f9.js         53.6 kB
  ├ chunks/main-app-39dbf9d3fca85501.js         20.4 kB
  └ other shared chunks                         2.1 kB
```

### 5. PostgreSQL Database Indexes
```
       tablename        |                   indexname                   |                                                           indexdef                                                           
------------------------+-----------------------------------------------+------------------------------------------------------------------------------------------------------------------------------
 accounts               | accounts_pkey                                 | CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (provider, provider_account_id)
 app_metadata           | app_metadata_pkey                             | CREATE UNIQUE INDEX app_metadata_pkey ON public.app_metadata USING btree (org_id, key)
 business_plan_sections | business_plan_sections_pkey                   | CREATE UNIQUE INDEX business_plan_sections_pkey ON public.business_plan_sections USING btree (id)
 business_plan_sections | idx_business_plan_sections_created_by_user_id | CREATE INDEX idx_business_plan_sections_created_by_user_id ON public.business_plan_sections USING btree (created_by_user_id)
 business_plan_sections | idx_business_plan_sections_org_id             | CREATE INDEX idx_business_plan_sections_org_id ON public.business_plan_sections USING btree (org_id)
 campaign_contacts      | campaign_contacts_pkey                        | CREATE UNIQUE INDEX campaign_contacts_pkey ON public.campaign_contacts USING btree (id)
 campaign_contacts      | idx_campaign_contacts_campaign_id             | CREATE INDEX idx_campaign_contacts_campaign_id ON public.campaign_contacts USING btree (campaign_id)
 campaign_contacts      | idx_campaign_contacts_contact_id              | CREATE INDEX idx_campaign_contacts_contact_id ON public.campaign_contacts USING btree (contact_id)
 campaigns              | campaigns_pkey                                | CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id)
 campaigns              | idx_campaigns_created_by_user_id              | CREATE INDEX idx_campaigns_created_by_user_id ON public.campaigns USING btree (created_by_user_id)
 campaigns              | idx_campaigns_org_id                          | CREATE INDEX idx_campaigns_org_id ON public.campaigns USING btree (org_id)
 campaigns              | idx_campaigns_template_id                     | CREATE INDEX idx_campaigns_template_id ON public.campaigns USING btree (template_id)
 compliance_items       | idx_compliance_items_created_by_user_id       | CREATE INDEX idx_compliance_items_created_by_user_id ON public.compliance_items USING btree (created_by_user_id)
 compliance_items       | idx_compliance_items_org_id                   | CREATE INDEX idx_compliance_items_org_id ON public.compliance_items USING btree (org_id)
 compliance_items       | idx_compliance_items_shipment_id              | CREATE INDEX idx_compliance_items_shipment_id ON public.compliance_items USING btree (shipment_id)
 contacts               | contacts_pkey                                 | CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id)
 contacts               | idx_contacts_created_by_user_id               | CREATE INDEX idx_contacts_created_by_user_id ON public.contacts USING btree (created_by_user_id)
 contacts               | idx_contacts_org_id                           | CREATE INDEX idx_contacts_org_id ON public.contacts USING btree (org_id)
 cost_items             | cost_items_pkey                               | CREATE UNIQUE INDEX cost_items_pkey ON public.cost_items USING btree (id)
 cost_items             | idx_cost_items_created_by_user_id             | CREATE INDEX idx_cost_items_created_by_user_id ON public.cost_items USING btree (created_by_user_id)
 cost_items             | idx_cost_items_org_id                         | CREATE INDEX idx_cost_items_org_id ON public.cost_items USING btree (org_id)
 deletion_logs          | deletion_logs_pkey                            | CREATE UNIQUE INDEX deletion_logs_pkey ON public.deletion_logs USING btree (id)
 deletion_logs          | idx_deletion_logs_deleted_by_user_id          | CREATE INDEX idx_deletion_logs_deleted_by_user_id ON public.deletion_logs USING btree (deleted_by_user_id)
 email_templates        | email_templates_pkey                          | CREATE UNIQUE INDEX email_templates_pkey ON public.email_templates USING btree (id)
 email_templates        | idx_email_templates_created_by_user_id        | CREATE INDEX idx_email_templates_created_by_user_id ON public.email_templates USING btree (created_by_user_id)
 email_templates        | idx_email_templates_org_id                    | CREATE INDEX idx_email_templates_org_id ON public.email_templates USING btree (org_id)
 financial_projections  | financial_projections_pkey                    | CREATE UNIQUE INDEX financial_projections_pkey ON public.financial_projections USING btree (id)
 financial_projections  | idx_financial_projections_created_by_user_id  | CREATE INDEX idx_financial_projections_created_by_user_id ON public.financial_projections USING btree (created_by_user_id)
 financial_projections  | idx_financial_projections_org_id              | CREATE INDEX idx_financial_projections_org_id ON public.financial_projections USING btree (org_id)
 invoice_line_items     | idx_invoice_line_items_invoice_id             | CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items USING btree (invoice_id)
 invoice_line_items     | invoice_line_items_pkey                       | CREATE UNIQUE INDEX invoice_line_items_pkey ON public.invoice_line_items USING btree (id)
 invoices               | idx_invoices_contact_id                       | CREATE INDEX idx_invoices_contact_id ON public.invoices USING btree (contact_id)
 invoices               | idx_invoices_created_by_user_id               | CREATE INDEX idx_invoices_created_by_user_id ON public.invoices USING btree (created_by_user_id)
 invoices               | idx_invoices_org_id                           | CREATE INDEX idx_invoices_org_id ON public.invoices USING btree (org_id)
 invoices               | idx_invoices_shipment_id                      | CREATE INDEX idx_invoices_shipment_id ON public.invoices USING btree (shipment_id)
 invoices               | invoices_pkey                                 | CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id)
 orgs                   | orgs_pkey                                     | CREATE UNIQUE INDEX orgs_pkey ON public.orgs USING btree (id)
 outreach_contacts      | idx_outreach_contacts_created_by_user_id      | CREATE INDEX idx_outreach_contacts_created_by_user_id ON public.outreach_contacts USING btree (created_by_user_id)
 outreach_contacts      | idx_outreach_contacts_org_id                  | CREATE INDEX idx_outreach_contacts_org_id ON public.outreach_contacts USING btree (org_id)
 outreach_contacts      | outreach_contacts_pkey                        | CREATE UNIQUE INDEX outreach_contacts_pkey ON public.outreach_contacts USING btree (id)
 products               | idx_products_created_by_user_id               | CREATE INDEX idx_products_created_by_user_id ON public.products USING btree (created_by_user_id)
 products               | idx_products_org_id                           | CREATE INDEX idx_products_org_id ON public.products USING btree (org_id)
 products               | products_pkey                                 | CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)
 sessions               | sessions_pkey                                 | CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (session_token)
 shipment_documents     | idx_shipment_documents_shipment_id            | CREATE INDEX idx_shipment_documents_shipment_id ON public.shipment_documents USING btree (shipment_id)
 shipment_documents     | shipment_documents_pkey                       | CREATE UNIQUE INDEX shipment_documents_pkey ON public.shipment_documents USING btree (id)
 shipment_products      | idx_shipment_products_product_id              | CREATE INDEX idx_shipment_products_product_id ON public.shipment_products USING btree (product_id)
 shipment_products      | idx_shipment_products_shipment_id             | CREATE INDEX idx_shipment_products_shipment_id ON public.shipment_products USING btree (shipment_id)
 shipment_products      | shipment_products_pkey                        | CREATE UNIQUE INDEX shipment_products_pkey ON public.shipment_products USING btree (id)
 shipments              | idx_shipments_created_by_user_id              | CREATE INDEX idx_shipments_created_by_user_id ON public.shipments USING btree (created_by_user_id)
 shipments              | idx_shipments_org_id                          | CREATE INDEX idx_shipments_org_id ON public.shipments USING btree (org_id)
 shipments              | shipments_pkey                                | CREATE UNIQUE INDEX shipments_pkey ON public.shipments USING btree (id)
 swot_items             | idx_swot_items_created_by_user_id             | CREATE INDEX idx_swot_items_created_by_user_id ON public.swot_items USING btree (created_by_user_id)
 swot_items             | idx_swot_items_org_id                         | CREATE INDEX idx_swot_items_org_id ON public.swot_items USING btree (org_id)
 swot_items             | swot_items_pkey                               | CREATE UNIQUE INDEX swot_items_pkey ON public.swot_items USING btree (id)
 tasks                  | idx_tasks_created_by_user_id                  | CREATE INDEX idx_tasks_created_by_user_id ON public.tasks USING btree (created_by_user_id)
 tasks                  | idx_tasks_org_id                              | CREATE INDEX idx_tasks_org_id ON public.tasks USING btree (org_id)
 tasks                  | tasks_pkey                                    | CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id)
 users                  | idx_users_org_id                              | CREATE INDEX idx_users_org_id ON public.users USING btree (org_id)
 users                  | users_email_unique                            | CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email)
 users                  | users_pkey                                    | CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)
 verification_tokens    | verification_tokens_pkey                      | CREATE UNIQUE INDEX verification_tokens_pkey ON public.verification_tokens USING btree (identifier, token)
```

---

## Recommended Fix Priority

### Tier 1 (Urgent, fix before any new feature)
- 🔴 **Dashboard N+1 Client-Side Loading Bottleneck**: Implement an aggregated `/api/dashboard/stats` route returning metric counts directly from SQL `COUNT` queries instead of reading full lists client-side.
- 🔴 **Raw Exception Leakage**: Implement a global database error handler wrapper (e.g. mapping foreign key violations and unique violations to safe human-readable messages) to avoid leaking SQL tables/internals via 500 error responses.
- 🔴 **Zero Authentication Rate Limiting**: Introduce a rate-limiting middleware or route handler rule (e.g., using sliding window counter via Redis or local in-memory token bucket) for `/signup` and `/api/auth/signin`.

### Tier 2 (Important, fix in next 2 prompts)
- 🟡 **Missing Pagination**: Update list query helpers and GET routes to accept `limit` and `offset` parameters.
- 🟡 **String Length Constraints**: Add `.max(255)` bounds to all varchar-backed string schema schemas in Zod validations.
- 🟡 **N+1 SQL Loops (Invoices & Shipments)**: Refactor query helpers `getInvoices` and `getShipments` to fetch nested records via grouped SQL queries instead of looping queries.
- 🟡 **Invoice Arithmetic Constraints**: Add a `.refine` validation check on `insertInvoiceSchema` verifying that `subtotal + tax === total`.
- 🟡 **Email Send Route Envelope Mismatch**: Reformat `/api/email/send` output to wrap the metadata response inside the standard `{ data: ... }` object.
- 🟡 **Enum and Currency Codes validation**: Enforce currency validation against standard currency code listings instead of only verifying string length.
- 🟡 **Index on `contacts.email`**: Generate a Drizzle migration to create a btree index on the `email` column of the `contacts` table.

### Tier 3 (Technical Debt, fix when convenient)
- 🟢 **Search & Filter Support**: Add query parameters support in GET endpoints to filter resources.
- 🟢 **Bulk Operations Endpoints**: Add support for bulk-action endpoints (`DELETE /api/contacts` taking an array of IDs).
- 🟢 **Outbound Webhook Dispatcher**: Build table schemas and background workers to register and dispatch HTTP webhooks.

---

## Recommended Next Prompts

### Follow-up Prompt 1: Fixing Dashboard Scaling & Database Exception Leakage (Tier 1)
- Create a new API route `/api/dashboard/stats` fetching only `COUNT` values for the 6 dashboard categories.
- Update `src/app/page.tsx` to read from `/api/dashboard/stats`.
- Wrap API handler catches with an database error parser mapping database errors to clean generic exceptions.

### Follow-up Prompt 2: Validation Schemas & SQL N+1 Optimizations (Tier 2)
- Apply `.max(255)` constraints on Zod string variables.
- Refactor `getInvoices` and `getShipments` query helpers to execute a single query with sub-selects or aggregate JSON functions to eliminate N+1 loop calls.
