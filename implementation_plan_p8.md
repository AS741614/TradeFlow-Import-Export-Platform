# Implementation Plan - Phase 8: Next.js API Routes and Queries

Provide Next.js App Router API route handlers that expose CRUD operations for every business entity, backed by PostgreSQL via Drizzle ORM, utilizing connection pooling and strict multi-tenancy scoping.

## User Review Required

> [!IMPORTANT]
> **API Complexity and Scope**:
> This prompt requires creating CRUD API endpoints for all 13 business entities (contacts, shipments, invoices, products, compliance, cost-items, financial-projections, outreach-contacts, email-templates, campaigns, business-plan, swot, tasks), totaling 26 route files (65 endpoints).
> To manage complexity and context window size, we propose implementing all 13 entities following a highly consistent, standardized pattern. However, if desired, we can split this task into:
> - **Prompt 8a**: Operations and Core entities (contacts, shipments, invoices, products, compliance)
> - **Prompt 8b**: Finance, Outreach, Business Plan, SWOT, and Tasks

> [!NOTE]
> **Multi-Tenancy Scoping**:
> All queries, inserts, updates, and deletes are strictly scoped using a `DEFAULT_ORG_ID` constant. Auth integrations in Prompt 10 will swap this constant for the authenticated user's session org ID. A seed script `scripts/seed-default-org.ts` will run once to ensure the default organization and a default user exist in the database.

## Proposed Changes

### Database Client & Constants
Refactor the database client to support connection pooling and declare the tenant constants.

#### [MODIFY] [client.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/client.ts)
- Add connection pooling configuration (`max: 10`) to `pg.Pool`.
- Export `pool` or expose it safely if needed, ensuring it is reused.

#### [NEW] [constants.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/constants.ts)
- Export `DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'`
- Export `DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002'`

#### [NEW] [seed-default-org.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/scripts/seed-default-org.ts)
- Seed script that inserts `DEFAULT_ORG_ID` into `orgs` and `DEFAULT_USER_ID` into `users` if they do not exist.
- Add `"db:seed": "tsx scripts/seed-default-org.ts"` to `package.json`.

---

### Request Validation (Zod)
Create Zod validation schemas for all business entities.

#### [NEW] [validation schemas](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/)
Create one schema file per entity containing insert and update validation schemas:
- `contacts.ts`
- `shipments.ts`
- `invoices.ts`
- `products.ts`
- `compliance.ts`
- `cost-items.ts`
- `financial-projections.ts`
- `outreach-contacts.ts`
- `email-templates.ts`
- `campaigns.ts`
- `business-plan.ts`
- `swot.ts`
- `tasks.ts`

---

### Database Queries
Create reusable query functions implementing uniform tenant (`org_id`) scoping.

#### [NEW] [query helpers](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/)
Implement clean query wrappers executing inside Drizzle's environment:
- For simple tables (e.g. `contacts`, `products`, `tasks`): execute standard CRUD scoped by `orgId = DEFAULT_ORG_ID`.
- For relations (e.g. `shipments` containing `shipmentProducts` and `shipmentDocuments`): handle transactional inserts, nested reads, and cascade snap-shotting on delete.
- For deletion: first fetch the record (and children), write its full snapshot as JSONB to `deletion_logs`, then hard delete within a single transaction.

---

### API Route Handlers
Create route files containing App Router handlers:
- `GET` list: returns `{ data: T[] }`
- `POST` create: validates body with Zod, inserts, returns `{ data: T }` (201)
- `GET` one: returns `{ data: T }` or 404
- `PATCH` update: validates partial body with Zod, updates, returns `{ data: T }`
- `DELETE`: performs transaction delete with snapshot log, returns `{ data: T }`

#### [NEW] [route.ts and [id]/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/)
Create route files for:
- `contacts`
- `shipments`
- `invoices`
- `products`
- `compliance`
- `cost-items`
- `financial-projections`
- `outreach-contacts`
- `email-templates`
- `campaigns`
- `business-plan`
- `swot`
- `tasks`

---

### Project Configuration
#### [MODIFY] [package.json](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/package.json)
- Add dependencies: `zod` and `drizzle-zod`.
- Add script: `"db:seed": "tsx scripts/seed-default-org.ts"`.

#### [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
- Document API routes, directory layout, validation design, and seeding commands.

#### [MODIFY] [AGENTS.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/AGENTS.md)
- Document the API request/response format, tenant isolation guards, and query helper conventions.

---

## Verification Plan

### Automated Tests
- Run database seeding: `npm run db:seed`.
- Run integration tests under `src/app/api/__tests__/` to verify all GET, POST, PATCH, and DELETE endpoints:
  - Proves status codes: 200, 201, 400 (validation failure), 404 (not found).
  - Proves multi-tenancy enforcement.
  - Proves `deletion_logs` transaction auditing.
- Run complete test suite: `npm test` and verify 145+ tests pass.
- Run type check: `npx tsc --noEmit`
- Run lint: `npm run lint`
- Run production build: `npm run build`

### Manual Verification
- Execute curl/HTTP requests against running local server to confirm API responses match standard formatting: `{ data: ... }`.
