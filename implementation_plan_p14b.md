# Implementation Plan - Phase 14B: Audit Tier 3 Scope

This plan addresses all remaining Audit Tier 3 requirements, incorporating whitelisted searching/sorting, database aggregate queries, transactional bulk-deletion with reference checks, bulk-import endpoints, the `audit-logger.ts` utility library, activity log viewing endpoints, and aggregate index optimizations.

---

## User Review Required

> [!IMPORTANT]
> - **SQL-Based Aggregations (Drizzle)**: Aggregate statistics for invoices, shipments, and contacts will be computed directly in PostgreSQL using `GROUP BY` and aggregation functions (`SUM`, `COUNT`, `AVG`, `CASE WHEN`). In-memory aggregation is discarded to ensure scalability.
> - **Index Migration Approval Pause**: Prior to applying index additions, the SQL migration code will be printed in the chat for confirmation.
> - **PATCH Optimization**: Update operations (PATCH) will select the row before the update, then use Drizzle's `.returning()` clause on the `UPDATE` query to fetch the modified record in a single database round-trip.

---

## Proposed Changes

### Component 1: Aggregate Performance Indexes

#### [NEW] [0005_aggregate_indexes.sql](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/drizzle/0005_aggregate_indexes.sql)
A transaction-wrapped migration script creating the following performance indexes:
- `idx_invoices_status` ON `invoices(org_id, status)`
- `idx_invoices_created_at` ON `invoices(org_id, created_at)`
- `idx_invoices_currency` ON `invoices(org_id, currency)`
- `idx_shipments_status` ON `shipments(org_id, status)`
- `idx_shipments_created_at` ON `shipments(org_id, created_at)`
- `idx_shipments_origin` ON `shipments(org_id, origin)`
- `idx_shipments_destination` ON `shipments(org_id, destination)`
- `idx_contacts_type` ON `contacts(org_id, type)`
- `idx_contacts_status` ON `contacts(org_id, status)`
- `idx_contacts_country` ON `contacts(org_id, country)`

#### [NEW] [0005_aggregate_indexes_ROLLBACK.sql](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/drizzle/0005_aggregate_indexes_ROLLBACK.sql)
A rollback script using `DROP INDEX` wrapped in `BEGIN/COMMIT`.

---

### Component 2: Audit Logger Library

#### [NEW] [audit-logger.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/audit-logger.ts)
A centralized auditing helper:
- `logActivity(options)`: Logs activity in `activityLogs` inside a try/catch block (fire-and-forget, console logs database errors, never throws).
- `sanitizeForAudit(data)`: Recursively removes sensitive properties (e.g. `password`, `passwordHash`, `token`, `secret`) and truncates string fields exceeding 1KB to `1024 bytes + '...(truncated)'`.
- `capChangeSummary(summary)`: Ensures the total serialized JSON size of the change summary is under 5KB; drops/simplifies nested values if the size is exceeded.
- `getDiff(before, after)`: Calculates `{ before, after, changedFields[] }` flat diff comparison for PATCH audits. Comparison for nested objects will use `JSON.stringify` equality.

---

### Component 3: Search, Filter, and Sort Utilities

#### [NEW] [search-helpers.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/search-helpers.ts)
A Drizzle-specific helper to parse and whitelist search, filter, and sort arguments:
- Accepts whitelisted fields and columns.
- Generates `where` conditions (`ilike` case-insensitive for text queries, `eq` for status).
- Generates `orderBy` clauses (`asc` or `desc`).
- Safely falls back to default sorting columns (e.g. `createdAt desc`, or `id desc`/`category asc` for entities without timestamps).

#### [MODIFY] [All 11 Query Files](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries)
Extend list retrieval functions to optionally accept `whereClause` and `orderClause` SQL parameters, making them backward-compatible:
```typescript
export async function getContacts(orgId: string, limit?: number, offset?: number, where?: SQL, orderBy?: SQL) {
  // ... apply where/orderBy conditions optionally ...
}
```

#### [MODIFY] [All 11 API List Routes](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api)
Consume `search-helpers.ts` to pass derived `whereClause` and `orderClause` parameters into query functions and count queries:
- `contacts`, `products`, `shipments`, `invoices`, `tasks`, `campaigns`, `outreach-contacts`, `email-templates`, `compliance`, `cost-items`, `financial-projections`

---

### Component 4: Bulk Delete API Endpoints

#### [NEW] [bulk-delete-helper.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/bulk-delete-helper.ts)
A reusable handler for row-by-row deletions inside individual try/catch blocks:
- Scopes deletions to `orgId`.
- Gracefully handles Postgres foreign-key constraints (SQLSTATE `23503`) by adding failed entries to a checklist.
- Fire-and-forget logs `bulk_deleted` in `activity_logs`.
- Returns `{ deleted: N, failed: [{ id, error }] }`.

#### [NEW] Bulk Delete Route Handlers (`POST /api/[entity]/bulk-delete`)
Register POST handlers for all 13 entities to call `executeBulkDelete`:
- E.g. [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/contacts/bulk-delete/route.ts)

---

### Component 5: Bulk Import API Endpoints

#### [NEW] Bulk Import Query Handlers
Create bulk import handlers under `src/lib/db/queries/[entity]-bulk.ts` supporting `continueOnError` matching the contacts bulk-import shape:
- `products-bulk.ts`
- `outreach-contacts-bulk.ts`
- `email-templates-bulk.ts`
- `tasks-bulk.ts`

#### [NEW] Bulk Import Route Handlers (`POST /api/[entity]/bulk-import`)
Implement POST endpoints validating rows via safe Zod schemas:
- `/api/products/bulk-import`
- `/api/outreach-contacts/bulk-import`
- `/api/email-templates/bulk-import`
- `/api/tasks/bulk-import`
Each route will write a `bulk_imported` log to `activity_logs` when items are imported.

---

### Component 6: Activity Log View API Endpoints

#### [NEW] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/activity-log/route.ts)
GET list endpoint for `activity_logs`:
- Scoped strictly to the session's `orgId`.
- Filters by `entityType`, `entityId`, `userId`, `action`, `startDate`, and `endDate`.
- Returns paginated data and stats.

#### [NEW] [[id]/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/activity-log/[id]/route.ts)
GET item endpoint scoped by `orgId` and log `id`.

---

### Component 7: Aggregate View API Endpoints

#### [NEW] Aggregate Route Handlers (GET)
Compute aggregates inside Next.js using SQL `GROUP BY` and aggregation functions via Drizzle:
- [invoices/aggregate/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/invoices/aggregate/route.ts): Totals, status groupings, currency groupings, monthly trend (summing total).
- [shipments/aggregate/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/shipments/aggregate/route.ts): Total count, status groupings, origin/destination counts, monthly trend (counting count).
- [contacts/aggregate/route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/contacts/aggregate/route.ts): Count by type, status, and country.
All endpoints are read-only and return structured zeroed responses if no items exist.

---

### Component 8: Wiring Audit Logging into CRUD Operations
- **POST (create)**: Call `logActivity()` with the created record representation.
- **PATCH (update)**: Select the record before update, execute `UPDATE ... RETURNING *` in Drizzle, diff the returned row with the before snapshot using `getDiff(before, returnedRow)`, and call `logActivity()`.
- **DELETE (delete)**: Double-check that existing delete query calls use `deleteWithLog` correctly.
- **Bulk Imports/Deletes**: Log summary arrays of count/ids.

---

## Verification Plan

### Automated Tests
We will add new integration test files under `src/app/api/__tests__/` to guarantee robust coverage:
1. `audit-logger.ts` unit tests: ~8 tests (sanitize, diff, cap, fire-and-forget error handling)
2. `activity-log` API: ~6 tests (happy path, auth, filters, single, no matches, paginate)
3. `aggregates` API: ~9 tests (3 endpoints × 3 cases: happy, auth, empty/zeroed)
4. `bulk-delete`: ~14 tests (3 entities critical paths, foreign key constraint violation handling, auth checks)
5. `bulk-import` (new 4 entities): ~12 tests (3 per entity: happy, invalid payload, auth)
6. `search-helpers` unit tests: ~6 tests (whitelist checks, malicious sortBy fallback, ILIKE escaping)
7. Existing test updates: Verify that all 246 existing integration tests pass successfully after wiring.

Command verification gate sequence:
```bash
npx tsc --noEmit
npm run lint
npm test (run 3 times to ensure stability)
npm run build
```
Verify that all existing tests + new tests (targeting 281+ total) pass cleanly.
