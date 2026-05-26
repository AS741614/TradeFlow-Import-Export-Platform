# Implementation Plan - Phase 8b: Next.js API Routes and Queries for Finance, Outreach, and Business

Complete the API surface for the remaining 8 business entities by adding App Router API routes, Zod validations, multi-tenant scoped database query helpers, and integration tests, following the exact patterns established in Prompt 8a.

## User Review Required

> [!IMPORTANT]
> **Tenancy and Session Scoping**:
> All queries are scoped by `DEFAULT_ORG_ID` (`00000000-0000-0000-0000-000000000001`). Real session-based authentication mapping will replace these in Prompt 10.
> 
> **Campaign Junction Handling**:
> The `campaigns` entity uses a transaction to write junction records to `campaign_contacts` during creation and update operations. Deletions cascade automatically at the DB level, and the logged deletion snapshot includes the associated `contactIds` array.

## Table of Proposed Files

Below is the mapping for the 8 remaining entities in Prompt 8b:

| Entity | DB Table(s) | Zod Validation File | Query Helper File | Route File(s) | Integration Test File |
|---|---|---|---|---|---|
| **cost-items** | `cost_items` | `src/lib/db/validation/cost-items.ts` | `src/lib/db/queries/cost-items.ts` | `src/app/api/cost-items/route.ts`<br>`src/app/api/cost-items/[id]/route.ts` | `src/app/api/__tests__/cost-items.test.ts` |
| **financial-projections** | `financial_projections` | `src/lib/db/validation/financial-projections.ts` | `src/lib/db/queries/financial-projections.ts` | `src/app/api/financial-projections/route.ts`<br>`src/app/api/financial-projections/[id]/route.ts` | `src/app/api/__tests__/financial-projections.test.ts` |
| **outreach-contacts** | `outreach_contacts` | `src/lib/db/validation/outreach-contacts.ts` | `src/lib/db/queries/outreach-contacts.ts` | `src/app/api/outreach-contacts/route.ts`<br>`src/app/api/outreach-contacts/[id]/route.ts` | `src/app/api/__tests__/outreach-contacts.test.ts` |
| **email-templates** | `email_templates` | `src/lib/db/validation/email-templates.ts` | `src/lib/db/queries/email-templates.ts` | `src/app/api/email-templates/route.ts`<br>`src/app/api/email-templates/[id]/route.ts` | `src/app/api/__tests__/email-templates.test.ts` |
| **campaigns** | `campaigns`<br>`campaign_contacts` | `src/lib/db/validation/campaigns.ts` | `src/lib/db/queries/campaigns.ts` | `src/app/api/campaigns/route.ts`<br>`src/app/api/campaigns/[id]/route.ts` | `src/app/api/__tests__/campaigns.test.ts` |
| **business-plan** | `business_plan_sections` | `src/lib/db/validation/business-plan.ts` | `src/lib/db/queries/business-plan.ts` | `src/app/api/business-plan/route.ts`<br>`src/app/api/business-plan/[id]/route.ts` | `src/app/api/__tests__/business-plan.test.ts` |
| **swot** | `swot_items` | `src/lib/db/validation/swot.ts` | `src/lib/db/queries/swot.ts` | `src/app/api/swot/route.ts`<br>`src/app/api/swot/[id]/route.ts` | `src/app/api/__tests__/swot.test.ts` |
| **tasks** | `tasks` | `src/lib/db/validation/tasks.ts` | `src/lib/db/queries/tasks.ts` | `src/app/api/tasks/route.ts`<br>`src/app/api/tasks/[id]/route.ts` | `src/app/api/__tests__/tasks.test.ts` |

---

## Campaigns Junction Transaction Details

To ensure proper normalization and consistency, `campaigns` and `campaign_contacts` will be managed using Drizzle transactions within the queries:

1. **Create Campaign**:
   - Accepts payload: `{ name, templateId, status, scheduleType, scheduledAt, sendsPerHour, subjectLineA, subjectLineB, stats, contactIds: string[] }`
   - Inside a database transaction `tx`:
     - Insert a record into the `campaigns` table.
     - Bulk insert junction rows into `campaignContacts` matching `campaignId` to each `contactId` in `contactIds`, setting the initial status to `'pending'`.
   - Return `{ ...campaign, contactIds }`.

2. **Update Campaign**:
   - Inside a database transaction `tx`:
     - Update fields in the `campaigns` table.
     - If `contactIds` is provided in the update payload:
       - Delete all existing `campaignContacts` associated with the campaign ID.
       - Bulk insert the new set of `contactIds` matching the campaign.
   - Return `{ ...campaign, contactIds }`.

3. **Delete Campaign**:
   - Cascades automatically at the database foreign key level, clearing the junction table.
   - `deleteWithLog` will record the complete nested campaign object (including the `contactIds` array) to `deletion_logs` before the hard delete occurs.

---

## Confirmation of Locks & Scope Discipline

- **No modifications** to Prompt 8a files (e.g. `src/app/api/contacts/**`, `src/lib/db/queries/contacts.ts`, etc.).
- **No modifications** to base database config files: `src/lib/db/client.ts`, `constants.ts`, and `queries/base.ts`.
- **No modifications** to UI files, pages, or `storage.ts`.
- All 146 existing tests are preserved and remain green.

---

## Verification Plan

### Automated Tests
- Run `npm test` after implementing each entity in sequence:
  - cost-items
  - financial-projections
  - tasks
  - swot
  - business-plan
  - email-templates
  - outreach-contacts
  - campaigns
- Proves status codes: 200, 201, 400 (validation failure), 404 (not found).
- Proves multi-tenancy enforcement.
- Proves `deletion_logs` transaction auditing.

### Predicted Test Count
- Current: **146 passed**
- Target: **194 passed** (~6 integration tests per new entity * 8 entities = 48 new tests)

### Verification Gates
1. `npx tsc --noEmit` -> 0 errors
2. `npm run lint` -> 0 errors, 0 warnings
3. `npm run test:coverage` -> 194+ tests pass
4. `npm run build` -> Success
5. `npm run db:up` -> Postgres Docker container running
