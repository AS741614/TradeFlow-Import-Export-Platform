# Implementation Plan - Prompt 12: Tier 2 Important Fixes

Apply all 7 Tier 2 important findings from the database audit, plus one index lookup optimization.

## User Review Required

> [!IMPORTANT]
> - **Pagination on all 13 List Endpoints**: List routes will now return `{ data: T[], pagination: { limit, offset, total, hasMore } }` instead of raw array lists. Pagination limits are constrained to $[1, 200]$ with a default of 50.
> - **Invoices & Shipments N+1 Query Optimizations**: `getInvoices` and `getShipments` will be refactored to execute as a single SQL query using `innerJoin` on a paginated ID subquery and `leftJoin` for sub-resources (line items, products, documents), grouping results in memory.
> - **Tightened String Validations**: String fields across all Zod validation schemas are capped at `.max(255)` unless they are notes/description fields (`.max(5000)`), email fields (`.max(254)`), or long text fields (`.max(10000)`).
> - **Contacts Email Index**: We will append an index `idx_contacts_email` on `contacts.email` in `src/lib/db/schema/operations.ts` and scaffold a migration script via `drizzle-kit generate`.

> [!CRITICAL]
> - **Pagination Backward-Compatibility (Adjustment)**: Pagination metadata is additive only. Existing integration and unit tests (241 passing) must continue to pass unchanged. We will not change the location or structure of `data` arrays, preserving compatibility.
> - **N+1 Verification (Note 1)**: Drizzle's built-in `Logger` API will be configured in test mode to count actual query executions instead of mocking or spying on database driver prototypes.
> - **Migration Safety (Note 2)**: We will run `npx drizzle-kit generate` to generate the migration file, inspect the generated SQL to verify its correctness, and then apply it to the database.

## Proposed Changes

### Component: Shared Validation Systems

Create shared validations to enforce database consistency across all modules.

#### [NEW] [_shared.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/_shared.ts)
- Define `ISO_4217_CODES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'JPY', 'CNY', 'CHF', 'AED', 'SAR', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN'] as const`.
- Define `currencyEnumSchema = z.enum(ISO_4217_CODES)`.

---

### Component: Zod Schemas Tightening

Tighten validation parameters across all 14 schema files.

#### [MODIFY] [contacts.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/contacts.ts)
- `company`, `contactPerson`, `phone`, `country`, `tradeTerms`: add `.max(255)`
- `email`: add `.max(254)` (RFC standard)
- `address`, `notes`: add `.max(5000)` (description exceptions)

#### [MODIFY] [products.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/products.ts)
- `name`, `sku`, `hsCode`, `category`, `supplier`, `origin`: add `.max(255)`
- `currency`: replace with `currencyEnumSchema`

#### [MODIFY] [shipments.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/shipments.ts)
- `reference`, `origin`, `destination`, `carrier`, `trackingNumber`, `shipmentDocumentInputSchema.name`: add `.max(255)`
- `notes`: add `.max(5000)`

#### [MODIFY] [invoices.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/invoices.ts)
- `number`, `lineItemInputSchema.description`: add `.max(255)`
- `currency`: replace with `currencyEnumSchema`
- `notes`: add `.max(5000)`
- **Arithmetic Refinement**: Define schemas from `invoiceBaseObject` to support `.refine()`:
  - Add `.refine((data) => Math.abs((data.subtotal + data.tax) - data.total) < 0.01)` to `insertInvoiceSchema` and `updateInvoiceSchema` (skipping refinement on update if subtotal, tax, and total are all undefined).

#### [MODIFY] [compliance.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/compliance.ts)
- `documentName`, `documentType`: add `.max(255)`
- `notes`: add `.max(5000)`

#### [MODIFY] [cost-items.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/cost-items.ts)
- `description`: add `.max(255)`
- `currency`: replace with `currencyEnumSchema`

#### [MODIFY] [email-templates.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/email-templates.ts)
- `name`, `subject`: add `.max(255)`
- `body`: add `.max(10000)` (long text exception)

#### [MODIFY] [campaigns.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/campaigns.ts)
- `name`, `subjectLineA`, `subjectLineB`: add `.max(255)`

#### [MODIFY] [outreach-contacts.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/outreach-contacts.ts)
- `firstName`, `lastName`, `company`, `phone`, `country`: add `.max(255)`
- `email`: add `.max(254)`

#### [MODIFY] [business-plan.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/business-plan.ts)
- `title`: add `.max(255)`
- `content`: add `.max(10000)`

#### [MODIFY] [swot.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/swot.ts)
- `text`: add `.max(255)`

#### [MODIFY] [tasks.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/tasks.ts)
- `title`, `assignee`, `category`, `tags`: add `.max(255)`
- `description`: add `.max(5000)`

#### [MODIFY] [financial-projections.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/financial-projections.ts)
- `month`: add `.max(255)`
- `currency`: replace with `currencyEnumSchema`

#### [MODIFY] [app-metadata.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/validation/app-metadata.ts)
- `value`: add `.max(10000)`

---

### Component: Query Engine N+1 Fixes & Schema Indexing

Refactor queries to run as single statements and introduce index.

#### [MODIFY] [client.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/client.ts)
- Add a globally accessible `queryHistory` array and a custom Drizzle `Logger` to count queries executed in test mode.

#### [MODIFY] [operations.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/operations.ts)
- Add index on contacts: `index('idx_contacts_email').on(table.email)`.

#### [MODIFY] [invoices.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/invoices.ts)
- Update `getInvoices(orgId, limit, offset)` to select DISTINCT invoices from a subquery and leftJoin `invoiceLineItems` + `contacts` in a single query.
- Use innerJoin on a subquery limiting invoice IDs to support proper SQL pagination mapping.

#### [MODIFY] [shipments.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/queries/shipments.ts)
- Update `getShipments(orgId, limit, offset)` using the same subquery join pattern to fetch shipments and leftJoin products/documents in a single database roundtrip.

---

### Component: Pagination API Routes Integration

Update all 13 list handlers to support `limit` and `offset` query parameters.

#### [MODIFY] [13 list route.ts files](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api)
- `contacts/route.ts`, `products/route.ts`, `shipments/route.ts`, `invoices/route.ts`, `tasks/route.ts`, `campaigns/route.ts`, `outreach-contacts/route.ts`, `email-templates/route.ts`, `compliance/route.ts`, `cost-items/route.ts`, `financial-projections/route.ts`, `swot/route.ts`, `business-plan/route.ts`
- Implement query parameter parser checking `?limit` and `?offset` (defaults: limit=50, offset=0).
- Retrieve count indicator from the table via a separate `count()` query.
- Call queries/db selecting rows with `limit` and `offset` parameters.
- Return payload format: `{ data: T[], pagination: { limit, offset, total, hasMore } }`.

#### [MODIFY] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/email/send/route.ts)
- Wrap response object inside consistent `{ data: { success, message, campaignId } }` envelope.

---

### Component: Documentation

#### [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
- Document the pagination endpoint response format change.
- Document the email dispatch envelope consistency migration.

---

## Verification Plan

### Automated Tests
```bash
# Verify Type Safety
npx tsc --noEmit

# Lint Check
npm run lint

# Run Vitest test suites
npm test
```

We will implement the following new unit tests:
1. `src/lib/__tests__/_shared-validation.test.ts` (NEW)
   - Verify that Zod currency schema successfully parses valid ISO 4217 codes (`USD`, `EUR`, `BRL`, etc.) and rejects invalid ones (`XYZ`, `123`).
2. Update existing integration test suites in `src/app/api/__tests__/` to mock paginated responses and assert the pagination metadata structure.
3. Add a dedicated query counting test in `src/lib/__tests__/invoices-n1.test.ts` (or in existing invoices test):
   - Create 5 invoices with 3 line items each.
   - Use Drizzle's built-in logger to count query executions.
   - Call `getInvoices` and assert that the number of database queries executed is exactly 2 (1 for count, 1 for distinct invoices/items join) instead of 6+.

#### Test Count Target
- Current passing tests: **241**
- Predicted final test count: **260+**

### Manual Verification
1. **Pagination Audit**: Call `GET /api/contacts?limit=3&offset=0`. Verify the response returns exactly 3 contacts and a pagination metadata payload with `total`, `limit=3`, `offset=0`, `hasMore: true/false`.
2. **Invoice Arithmetic Check**: Attempt a `POST` request to `/api/invoices` with `subtotal = 100`, `tax = 10`, `total = 200`. Verify that the validator returns `400 Bad Request` and highlights arithmetic validation failure.
3. **Currency Enum Check**: Attempt to write a product or projection with `currency = 'USD'`. Verify it succeeds. Attempt with `currency = 'XYZ'`. Verify it fails with `400 Bad Request` and details the enum validation constraint.
4. **String Length Enforcement**: POST a contact where the company name exceeds 255 characters. Verify it is rejected with a clear `.max` limit violation message.
5. **N+1 SQL query count check**: Run the dev server with pg query tracking active. Fetch all invoices with multiple line items, check console query logs, and confirm a single unified query retrieves the collection.
