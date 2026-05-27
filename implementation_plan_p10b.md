# Implementation Plan: Session-Derived Multi-Tenant Scoping (Prompt 10b)

This plan details the implementation of Prompt 10b: replacing the static fallback variables `DEFAULT_USER_ID` and `DEFAULT_ORG_ID` with session-derived parameters in all database query helpers and securing every API route under `throwIfNotAuthenticated()`.

## User Review Required

> [!IMPORTANT]
> - **API Authentication Requirement**: Under 10b, all 28 API routes will strictly require authentication. Unauthenticated requests to API routes will return a `401 Unauthorized` JSON response.
> - **Removal of Default Constants**: The constants `DEFAULT_USER_ID` and `DEFAULT_ORG_ID` will be deleted from `src/lib/db/constants.ts` to prevent compile-time slippage of unauthenticated fallbacks.
> - **Seed Script Deprecation**: `scripts/seed-default-org.ts` will be marked as deprecated and turned into a no-op script, since users and orgs will now be created dynamically via the UI `/signup` page.

---

## Proposed Changes

### Component: Integration Test Fixtures

#### [NEW] [auth-fixture.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/__tests__/_helpers/auth-fixture.ts)
* Contains `TEST_SESSION` with standard test UUIDs for `orgId` and `userId`.
* `seedTestAuth()`: Seeds the test organization and owner user in the database.
* `createAuthenticatedRequest(url, options)`: Generates a `NextRequest` with the appropriate cookie header mapping to the session.
* `mockAuthSession(sessionData)`: Mocks the `auth()` callback from `@/lib/auth` to return the specified user details if the auth cookie is present.

---

### Component: Database Query Helpers (Parameters Injection)
Modify all query helpers to accept `orgId` and `userId` parameters instead of utilizing the static defaults.

#### [MODIFY] [base.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/base.ts)
* Update `withTenant(table, orgId, condition)` to accept and evaluate `orgId`.
* Update `deleteWithLog(tableName, recordId, userId, selectQuery, deleteQuery, reason)` to accept and store the active `userId`.

#### [MODIFY] [app-metadata.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/app-metadata.ts)
* `getAppMetadata(orgId, key)`, `setAppMetadata(orgId, key, value)`, `deleteAppMetadata(orgId, key)`.

#### [MODIFY] [business-plan.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/business-plan.ts)
* `getBusinessPlan(orgId)`, `createBusinessPlanSection(orgId, data)`, `updateBusinessPlanSection(orgId, id, data)`, `deleteBusinessPlanSection(orgId, id)`.

#### [MODIFY] [campaigns.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/campaigns.ts)
* Update all functions to accept `orgId`.

#### [MODIFY] [compliance.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/compliance.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [contacts.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/contacts.ts)
* `getContacts(orgId)`, `getContactById(orgId, id)`, `createContact(orgId, data)`, `updateContact(orgId, id, data)`, `deleteContact(orgId, id, userId, reason)`.

#### [MODIFY] [cost-items.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/cost-items.ts)
* Update functions to accept `orgId` and `userId`.

#### [MODIFY] [email-templates.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/email-templates.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [financial-projections.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/financial-projections.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [invoices.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/invoices.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [outreach-contacts.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/outreach-contacts.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [products.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/products.ts)
* Update functions to accept `orgId` and `userId`.

#### [MODIFY] [shipments.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/shipments.ts)
* Update functions to accept `orgId` and `userId`.

#### [MODIFY] [swot.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/swot.ts)
* Update functions to accept `orgId`.

#### [MODIFY] [tasks.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/tasks.ts)
* Update functions to accept `orgId`.

---

## Order of Execution
1. **Fixture Creation**: Implement `auth-fixture.ts`.
2. **Query Helpers & API Routes Migration (Entity-by-Entity)**:
   * Contacts
   * Products
   * Tasks
   * SWOT
   * Business Plan
   * Cost Items
   * Financial Projections
   * Compliance
   * Invoices
   * Shipments
   * App Metadata
   * Outreach Contacts
   * Email Templates
   * Campaigns
3. **Database Constant Deletions**: Remove constants and update seed scripts.
4. **Documentation Updates**: README.md & AGENTS.md.

---

## Verification Plan

### Automated Tests
* Run `npx tsc --noEmit` to verify type checking.
* Run `npm run lint` to perform linter checks.
* Run `npm test` to verify all integration and unit tests pass (expecting 209+ tests).
* Run `npm run build` to verify production build compile success.

### Manual Verification
1. Log in to pgsql and truncate all tables:
   `TRUNCATE accounts, sessions, verification_tokens, users, orgs, contacts, products, tasks, compliance, shipments, invoices, swot_items, business_plan_sections CASCADE;`
2. Start the dev server (`npm run dev`) and visit `http://localhost:3000`.
3. Verify redirection to `/login`.
4. Navigate to `/signup` (renders successfully).
5. Create a new Owner account -> confirm dashboard loads successfully.
6. Create a Contact via UI.
7. Verify contact insertion and tenant association in database:
   `SELECT * FROM contacts;`
8. Log out -> verify redirect to `/login`.
9. Log back in -> verify contact persists.
