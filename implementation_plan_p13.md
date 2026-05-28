# Implementation Plan - Prompt 13: Business Plan Bug Fixes

We will resolve three manual testing bugs on the Business Plan page.

## User Review Required

> [!IMPORTANT]
> - **Unified sortOrder Property**: Instead of performing translation mappings on input and output, we are standardizing the properties to use `sortOrder` everywhere in the codebase (types, constants, components, page, and schemas).
> - **Centralized Server-Side Seeding**: We will move default seeding for SWOT items and business plan sections to the centralized `getDashboardStats()` in `src/lib/db/queries/dashboard.ts` using `FOR UPDATE` transactions on the orgs row. client-side page component seeding and route seeding are completely removed.
> - **DISABLE_AUTO_SEEDING Environment Variable**: We will use `process.env.DISABLE_AUTO_SEEDING === 'true'` instead of just checking if `process.env.NODE_ENV === 'test'` to bypass/disable seeding when requested.

---

## Technical Root Cause Analysis

### BUG 1 — Business plan section save fails with 400
- **Evidence**:
  - `src/lib/db/validation/business-plan.ts` defines `sortOrder` as a required integer.
  - `src/lib/constants.ts` defines default business plan sections using the key `order`, not `sortOrder`.
  - `src/app/business-plan/page.tsx` maps over sections using the property `.order`.
  - As a result, the frontend POSTs `order` (which is stripped by Zod), leaving `sortOrder` as `undefined` and triggering a validation error.
  - **Remediation**: Standardize everything to `sortOrder`.

### BUG 2 — Completion Status shows "NaN%"
- **Evidence**:
  - `src/app/business-plan/page.tsx` calculates completion via:
    `const completionPercentage = Math.round(((sectionsCompleted) / totalSections) * 100);`
  - When `totalSections === 0`, this evaluates to `NaN` (0 / 0).
  - **Remediation**: Use `calcPercentage` from `@/lib/utils`.

### BUG 3 — Duplicate SWOT items displayed
- **Evidence**:
  - React Strict Mode double-effect execution mounts the page component twice. In an empty database, both mounts trigger concurrent client-side `useEffect` seeding loops. Because `getDefaultSwotItems()` generates random IDs dynamically, both loops insert separate records, creating duplicates.
  - **Remediation**: Centralize seeding on the server-side dashboard stats retrieval inside a single transaction with a `FOR UPDATE` lock.

---

## Proposed Changes

### Component: Types
#### [MODIFY] [types.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/types.ts)
- Rename `order` to `sortOrder` in `BusinessPlanSection` interface.

### Component: Constants
#### [MODIFY] [constants.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/constants.ts)
- Update `getDefaultBusinessPlan()` items to use key `sortOrder` instead of `order`.

### Component: Zod Validation
#### [MODIFY] [business-plan.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/business-plan.ts)
- Update `insertBusinessPlanSchema` to make `sortOrder` optional: `sortOrder: z.number().int('Sort order must be an integer').optional()`.
- Ensure `updateBusinessPlanSchema` correctly updates it as optional.

### Component: Database Queries
#### [MODIFY] [business-plan.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/business-plan.ts)
- Import `count` from `'drizzle-orm'`.
- In `createBusinessPlanSection`, if `data.sortOrder` is undefined or missing, perform a count check on `businessPlanSections` for the organization and set `sortOrder = count + 1`.

#### [MODIFY] [dashboard.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/dashboard.ts)
- Import `swotItems`, `businessPlanSections`, and `orgs` schema tables.
- Extend counts to include `swotCount` and `sectionCount`.
- Extend the server-side seeding logic: If `contactsCount === 0`, `productsCount === 0`, `tasksCount === 0`, `swotCount === 0`, and `sectionCount === 0` (and `process.env.DISABLE_AUTO_SEEDING !== 'true'`), perform seeding inside a transaction:
  1. Lock the organization row via `SELECT id FROM orgs WHERE id = [orgId] FOR UPDATE`.
  2. Re-verify that counts are all still 0.
  3. Seed sample products, contacts, tasks, default SWOT items (`getDefaultSwotItems()`), and default business plan sections (`getDefaultBusinessPlan()`).
  4. Re-calculate counts and return.

### Component: Frontend Client Page
#### [MODIFY] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/business-plan/page.tsx)
- Import `calcPercentage` from `@/lib/utils`.
- Replace `a.order - b.order` references with `a.sortOrder - b.sortOrder`.
- Completely remove the client-side seeding of SWOT items and business plan sections.
- Change `completionPercentage` calculation to use `calcPercentage(sectionsCompleted, totalSections)`.

---

## Verification Plan

### Automated Tests
We will add/modify integration tests:
1. `src/app/api/__tests__/business-plan.test.ts`
   - Verify `POST` creation without `sortOrder` auto-assigns sequential ordering index.
   - Verify that routes return `sortOrder` and don't leak `order`.
2. `src/app/api/__tests__/dashboard-stats.test.ts`
   - Test that default SWOT and business plan sections are seeded correctly when all counts are 0.
3. `src/lib/__tests__/utils.test.ts`
   - Verify `calcPercentage` handles `0` denominator safely returning `0`.

Execute tests sequentially:
```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
