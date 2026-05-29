---
trigger: always_on
description: TradeFlow workspace rules — strict TS, locked components, conventions
---

# TradeFlow Workspace Rules

## CRITICAL — LOCKED COMPONENTS (NEVER MODIFY)

These have known issues or are stable patterns that must not be changed 
without explicit user approval in chat:

- **Email campaign idempotency bug** (test-locked, fix proposed not applied):
  `src/lib/db/queries/campaigns.ts` — `sendCampaignToContacts` function
- **Auth flow**: `src/lib/auth-server.ts`, `src/lib/auth.ts`, `src/middleware.ts`
- **Rate limiting**: `src/lib/rate-limit.ts`
- **Pagination**: `src/lib/db/queries/base.ts` paginate helper
- **Centralized seeding**: `src/app/api/dashboard/stats/route.ts` (FOR UPDATE lock)
- **DO NOT** add new seeding paths anywhere else in the codebase

## TYPESCRIPT REQUIREMENTS

- Strict mode: never use `any`, `as any`, `as unknown as T`
- Never use non-null assertions (`!`)  
- Never use `@ts-ignore` or `@ts-expect-error`
- Use proper type narrowing with `if (x !== undefined)` checks
- Optional chaining `?.` and nullish coalescing `??` preferred over ternaries
- For unknowns from JSON.parse / req.json(), type as `unknown` then validate

## DATABASE CONVENTIONS (DRIZZLE + POSTGRESQL)

- All mutations use `.returning()` pattern
- Multi-tenant: scope ALL queries with `eq(table.orgId, session.orgId)`
- Use BEGIN/COMMIT transactions for migrations
- Migrations: numbered `drizzle/XXXX_name.sql` with matching `_ROLLBACK.sql`
- Indexes: compound `(org_id, X)` for tenant queries
- Audit logging via `logActivity()` — fire-and-forget, never throws
- Use SQL aggregations (GROUP BY, SUM, COUNT, CASE WHEN) — **NEVER in-memory aggregation**
- Bulk deletes: row-by-row in try/catch, catch SQLSTATE 23503, never cascade

## API ROUTE PATTERNS

- Auth: `const session = await auth()` and `throwIfNotAuthenticated(session)`
- Validate input with Zod schemas from `src/lib/db/validation/`
- POST creates: `logActivity()` after success
- PATCH updates: SELECT before, UPDATE...RETURNING *, `getDiff()`, `logActivity()`
- DELETE: use `deleteWithLog` from `src/lib/db/queries/base.ts`
- Parse search params: `new URL(req.url).searchParams` (NOT `req.nextUrl.searchParams`)
- Standard error responses via `src/lib/error-sanitizer.ts`

## TEST CONVENTIONS

- Always use `clearDatabase()` from auth-fixture (child→parent dependency order)
- Always use `seedTestAuth()` for authenticated test requests
- Test count target: maintain or grow (currently 285)
- Stability: run tests 3x to verify no flakiness
- Type narrowing: use `expect(x).toBeDefined()` before accessing properties
- Never use `!` non-null assertion in tests
- For caught errors: type as `unknown` first, then narrow with `instanceof`

## VERIFICATION GATE (BEFORE EVERY COMMIT)

1. `npx tsc --noEmit` → 0 errors
2. `npm run lint` → 0 warnings, 0 errors
3. `npm test` → all passing (currently 285)
4. `npm test` again → stability check
5. `npm test` third time → flakiness check
6. `npm run build` → success
7. Conventional commit message
8. Push to `feat/backend-foundation`

## ARCHITECTURE

- Next.js 16.2.6 (Turbopack) App Router
- React 19.2.4
- TypeScript strict
- Drizzle ORM + PostgreSQL via Docker
- Auth.js v5 JWT session
- Vanilla CSS (no UI framework)
- Vitest for testing
- Repository: github.com/AS741614/TradeFlow-Import-Export-Platform
- Branch: feat/backend-foundation

## WORKSPACE BOUNDARIES

- NEVER edit: `.git/`, `.env*`, `node_modules/`, `drizzle/meta/`
- NEVER commit: secrets, `.env*` files, credentials
- Production builds run from local machine, not CI yet
