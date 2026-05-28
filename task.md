# Task Checklist - Prompt 12: Tier 2 Important Fixes

## 1. Currency Enum & Shared Validations
- [x] Create `src/lib/db/validation/_shared.ts` defining ISO_4217_CODES and `currencyEnumSchema`.
- [x] Create `src/lib/__tests__/_shared-validation.test.ts` to test currency validations.
- [x] Integrate `currencyEnumSchema` in:
  - `src/lib/db/validation/invoices.ts`
  - `src/lib/db/validation/products.ts`
  - `src/lib/db/validation/cost-items.ts`
  - `src/lib/db/validation/financial-projections.ts`

## 2. Tightened String Validations
- [x] Add `.max(255)` string caps and description/long-text caps to all 14 schema validators.

## 3. Invoice Arithmetic Validation
- [x] Add subtotal + tax === total refinement to `insertInvoiceSchema` and `updateInvoiceSchema` in `src/lib/db/validation/invoices.ts`.

## 4. Query Engine N+1 Fixes & Custom Logger
- [x] Add built-in query count logging under test environments in `src/lib/db/client.ts`.
- [x] Refactor `getInvoices` in `src/lib/db/queries/invoices.ts` to use a single subquery join query.
- [x] Refactor `getShipments` in `src/lib/db/queries/shipments.ts` to use a single subquery join query.
- [x] Implement/verify N+1 query regression test verifying query count <= 2.

## 5. API Endpoints Pagination & Consistency
- [x] Implement limit/offset query parameters parsing and separate count queries in all 13 entity GET list routes.
- [x] Preserve backward-compatibility by ensuring the `data` array exists at the same place.
- [x] Wrap `POST /api/email/send` response in `{ data: ... }` envelope.

## 6. Contacts Email Index Migration
- [x] Add index on `contacts.email` in `src/lib/db/schema/operations.ts`.
- [x] Run `npx drizzle-kit generate` to scaffold migration.
- [x] Review scaffolded migration SQL.
- [x] Run `npx drizzle-kit migrate` (or push) after confirming SQL is correct.

## 7. Documentation & Verification Gate
- [x] Document changes in `README.md`.
- [x] Verify Types: `npx tsc --noEmit`
- [x] Lint Checks: `npm run lint`
- [x] Unit & Integration Tests: `npm test`
- [x] Production Build: `npm run build`
