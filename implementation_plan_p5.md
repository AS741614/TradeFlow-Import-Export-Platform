# Implementation Plan — Strict TS Refactoring

This plan details the steps to eliminate all 15 `strict-ts-deferred` comments in the codebase. We will resolve array index type uncertainties (resulting from `noUncheckedIndexedAccess`) by introducing default constant assertions at the source (Category A) and replacing `.split('T')[0]` string-splitting hacks with a type-safe `toISODate` helper (Category B).

## Proposed Changes

### Category A: Constants Default Assertions

#### [MODIFY] [constants.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/constants.ts)
Convert arrays to `readonly string[]` and `as const`, then export length-guarded and non-null-asserted default constants.

```typescript
// ---- Product Categories ----
export const PRODUCT_CATEGORIES: readonly string[] = [
  'Electronics',
  'Textiles & Apparel',
  'Food & Beverages',
  'Raw Materials',
  'Machinery',
  'Chemicals',
  'Automotive Parts',
  'Furniture',
  'Medical Supplies',
  'Consumer Goods',
  'Agricultural Products',
  'Other',
] as const;

if (PRODUCT_CATEGORIES.length === 0) {
  throw new Error('PRODUCT_CATEGORIES list must not be empty');
}
export const DEFAULT_PRODUCT_CATEGORY: string = PRODUCT_CATEGORIES[0]!;
// Reason for non-null assertion: guarded by length check above


// ---- Countries (common trade partners) ----
export const COUNTRIES: readonly string[] = [
  'United States', 'China', 'India', 'United Kingdom', 'Germany',
  'Japan', 'South Korea', 'Brazil', 'Canada', 'Australia',
  'France', 'Italy', 'Netherlands', 'Singapore', 'UAE',
  'Turkey', 'Mexico', 'Indonesia', 'Thailand', 'Vietnam',
  'Malaysia', 'Philippines', 'Bangladesh', 'Pakistan', 'South Africa',
  'Saudi Arabia', 'Egypt', 'Nigeria', 'Kenya', 'Sri Lanka',
] as const;

if (COUNTRIES.length < 2) {
  throw new Error('COUNTRIES list must contain at least 2 entries');
}
export const DEFAULT_COUNTRY: string = COUNTRIES[0]!;
// Reason for non-null assertion: guarded by length check above

export const DEFAULT_DESTINATION_COUNTRY: string = COUNTRIES[1]!;
// Reason for non-null assertion: guarded by length check above


// ---- Trade Terms (Incoterms 2020) ----
export const INCOTERMS: readonly string[] = [
  'EXW - Ex Works',
  'FCA - Free Carrier',
  'CPT - Carriage Paid To',
  'CIP - Carriage & Insurance Paid To',
  'DAP - Delivered at Place',
  'DPU - Delivered at Place Unloaded',
  'DDP - Delivered Duty Paid',
  'FAS - Free Alongside Ship',
  'FOB - Free on Board',
  'CFR - Cost & Freight',
  'CIF - Cost, Insurance & Freight',
] as const;

if (INCOTERMS.length === 0) {
  throw new Error('INCOTERMS list must not be empty');
}
export const DEFAULT_INCOTERM: string = INCOTERMS[0]!;
// Reason for non-null assertion: guarded by length check above


// ---- Carriers ----
export const CARRIERS: readonly string[] = [
  'Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'COSCO',
  'Evergreen', 'ONE', 'Yang Ming', 'ZIM', 'HMM',
  'DHL Freight', 'FedEx Logistics', 'UPS Supply Chain',
  'DB Schenker', 'Kuehne+Nagel', 'Other',
] as const;

if (CARRIERS.length === 0) {
  throw new Error('CARRIERS list must not be empty');
}
export const DEFAULT_CARRIER: string = CARRIERS[0]!;
// Reason for non-null assertion: guarded by length check above
```

---

### Category B: `toISODate` Utility

#### [MODIFY] [utils.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/utils.ts)
Add a type-safe `toISODate` utility function.

```typescript
/**
 * Converts a Date or date-coercible value to ISO date string (YYYY-MM-DD).
 * Returns empty string if input is invalid.
 * Replaces the .toISOString().split('T')[0] pattern with type safety.
 */
export function toISODate(input?: Date | string | number): string {
  const date = input === undefined ? new Date() : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  const iso = date.toISOString();
  const datePart = iso.split('T')[0];
  return datePart ?? '';
}
```

---

## Mapping Table (15 Replacement Locations)

We will remove all comments matching `strict-ts-deferred` and replace the fallback code as follows:

| # | File | Line | Original Fallback Code | Type-Safe Replacement |
| :--- | :--- | :---: | :--- | :--- |
| 1 | `src/app/operations/contacts/page.tsx` | 14 | `country: COUNTRIES[0] ?? ''` | `country: DEFAULT_COUNTRY` |
| 2 | `src/app/operations/contacts/page.tsx` | 18 | `tradeTerms: INCOTERMS[0] ?? ''` | `tradeTerms: DEFAULT_INCOTERM` |
| 3 | `src/app/operations/contacts/page.tsx` | 63 | `tradeTerms: contact.tradeTerms ?? INCOTERMS[0] ?? ''` | `tradeTerms: contact.tradeTerms ?? DEFAULT_INCOTERM` |
| 4 | `src/app/operations/inventory/page.tsx` | 21 | `category: PRODUCT_CATEGORIES[0] ?? ''` | `category: DEFAULT_PRODUCT_CATEGORY` |
| 5 | `src/app/operations/inventory/page.tsx` | 27 | `origin: COUNTRIES[0] ?? ''` | `origin: DEFAULT_COUNTRY` |
| 6 | `src/app/operations/shipments/page.tsx` | 13 | `origin: COUNTRIES[0] ?? ''` | `origin: DEFAULT_COUNTRY` |
| 7 | `src/app/operations/shipments/page.tsx` | 14 | `destination: COUNTRIES[1] ?? ''` | `destination: DEFAULT_DESTINATION_COUNTRY` |
| 8 | `src/app/operations/shipments/page.tsx` | 15 | `carrier: CARRIERS[0] ?? ''` | `carrier: DEFAULT_CARRIER` |
| 9 | `src/app/outreach/contacts/page.tsx` | 16 | `country: COUNTRIES[0] ?? 'United States'` | `country: DEFAULT_COUNTRY` |
| 10 | `src/app/operations/compliance/page.tsx` | 35 | `const now = nowISO().split('T')[0] ?? ''` | `const now = toISODate()` |
| 11 | `src/app/operations/compliance/page.tsx` | 42 | `requiredBy: new Date(Date.now() + 15 * ...).toISOString().split('T')[0] ?? ''` | `requiredBy: toISODate(Date.now() + 15 * 24 * 60 * 60 * 1000)` |
| 12 | `src/app/operations/compliance/page.tsx` | 77 | `requiredBy: new Date(Date.now() + 10 * ...).toISOString().split('T')[0] ?? ''` | `requiredBy: toISODate(Date.now() + 10 * 24 * 60 * 60 * 1000)` |
| 13 | `src/app/operations/invoices/page.tsx` | 55 | `issuedDate: new Date().toISOString().split('T')[0] ?? ''` | `issuedDate: toISODate()` |
| 14 | `src/app/operations/invoices/page.tsx` | 56 | `dueDate: new Date(Date.now() + 30 * ...).toISOString().split('T')[0] ?? ''` | `dueDate: toISODate(Date.now() + 30 * 24 * 60 * 60 * 1000)` |
| 15 | `src/app/outreach/campaigns/page.tsx` | 41 | `scheduledAt: new Date(Date.now() + 24 * ...).toISOString().split('T')[0] ?? ''` | `scheduledAt: toISODate(Date.now() + 24 * 60 * 60 * 1000)` |

---

## Test Verification Plan

### New Unit Tests
Add a new describe block in `src/lib/__tests__/utils.test.ts` for `toISODate`:
- `should return today's ISO date string when input is undefined`
- `should return correct YYYY-MM-DD date string when input is a Date object`
- `should return correct YYYY-MM-DD date string when input is an ISO string`
- `should return correct YYYY-MM-DD date string when input is a numeric timestamp`
- `should return empty string when input is invalid date or timestamp`
- `should return correct YYYY-MM-DD date string for future date`

---

## Impact Summary

- **Total Files Touched:** 10 files (2 libraries, 1 test suite, 7 page components)
- **Predicted Coverage Impact:** Positive / Neutral (utils.ts branch coverage will be maintained or improved by testing `toISODate` thoroughly)
