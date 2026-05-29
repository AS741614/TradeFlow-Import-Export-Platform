---
name: api-endpoint
description: Use this skill when creating or modifying TradeFlow API routes under src/app/api. Encodes auth, validation, audit logging, and response patterns.
---

# TradeFlow API Endpoint Conventions

## Standard Imports

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { logActivity, getDiff } from '@/lib/audit-logger';
```

## GET (List Endpoint)
- Parse search params: `new URL(req.url).searchParams`
- Use `buildSearchAndSort` from `src/lib/db/queries/search-helpers`
- Apply whitelisted columns per entity
- Standard pagination: limit + offset
- Return: `{ data: [...], total: N, hasMore: boolean }`

## POST (Create)
- Validate body with Zod schema from `src/lib/db/validation/`
- Scope to `session.orgId`
- Use `.returning()` to get created row
- `logActivity({ action: 'created', entityType, entityId, changeSummary: { created: row } })`
- Return 201 with created row

## PATCH (Update)
1. Select existing row (scoped to orgId)
2. `UPDATE...RETURNING *` (one query, not 2)
3. `const diff = getDiff(before, after)`
4. `logActivity({ action: 'updated', changeSummary: { before, after, changedFields }})`
5. Return 200 with updated row

## DELETE
- Use `deleteWithLog` from `src/lib/db/queries/base.ts`
- Don't reinvent — pattern handles audit log automatically

## Bulk Operations
- Bulk-delete: use `executeBulkDelete` helper from `src/lib/db/bulk-delete-helper.ts`
- Bulk-import: row-by-row validation, return per-row errors

## Error Handling
- Use `error-sanitizer.ts` for safe error responses
- Never leak stack traces in production
- Return appropriate HTTP codes: 400/401/403/404/409/500
