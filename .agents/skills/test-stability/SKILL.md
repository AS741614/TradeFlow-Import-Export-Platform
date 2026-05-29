---
name: test-stability
description: Use this skill when writing or modifying tests in TradeFlow. Encodes clearDatabase pattern, auth fixtures, and stability requirements.
---

# Test Stability Conventions

## Setup
- Import `clearDatabase` from auth-fixture (correct child→parent dependency order)
- Use `seedTestAuth()` for authenticated requests
- Set `process.env.DISABLE_AUTO_SEEDING = 'true'` if needed

## Type Safety in Tests
- Never use `!` non-null assertion
- Use `expect(x).toBeDefined()` then access via narrowed type
- Cast `req.json()` result as a typed const, not via `as any`

## Error Catching in Tests
- Catch with `(error: unknown)`
- Narrow with `instanceof Error` checks
- For DB error codes, use `Object.assign` or proper Error subclass

## Stability Requirements
- New features: add tests, don't reduce coverage
- Run `npm test` 3x to catch flakiness before commit
- Existing test count: 285 (as of Phase 14B)
