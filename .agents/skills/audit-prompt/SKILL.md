---
name: audit-prompt
description: Use this skill for complex audit-style refactors, multi-file changes, or feature additions that touch many entities. Follows research→plan→approve→implement→verify pattern. Apply when user asks for "audit", "tier", "refactor", or when scope is >5 files.
---

# Audit Prompt Workflow

This skill encodes TradeFlow's standard pattern for complex changes.

## Step 1 — Research Phase
- Read `implementation_plan_pXXX.md` if it exists
- Use `grep_search` and `view_file` to inspect all affected entities  
- List query files in `src/lib/db/queries/`
- List route files in `src/app/api/`
- Inspect schema files in `src/lib/db/schema/`
- Note current test count baseline

## Step 2 — Plan Phase  
- Write `implementation_plan.md` to BOTH locations:
  - Workspace root: `./implementation_plan_pXXX.md`
  - Brain artifacts: `../brain/<conv-id>/implementation_plan_pXXX.md`
- Plan includes: User Review Required section, Proposed Changes per component, 
  Verification Plan with test count target
- **STOP and request approval** before any file modifications

## Step 3 — Migration Phase (if applicable)
- Generate SQL migration with BEGIN/COMMIT wrapper
- Generate matching `_ROLLBACK.sql` file
- PAUSE: paste SQL in chat, await "apply" confirmation
- Apply via `docker exec ... psql`
- Verify with `pg_indexes` query

## Step 4 — Implementation Phase
- Build helpers/utilities FIRST with unit tests in isolation
- Wire into ONE entity first, verify, then roll out to others
- Use `multi_replace_file_content` for surgical edits
- Run tests frequently — fail fast

## Step 5 — Verification Gate (REQUIRED)
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 warnings, 0 errors  
- `npm test` (3x for flakiness) → all passing
- `npm run build` → success
- ALL must pass before commit

## Step 6 — Commit & Push
- Conventional commit: `feat(scope): summary`
- Include bullet points of major changes
- Mention test count delta
- `git push origin feat/backend-foundation`

## Reporting Final State
- Final report includes: commit hash, test count, sample code snippets,
  files changed list, deviations from plan
