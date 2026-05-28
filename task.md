# Task Checklist - Prompt 11 (Tier 1 Critical Fixes & Bulk Import Foundation)

## Rate Limiting & Bypass (ADJUSTMENT 1)
- [x] Implement rate limiter bypass check on `process.env.NODE_ENV === 'test'` or `process.env.DISABLE_RATE_LIMIT === 'true'` in `src/lib/rate-limiter.ts`.
- [x] Implement/verify explicit test cases in `src/lib/__tests__/rate-limiter.test.ts`.

## Error Sanitization & 401 Preservation (ADJUSTMENT 2)
- [x] Check for `Unauthorized` error message first and return 401 status in `src/lib/db/error-sanitizer.ts`.
- [x] Implement/verify explicit test case in `src/lib/__tests__/error-sanitizer.test.ts`.
- [x] Confirm all 28 API routes catch blocks utilize `handleRouteError`.

## Server-Side Dashboard Seeding (ADJUSTMENT 3)
- [x] Verify sample data seeding is fully implemented in the `/api/dashboard/stats` endpoint (`src/lib/db/queries/dashboard.ts` and `src/app/api/dashboard/stats/route.ts`).
- [x] Verify that ALL seeding is removed from `src/app/page.tsx`.
- [x] Verify test cases in `src/app/api/__tests__/dashboard-stats.test.ts`.

## Reference Bulk Import (NOTE B)
- [x] Implement Zod request body validation in `/api/contacts/bulk-import/route.ts`.
- [x] Reject payloads with rows length > 1000 with a 413 Payload Too Large response.
- [x] Implement database helper `bulkImportContacts` supporting continuation and transactional rollback in `src/lib/db/queries/contacts-bulk.ts`.
- [x] Verify tests in `src/app/api/__tests__/contacts-bulk.test.ts`.

## Verification Gate (Section 6 Compliance)
- [x] Verify Types: `npx tsc --noEmit`
- [x] Lint Checks: `npm run lint`
- [x] Unit & Integration Tests: `npm test`
- [x] Production Build: `npm run build`
