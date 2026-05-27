# Implementation Plan: App Metadata Table & Single-Value Persistence (Prompt 9.1)

Add a multi-tenant `app_metadata` table to PostgreSQL, expose a REST API, rewrite `storage.ts` `getValue`/`setValue` with real API calls, and integrate it with the business plan page.

## User Review Required

> [!NOTE]
> All table reads/writes are scoped strictly by the default tenant (`DEFAULT_ORG_ID`).
> Date formats will be managed automatically via standard Drizzle defaults.
> The table is fully generic and key-value based, allowing future key types without schema alterations.

## Open Questions
None.

## Proposed Changes

---

### Component: Database (drizzle-kit)

#### [NEW] [metadata.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/metadata.ts)
We define the new schema in a dedicated file `src/lib/db/schema/metadata.ts`.
- **Columns**:
  - `orgId` (UUID, FK referencing `orgs.id`, NOT NULL)
  - `key` (VARCHAR(255), NOT NULL)
  - `value` (TEXT, NOT NULL)
  - `updatedAt` (TIMESTAMPTZ, NOT NULL, default `now()`)
- **Primary Key**: Composite `(org_id, key)` for tenant partitioning and uniqueness.

#### [MODIFY] [index.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/index.ts)
- Add export statement: `export * from './metadata';`.

---

### Component: Queries & Validation

#### [NEW] [app-metadata.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/app-metadata.ts)
Zod validation schema for saving metadata values:
```typescript
import { z } from 'zod';

export const saveAppMetadataSchema = z.object({
  value: z.string(),
});

export type SaveAppMetadataInput = z.infer<typeof saveAppMetadataSchema>;
```

#### [NEW] [app-metadata.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/app-metadata.ts)
Query helper functions:
- `getAppMetadataValue(key: string)`:
  Queries table `app_metadata` with tenant filter `withTenant`.
- `setAppMetadataValue(key: string, value: string)`:
  Performs Drizzle `.onConflictDoUpdate()` on target columns `[orgId, key]`, updating `value` and `updatedAt` on duplicate.
- `deleteAppMetadataValue(key: string)`:
  Performs a plain DELETE scoped by `orgId` and `key` (no audit logging required).

---

### Component: API Routes

#### [NEW] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/app-metadata/%5Bkey%5D/route.ts)
Implements GET, PUT, and DELETE handlers under Next.js dynamic params `{ params: Promise<{ key: string }> }`:
- **GET /api/app-metadata/[key]**:
  Calls `getAppMetadataValue`. Returns `{ data: { key, value } }` or `{ data: null }` if key is absent.
- **PUT /api/app-metadata/[key]**:
  Validates request payload via `saveAppMetadataSchema`. Calls `setAppMetadataValue`. Returns `{ data: { key, value } }`.
- **DELETE /api/app-metadata/[key]**:
  Calls `deleteAppMetadataValue`. Returns `{ data: { deleted: true } }`.

---

### Component: Storage Client

#### [MODIFY] [storage.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/storage.ts)
Rewrite `getValue` and `setValue`:
- **JSON Serialization**:
  `setValue` converts `value: T` to string using `JSON.stringify()`.
  `getValue` parses fetched value using `JSON.parse()`.
- **Signatures** (remains fully backward-compatible):
  - `export function getValue<T>(key: string, defaultValue: T): Promise<T>`
  - `export function setValue<T>(key: string, value: T): Promise<void>`
- Wrap `JSON.parse` in try/catch to safely return `defaultValue` in case of corrupted format or empty response data.

---

### Component: Business Plan Page

#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx)
- Import `getValue` and `setValue` from `@/lib/storage`.
- In `useEffect` (on page load), call `await getValue<string>('bp_last_saved', nowISO())` and set state `lastSaved`.
- Add centralized `markBusinessPlanSaved` helper to handle async state changes and persistence.
- Call `await markBusinessPlanSaved()` at the end of each mutation handler (`handleSectionTextChange`, `handleAddSwotItem`, `handleDeleteSwotItem`).

---

### Component: Documentation

#### [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
Briefly document the structure and purpose of the `app_metadata` table in the database section.

---

## Verification Plan

### Migration Flow
1. Generate migration script: `npx drizzle-kit generate`
2. Review the output schema SQL under `drizzle/`.
3. Apply migration to dev container: `npm run db:up` (if down) followed by `npx drizzle-kit push` (or `npm run db:migrate` if preferred).
4. Verify database table structure via psql or script.

### Automated Tests
- Integration tests in `src/app/api/__tests__/app-metadata.test.ts`.
- Mocked unit tests in `src/lib/__tests__/storage.test.ts`.
- Run typecheck: `npx tsc --noEmit`.
- Run lint: `npm run lint`.
- Run tests: `npm test` (verify all 202 tests pass).
- Run production build: `npm run build`.

### Manual E2E Validation
- Edit business plan section text or add SWOT quadrant item.
- Note "Saved at: HH:MM" in UI headers.
- Hard-reload page in browser.
- Assert that "Saved at: HH:MM" retains the identical time stamp.

## Out of Scope
- Modifications to any 8a/8b endpoint routes or other pages/components.
- Lock existing email campaign delivery idempotency bug as required.
- Do not modify `api-client.ts`.
