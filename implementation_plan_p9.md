# Implementation Plan - Migrating storage.ts to API-backed PostgreSQL (Prompt 9a)

This plan details the migration of TradeFlow's storage layer (`src/lib/storage.ts`) from using browser `localStorage` to calling PostgreSQL-backed REST API endpoints via a thin async API client (`src/lib/api-client.ts`).

---

## User Review Required

### Decision: Option 2 (Async Promise-based Storage Layer) Approved
Option 1 (Synchronous XMLHttpRequest) was **rejected** for the following critical reasons:
- Synchronous XMLHttpRequest is a deprecated browser anti-pattern that triggers warnings in all modern browsers.
- It freezes the main UI thread during network round-trips, creating a poor user experience.
- It is blocked or unsupported on iOS Safari and other mobile/modern web engines.
- It blocks the single JavaScript thread for 100-500ms per call on production deployments, making the app unshippable beyond localhost.

We are implementing **Option 2 (Promise-based asynchronous storage layer)**. Because components currently call storage functions synchronously, this transition is split into two phases: **9a** (storage layer rewrite) and **9b** (component migration).

---

## Scope Split: Prompts 9a & 9b

To manage this safely and incrementally, the scope is partitioned as follows:

### Prompt 9a (This Prompt) — Storage Layer Rewrite
- **Deliverables**:
  - Build `src/lib/api-client.ts` with proper async `fetch()` (no synchronous XHR).
  - Rewrite `src/lib/storage.ts` so that **every function signature returns a Promise** (e.g. `Promise<T[]>` or `Promise<T>`).
  - Implement `StorageError` class for standard REST HTTP error parsing and propagation.
  - Rewrite `src/lib/__tests__/storage.test.ts` to mock the REST API routes and `fetch()` instead of `localStorage`.
  - Create unit tests for the fetch client in `src/lib/__tests__/api-client.test.ts`.
- **Out of Scope for 9a**:
  - **DO NOT** modify any component or page files under `src/app/` (this is deferred to 9b).
  - **DO NOT** perform E2E browser tests or manual UI verification (the UI will compile but run with broken state behaviors due to Promise returns—this is expected).
- **Verification Gate**:
  - TypeScript compilation `npx tsc --noEmit` might report type errors at the page call sites due to the signature mismatch. This is expected and serves as a roadmap of exact locations to update in Prompt 9b. We will catalog these compiler outputs in our final 9a report.
  - Unit tests (`npm test`) must pass (including the rewritten `storage.test.ts` and `api-client.test.ts`).
  - Production build compilation (`npm run build`) will run to detect any build errors.

### Prompt 9b (Next Prompt) — Component Migration & E2E Validation
- **Deliverables**:
  - Update all ~11 page components and leaf components to resolve TypeScript type mismatches.
  - Implement proper asynchronous data loading states (fetching inside `useEffect` or React Server Components).
  - Add loading spinners/skeletons and catch exceptions (using `StorageError`) around UI write interactions.
  - Update any `setItems`-style bulk replacement calls to call the REST APIs.
  - Setup E2E Integration test verifying: Create contact in UI → Verify row exists in PostgreSQL.
  - Manual verification on dev server.

---

## Single-Value Key Decision (`bp_last_saved`)

For the single non-array value `'bp_last_saved'` (used in the business-plan editor):
- We will **NOT** use cookies.
- We will store the last-saved timestamp in a new small PostgreSQL table called `app_metadata` with schema:
  - `org_id` (UUID, references orgs, tenant isolated)
  - `key` (varchar/text, primary key component)
  - `value` (text/jsonb)
  - `updated_at` (timestamptz)
- **Prompt 9a Status**: Defer both the database migration/schema modification and the API endpoint route creation for `app_metadata` to **Prompt 9b** (or a small separate migration prompt 9.1).
- During Prompt 9a, `storage.ts`'s `getValue` and `setValue` will return stubbed Promises resolving to the default or inputted values, with no `localStorage` imports.

---

## Proposed Changes (Prompt 9a)

### Component / Key to API Mapping

| Storage Key / Area | Storage Function | API Endpoint | Expected HTTP Method / Behavior |
| :--- | :--- | :--- | :--- |
| `PRODUCTS` | `getItems` | `/api/products` | `GET` |
| `PRODUCTS` | `addItem` | `/api/products` | `POST` |
| `PRODUCTS` | `updateItem` | `/api/products/[id]` | `PATCH` |
| `PRODUCTS` | `removeItem` | `/api/products/[id]` | `DELETE` |
| `SHIPMENTS` | `getItems` | `/api/shipments` | `GET` |
| `SHIPMENTS` | `addItem` | `/api/shipments` | `POST` |
| `SHIPMENTS` | `updateItem` | `/api/shipments/[id]` | `PATCH` |
| `SHIPMENTS` | `removeItem` | `/api/shipments/[id]` | `DELETE` |
| `INVOICES` | `getItems` | `/api/invoices` | `GET` |
| `INVOICES` | `addItem` | `/api/invoices` | `POST` |
| `INVOICES` | `updateItem` | `/api/invoices/[id]` | `PATCH` |
| `INVOICES` | `removeItem` | `/api/invoices/[id]` | `DELETE` |
| `CONTACTS` | `getItems` | `/api/contacts` | `GET` |
| `CONTACTS` | `addItem` | `/api/contacts` | `POST` |
| `CONTACTS` | `updateItem` | `/api/contacts/[id]` | `PATCH` |
| `CONTACTS` | `removeItem` | `/api/contacts/[id]` | `DELETE` |
| `COMPLIANCE` | `getItems` | `/api/compliance` | `GET` |
| `COMPLIANCE` | `addItem` | `/api/compliance` | `POST` |
| `COMPLIANCE` | `updateItem` | `/api/compliance/[id]` | `PATCH` |
| `COMPLIANCE` | `removeItem` | `/api/compliance/[id]` | `DELETE` |
| `TASKS` | `getItems` | `/api/tasks` | `GET` |
| `TASKS` | `addItem` | `/api/tasks` | `POST` |
| `TASKS` | `updateItem` | `/api/tasks/[id]` | `PATCH` |
| `TASKS` | `removeItem` | `/api/tasks/[id]` | `DELETE` |
| `BUSINESS_PLAN` | `getItems` | `/api/business-plan` | `GET` |
| `BUSINESS_PLAN` | `addItem` | `/api/business-plan` | `POST` |
| `BUSINESS_PLAN` | `updateItem` | `/api/business-plan/[id]` | `PATCH` |
| `BUSINESS_PLAN` | `removeItem` | `/api/business-plan/[id]` | `DELETE` |
| `SWOT` | `getItems` | `/api/swot` | `GET` |
| `SWOT` | `addItem` | `/api/swot` | `POST` |
| `SWOT` | `updateItem` | `/api/swot/[id]` | `PATCH` |
| `SWOT` | `removeItem` | `/api/swot/[id]` | `DELETE` |
| `PROJECTIONS` | `getItems` | `/api/financial-projections` | `GET` |
| `PROJECTIONS` | `addItem` | `/api/financial-projections` | `POST` |
| `PROJECTIONS` | `updateItem` | `/api/financial-projections/[id]` | `PATCH` |
| `PROJECTIONS` | `removeItem` | `/api/financial-projections/[id]` | `DELETE` |
| `COST_ITEMS` | `getItems` | `/api/cost-items` | `GET` |
| `COST_ITEMS` | `addItem` | `/api/cost-items` | `POST` |
| `COST_ITEMS` | `updateItem` | `/api/cost-items/[id]` | `PATCH` |
| `COST_ITEMS` | `removeItem` | `/api/cost-items/[id]` | `DELETE` |
| `OUTREACH_CONTACTS` | `getItems` | `/api/outreach-contacts` | `GET` |
| `OUTREACH_CONTACTS` | `addItem` | `/api/outreach-contacts` | `POST` |
| `OUTREACH_CONTACTS` | `updateItem` | `/api/outreach-contacts/[id]` | `PATCH` |
| `OUTREACH_CONTACTS` | `removeItem` | `/api/outreach-contacts/[id]` | `DELETE` |
| `EMAIL_TEMPLATES` | `getItems` | `/api/email-templates` | `GET` |
| `EMAIL_TEMPLATES` | `addItem` | `/api/email-templates` | `POST` |
| `EMAIL_TEMPLATES` | `updateItem` | `/api/email-templates/[id]` | `PATCH` |
| `EMAIL_TEMPLATES` | `removeItem` | `/api/email-templates/[id]` | `DELETE` |
| `CAMPAIGNS` | `getItems` | `/api/campaigns` | `GET` |
| `CAMPAIGNS` | `addItem` | `/api/campaigns` | `POST` |
| `CAMPAIGNS` | `updateItem` | `/api/campaigns/[id]` | `PATCH` |
| `CAMPAIGNS` | `removeItem` | `/api/campaigns/[id]` | `DELETE` |

---

### proposed-changes-components-9a

#### [NEW] [api-client.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/api-client.ts)
- Implement `StorageError` class: extends `Error` and holds standard REST response metadata (status code, body error string).
- Implement generic asynchronous fetch wrapper:
  - Supports `requestAsync<T>(method, path, body)` using native `fetch`.
  - Handles URL resolution logic for client-side relative paths vs server-side absolute paths (utilizes `NEXT_PUBLIC_BASE_URL` env variable).
  - Handles response parsing and standardizes error responses.

#### [NEW] [api-client.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/api-client.test.ts)
- Verify `ApiClient` endpoint path concatenation.
- Verify `ApiClient` async error handling and Zod response validation.
- Verify URL resolution in server-side vs. client-side environments.

#### [MODIFY] [storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts)
- Rewrite `storage.ts` functions to return async `Promise` signatures:
  - `getItems<T>(key: string): Promise<T[]>`
  - `getItemById<T extends { id: string }>(key: string, id: string): Promise<T | undefined>`
  - `setItems<T extends { id: string }>(key: string, items: T[]): Promise<void>`
  - `addItem<T extends { id: string }>(key: string, item: T): Promise<T[]>`
  - `updateItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<T[]>`
  - `removeItem<T extends { id: string }>(key: string, id: string): Promise<T[]>`
  - `getValue<T>(key: string, defaultValue: T): Promise<T>`
  - `setValue<T>(key: string, value: T): Promise<void>`
- **No imports** of `localStorage` or browser-dependent objects.
- Remove `STORAGE_PREFIX` and the `STORAGE_KEYS` dictionary. Instead, storage actions map domain keys (e.g. `products`) to their matching API folder route path.
- For `setItems(key, items)`:
  - Fetch existing items from database.
  - Compute difference, delete missing rows, patch modifications, and insert additions.

#### [MODIFY] [storage.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/storage.test.ts)
- Rewrite tests to mock network fetches via `vi.stubGlobal('fetch', ...)` or spy on `ApiClient`.
- Test that storage operations map correctly to HTTP methods, pathways, and payload configurations.

#### [MODIFY] [.env.example](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.env.example)
- Add `NEXT_PUBLIC_BASE_URL=http://localhost:3000`.

#### [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
- Document the new async storage architecture and the separation of client API wrapper and server-side components.

#### [MODIFY] [AGENTS.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/AGENTS.md)
- Update governance policies to reflect the transition to a pure async, API-backed Drizzle ORM model.

---

## Verification Plan

### Automated Tests
1. TypeScript Validation: `npx tsc --noEmit`
   *Note: Type mismatches in client page components due to the synchronous-to-asynchronous signature shift will be captured and reported, which is expected for Prompt 9a. They will be surfaced in the report.*
2. Lint Rules Validation: `npm run lint`
3. Running Test Suites: `npm test` (Unit tests for `storage.ts` and `api-client.ts` must pass)
4. Production Compilation: `npm run build`
