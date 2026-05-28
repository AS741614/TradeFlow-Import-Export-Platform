# Implementation Plan - Prompt 11: Tier 1 Critical Fixes & Bulk Import Foundation

Provide a comprehensive solution to the three Tier 1 critical findings in the Phase 1 backend audit, plus establish the structural reference pattern for transactional/continuation bulk data imports.

## User Review Required

> [!IMPORTANT]
> - **In-Memory Rate Limiting**: The rate limiter uses an in-memory `Map` storage. While fully compliant with the specification, it will reset on serverless function recycling or when deploying multiple service instances. A Redis-backed token bucket is scheduled to replace this implementation in Prompt 23.
> - **Rate Limiter Test Bypass**: To prevent rate limiting from breaking automated test suites, the rate limiter will automatically short-circuit (always allow) if `process.env.NODE_ENV === 'test'` or `process.env.DISABLE_RATE_LIMIT === 'true'`.
> - **Server-side Seeding**: Seeding of demo data for fresh organizations is completely moved to the server side inside the `/api/dashboard/stats` endpoint. The dashboard client is a pure consumer and does not perform any seeding.

## Proposed Changes

We will introduce 6 new files and modify 32 files (including standardizing catch blocks in all 28 API routes).

---

### Component: Dashboard Performance Optimization & Server-Side Seeding

Reduce database loading footprint on initial dashboard load and eliminate client-side seeding race conditions by moving metrics calculation and default seeding to the database layer.

#### [NEW] [dashboard.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/dashboard.ts)
- Implement `getDashboardStats(orgId: string, userId: string)` helper.
- Query count indicators:
  - `contactsCount`: `contacts` table size
  - `productsCount`: `products` table size
  - `tasksCount`: `tasks` table size
  - `shipmentsCount`: `shipments` table size
  - `invoicesCount`: `invoices` table size
  - `campaignsCount`: `campaigns` table size
  - `activeProductsCount`: `products` where status = `in-stock`
  - `openInvoicesCount`: `invoices` where status = `draft` or `sent`
  - `pendingTasksCount`: `tasks` where status != `done`
  - `inTransitShipmentsCount`: `shipments` where status != `delivered`
  - `totalCampaignsSent`: `COALESCE(SUM((stats->>'sent')::integer), 0)`
- **Server-Side Seeding Rule**: If `contactsCount === 0`, `productsCount === 0`, and `tasksCount === 0`, execute a single database transaction to insert default sample records (`getSampleProducts()`, `getSampleContacts()`, `getDefaultTasks()`) and link them to `orgId` and `userId`. Re-run counts after seeding and return.

#### [NEW] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/dashboard/stats/route.ts)
- Expose `GET /api/dashboard/stats` endpoint.
- Verify user session through `throwIfNotAuthenticated()`.
- Retrieve aggregated counts via `getDashboardStats(session.orgId, session.userId)`.
- Return `{ data: DashboardStats }`.

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/page.tsx)
- Remove all sample data seeding, `addItem` loops, and list downloads.
- Fetch metrics from `/api/dashboard/stats` and map values to UI badges.
- Fetch `tasks` array only for the "Priority Tasks" section if task count > 0.

---

### Component: Database Error Sanitizer

Prevent PostgreSQL schema internals, constraint names, and column declarations from leaking to the frontend in standard route error responses.

#### [NEW] [error-sanitizer.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/error-sanitizer.ts)
- Create `sanitizeDbError(error: unknown)` and `handleRouteError(error: unknown)` helpers.
- **Unauthorized Checks First**: If `error instanceof Error && error.message === 'Unauthorized'`, return `401 { error: 'Unauthorized' }` immediately before checking database status codes.
- Map PostgreSQL SQLSTATE codes:
  - `23505` (unique_violation) $\rightarrow$ `409 Conflict`, "This record already exists"
  - `23503` (foreign_key_violation) $\rightarrow$ `400 Bad Request`, "Referenced item not found"
  - `23502` (not_null_violation) $\rightarrow$ `400 Bad Request`, "Required field missing"
  - Default/other driver errors $\rightarrow$ `500 Internal Server Error`, "Internal server error"
- Standardize full trace outputs via `console.error` for debugging.

#### [MODIFY] [28 API Route Handlers](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api)
Modify all 28 API routes (excluding auth route itself) to import `handleRouteError` and invoke it inside catch blocks:
- `app-metadata/[key]`
- `business-plan` and `business-plan/[id]`
- `campaigns` and `campaigns/[id]`
- `compliance` and `compliance/[id]`
- `contacts` and `contacts/[id]`
- `cost-items` and `cost-items/[id]`
- `email-templates` and `email-templates/[id]`
- `email/send`
- `financial-projections` and `financial-projections/[id]`
- `invoices` and `invoices/[id]`
- `outreach-contacts` and `outreach-contacts/[id]`
- `products` and `products/[id]`
- `shipments` and `shipments/[id]`
- `swot` and `swot/[id]`
- `tasks` and `tasks/[id]`

---

### Component: Rate Limiting Enforcement

Implement brute-force shielding on public-facing registration and credential validation endpoints.

#### [NEW] [rate-limiter.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/rate-limiter.ts)
- Implement `RateLimiter` class using an in-memory `Map`.
- **Test Bypass**: Short-circuit limit checks (always return `allowed: true`) if `process.env.NODE_ENV === 'test'` or `process.env.DISABLE_RATE_LIMIT === 'true'`.
- Implement `withRateLimit` route decorator wrapping standard Next.js App Router handlers.
- Return `429 Too Many Requests` with a plain text warning and a `Retry-After` header specifying reset timeframe.

#### [MODIFY] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/auth/[...nextauth]/route.ts)
- Import `withRateLimit` and wrap NextAuth handlers.
- Enforce credentials signin restriction: 5 attempts per 15 minutes per IP. Filter wrapper execution to `POST` methods only.

#### [MODIFY] [actions.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/signup/actions.ts)
- Integrate rate-limiter verification at top of action: 3 attempts per hour.
- Safely handle constraint exceptions to prevent leaking server diagnostics (e.g. check for code `23505` to throw "This email address is already registered.").

---

### Component: Reference Bulk Import

Establish a reference pattern for bulk CSV/JSON loading supporting batch transactions and error tolerance.

#### [NEW] [contacts-bulk.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/contacts-bulk.ts)
- Add `bulkImportContacts(orgId, rows, continueOnError)` database helper.
- Verify payload row parameters using `insertContactSchema`.
- Support transactional rollbacks (`continueOnError: false`) and error-tolerant row loops (`continueOnError: true`).

#### [NEW] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/contacts/bulk-import/route.ts)
- Expose `POST /api/contacts/bulk-import` route.
- Validate request payload using Zod schema verification at route level: `{ rows: z.array(z.unknown()), continueOnError: z.boolean().optional() }`.
- Reject requests if `rows.length > 1000` with `413 Payload Too Large`.
- Execute bulk loader with session tenancy isolation.
- Return JSON payload detailing `{ data: { imported: N, failed: [{ row, errors }] } }`.

---

### Component: Project Documentation

#### [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
- Document new `/api/dashboard/stats` and `/api/contacts/bulk-import` REST routes.
- Clarify rate limit constraints and in-memory Map structure details.

---

## Verification Plan

### Automated Tests
Execute the following verification scripts to confirm system regression checks and coverage targets:
```bash
# Verify TypeScript Type Safety
npx tsc --noEmit

# Verify Coding Styles
npm run lint

# Run Full Test Suites
npx vitest run --sequence.concurrent=false
```

We will implement the following new unit tests:
1. `src/lib/__tests__/error-sanitizer.test.ts`
   - Test `sanitizeDbError` mapping unique violation `23505` to `409` and a friendly error message.
   - Test `sanitizeDbError` mapping foreign key violation `23503` to `400`.
   - Test `sanitizeDbError` mapping unknown error object to standard `500` with internal server error.
   - Test `Unauthorized` error preservation: thrown `Error('Unauthorized')` returns status `401` with message `'Unauthorized'`.
2. `src/lib/__tests__/rate-limiter.test.ts`
   - Test bucket allocation and limit exhaustion.
   - Test TTL expiration resetting client requests.
   - Test that rate limiter is bypassed when `process.env.NODE_ENV === 'test'` or `process.env.DISABLE_RATE_LIMIT === 'true'`.
3. `src/app/api/__tests__/dashboard-stats.test.ts`
   - Verify `/api/dashboard/stats` endpoint output format matches the schema specification.
   - Verify that server-side seeding triggers and returns metrics for fresh organisations.
4. `src/app/api/__tests__/contacts-bulk.test.ts`
   - Test request body validation and `413 Payload Too Large` rejection if `rows.length > 1000`.
   - Test transaction failure rollback behavior on invalid inputs.
   - Test validation errors and continuation reports.

#### Test Count Target
- Current passing tests: **223**
- New test files: **4** (approx. 22 new tests)
- Predicted final test count: **245+**

### Manual Verification
1. **Network footprint verification**: Open Chrome DevTools Network tab on `/` (dashboard) page. Confirm calls to individual product, contact, shipment lists are eliminated and replaced by a single call to `/api/dashboard/stats`.
2. **Error sanitization audit**: Send a `POST` request to `/api/contacts` omitting required values (or causing a custom DB exception). Verify the output is a clean JSON error representation, not raw driver traces.
3. **Signup Rate limit verification**: Attempt 6 rapid registration form posts (outside the test environment). Verify that the 4th attempt blocks execution and triggers the warning alert.
4. **Sign-in Rate limit verification**: Post credentials to `/api/auth/signin` multiple times (outside the test environment). Verify standard rate throttling returns `429 Too Many Requests`.
5. **Reference Import verification**: Bulk import mixed payloads via `/api/contacts/bulk-import`. Verify valid rows are written while invalid rows register error status flags.
