# Implementation Plan - Phase 14A: Test Stabilization & Schema Decision

This implementation plan focuses on Phase 14A to stabilize the integration test suite and migrate the existing `deletion_logs` database table into a unified `activity_log` table before implementing Prompt 14's full scope.

## User Review Required

> [!IMPORTANT]
> - **Unified activity_log Table**: Instead of creating a new `activity_log` table, we will rename the existing `deletion_logs` table to `activity_log` and modify its columns to match the new activity/audit logs specification.
> - **Migration Safety**: The SQL migration script RENAMEs the table and columns, adds new columns, and runs an `UPDATE` statement that looks up the `org_id` for existing logs from the `users` table, sets `action = 'deleted'`, and maps plural `table_name` categories (e.g. `'contacts'`) to singular `entity_type` (e.g. `'contact'`).
> - **Graceful Test Cleardown**: We will introduce a global `clearDatabase()` function inside `auth-fixture.ts` that clears all tables in the correct dependency order. All test suites will be updated to call `clearDatabase()` in their `afterEach` teardowns, preventing state leakage and foreign key constraint violations.

---

## Technical Audit: deletion_logs References

We analyzed all references to `deletionLogs` and `deletion_logs` across the codebase:

1. **Schema Definition**: `src/lib/db/schema/core.ts` defines `deletionLogs` table and exports it.
2. **Query Helpers**: `src/lib/db/queries/base.ts` imports `deletionLogs` and writes snapshots during deletions in the `deleteWithLog` helper.
3. **Tests Cleanup**: All 16 API test files in `src/app/api/__tests__` and `src/lib/db/__tests__/schema.test.ts` clear `deletionLogs` in setup/teardown.
4. **Deletion Assertions**: 13 test files (such as `contacts.test.ts`, `products.test.ts`) select from `deletionLogs` to assert that deleted records were recorded correctly.

---

## Proposed Changes

### Component: Database Schema & Migration

#### [MODIFY] [core.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/core.ts)
- Rename `deletionLogs` export to `activityLogs` and map it to `activity_log` table.
- Update columns to match specification:
  - Rename `tableName` to `entityType`
  - Rename `recordId` to `entityId`
  - Rename `deletedByUserId` to `userId`
  - Rename `deletedData` to `changeSummary`
  - Rename `deletedAt` to `createdAt`
  - Add `orgId` column referencing `orgs.id`
  - Add `action` column (string)
  - Add `ipAddress` and `userAgent` columns
  - Create indexes: `(orgId, createdAt)` and `(entityType, entityId)`

#### [MODIFY] [index.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/index.ts)
- Export `activityLogs` (formerly `deletionLogs`).

#### [NEW] [0002_rename_deletion_log.sql](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/drizzle/0002_rename_deletion_log.sql)
SQL migration containing:
```sql
ALTER TABLE "deletion_logs" RENAME TO "activity_log";

ALTER TABLE "activity_log" RENAME COLUMN "table_name" TO "entity_type";
ALTER TABLE "activity_log" RENAME COLUMN "record_id" TO "entity_id";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_by_user_id" TO "user_id";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_data" TO "change_summary";
ALTER TABLE "activity_log" RENAME COLUMN "deleted_at" TO "created_at";

ALTER TABLE "activity_log" ADD COLUMN "org_id" uuid;
ALTER TABLE "activity_log" ADD COLUMN "action" text;
ALTER TABLE "activity_log" ADD COLUMN "ip_address" text;
ALTER TABLE "activity_log" ADD COLUMN "user_agent" text;

ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

UPDATE "activity_log" al
SET 
  org_id = u.org_id,
  action = 'deleted',
  entity_type = CASE 
    WHEN entity_type = 'contacts' THEN 'contact'
    WHEN entity_type = 'products' THEN 'product'
    WHEN entity_type = 'shipments' THEN 'shipment'
    WHEN entity_type = 'invoices' THEN 'invoice'
    WHEN entity_type = 'compliance_items' THEN 'compliance'
    WHEN entity_type = 'cost_items' THEN 'cost-item'
    WHEN entity_type = 'financial_projections' THEN 'financial-projection'
    WHEN entity_type = 'outreach_contacts' THEN 'outreach-contact'
    WHEN entity_type = 'email_templates' THEN 'email-template'
    WHEN entity_type = 'campaigns' THEN 'campaign'
    WHEN entity_type = 'business_plan_sections' THEN 'business-plan'
    WHEN entity_type = 'swot_items' THEN 'swot'
    WHEN entity_type = 'tasks' THEN 'task'
    ELSE entity_type
  END
FROM "users" u
WHERE al.user_id = u.id;

ALTER TABLE "activity_log" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "activity_log" ALTER COLUMN "action" SET NOT NULL;

DROP INDEX IF EXISTS "idx_deletion_logs_deleted_by_user_id";
CREATE INDEX IF NOT EXISTS "idx_activity_log_org_created" ON "activity_log" ("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_activity_log_entity" ON "activity_log" ("entity_type", "entity_id");
```

---

### Component: Base Database Queries

#### [MODIFY] [base.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/base.ts)
- Replace imports of `deletionLogs` with `activityLogs`.
- Update `deleteWithLog` to retrieve the user's `orgId` and insert deletion records into `activityLogs` with fields: `orgId`, `userId`, `entityType`, `entityId`, `action: 'deleted'`, `changeSummary: { snapshot: data }`.

---

### Component: Test Infrastructure and Stabilization

#### [MODIFY] [auth-fixture.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/__tests__/_helpers/auth-fixture.ts)
- Export `clearDatabase()` helper that executes table truncation/deletions in correct dependency order (children tables first, then parents: campaign_contacts → campaigns → invoice_line_items → invoices → shipments → products → contacts → users → orgs).
- Refactor `seedTestAuth()` to use `clearDatabase()`.

#### [MODIFY] [All API Integration Test Files](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/__tests__)
- Replace manual deletes in `beforeEach` and `afterEach` with a unified call to `clearDatabase()`.
- Update delete assertions to import `activityLogs` (instead of `deletionLogs`) and assert on new fields:
  - `log.tableName` -> `log.entityType`
  - `log.recordId` -> `log.entityId`
  - `log.deletedData` -> `(log.changeSummary as any).snapshot`
  - `log.deletedByUserId` -> `log.userId`

#### [MODIFY] [schema.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/__tests__/schema.test.ts)
- Update tests for `deletionLogs` to test `activityLogs` properties and schema column updates.

---

## Verification Plan

### Automated Tests
Run Vitest integration tests to verify all 246 tests are green:
```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
