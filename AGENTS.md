# TradeFlow Project Governance and Architectural Mandates

This document serves as the authoritative specification for all developers and AI coding agents working on the TradeFlow codebase. Compliance with these mandates is strictly required.

---

## Section 1: Project Identity
- **Project Name**: TradeFlow
- **Core Scope**: Single-owner Import/Export business management and outreach platform.
- **Stack Versions**:
  - Framework: Next.js 16 (App Router)
  - Runtime: React 19
  - Language: TypeScript (strict mode enabled)
- **Persistence Model**: Local-first TODAY using browser-based storage; must remain 100% backend-portable for TOMORROW.
- **Domain Modules**:
  - **operations**: Inventory, Shipment tracking, Invoices, Contacts directory, Compliance
  - **finance**: Margin calculator, Currency converter, P&L projections
  - **outreach**: Email campaign builder, Contact import parses, Funnel tracking
  - **business-plan**: Strategic SWOT matrix and text section editor
  - **projects**: Kanban planning dashboard

---

## Section 2: Architectural Commitments
- **Persistence Encapsulation**: All read and write operations MUST be mediated exclusively through `src/lib/storage.ts`.
- **LocalStorage Restriction**: UI components and pages MUST NOT reference `localStorage` directly.
- **Storage Keys Isolation**: UI components and pages MUST NOT reference storage key strings directly. They must access them only via the exported `STORAGE_KEYS` object.
- **JSON Serialization**: All domain types declared inside `src/lib/types.ts` must be fully JSON-serializable. Date attributes must use ISO 8601 strings (e.g., `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`) rather than JS `Date` objects.
- **Async Portability Signature**: To protect the future migration to a client-server remote database, all storage operations (CRUD functions in `storage.ts`) must be design-expressible as async function signatures (returning `Promise<T>`), even if they resolve synchronously today under `localStorage`.
- **Extended Concerns**: New persistence logic must extend `storage.ts`. Components must remain pure state-presenters and logic-handlers, separated from storage details.
- **Storage Key Grouping**: `STORAGE_KEYS` entries must be mentally grouped by domain owner (operations, finance, outreach, business-plan, projects). When adding a new key, you must include an inline comment naming its domain. This grouping defines the table/collection boundaries for the future backend migration.

---

## Section 3: Styling Commitments
- **Centralized CSS**: All styling must live exclusively in [src/app/globals.css](file:///src/app/globals.css).
- **CSS Tokens**: Style elements using CSS custom properties (`--accent-blue`, `--bg-secondary`, `--radius-lg`, etc.). Do not define ad-hoc hex codes or inline dimensions that drift from the system.
- **Forbidden Libraries**: Do NOT use Tailwind CSS, CSS Modules, styled-components, emotion, or any other style sheets/frameworks.
- **Inline Style Limits**: Do NOT use inline React `style={{}}` attributes, except for dynamically calculated numerical values (e.g. progress bar widths, timeline positioning).
- **SVG Rules**: All icons must be inline SVG components only. Do not install or import icon libraries (e.g. `lucide-react`, `heroicons`). Inline SVGs will inherit dimension and color values automatically from rules defined in `globals.css`.
- **Transitions**: Apply the `.stagger-item` animation class to lists, arrays, or loops of cards and rows to enable CSS slide-up entry animations.
- **Typography**: The primary typeface is the Inter font family.

---

## Section 4: Code Conventions
- **TypeScript Strictness**: Strictly typed structures only. Do NOT use `any`. Use `unknown` and narrow types using type guards or checks.
- **Path Resolution**: Use absolute path aliases starting with `@/*` (e.g., `@/lib/storage`, `@/components/layout/TopBar`). Never use deep relative paths (e.g., `../../../lib/storage`).
- **Server Components by Default**: Leverage Next.js Server Components. Mark files with the `'use client';` directive only at the interactive leaf level (modals, forms, buttons) where state hooks are required.
- **Interactive Identifiers**: Every interactive element (button, input, select, link, modal trigger) MUST have a unique, descriptive `id` attribute. This is strictly enforced to ensure automated testability.
- **Code Comments**: Retain existing docstrings and code comments unless explicitly refactoring the associated logic.
- **Conventional Commits**: Commit messages must follow the Conventional Commits specification:
  - `feat`: new features or pages
  - `fix`: bug fixes and logic repairs
  - `refactor`: structural updates with no behavior changes
  - `style`: layout alignments and visual adjustments
  - `test`: test additions and suites updates
  - `chore`: repository tasks
  - `docs`: documentation file changes

---

## Section 5: Workflow Mode
AI developer agents must operate under **Planning Mode** by default.

- **Planning Mode Requirements**: You must stop, research, write an `implementation_plan.md` in the workspace, and obtain user approval BEFORE writing code for any task that:
  - Touches more than one file.
  - Modifies files under `src/lib/**`.
  - Modifies files under `src/app/api/**`.
  - Modifies any configuration file (`package.json`, `tsconfig.json`, `next.config.ts`, `.github/**`).
  - Adds or removes a dependency.
- **Direct Execution Rules**: You may write and execute changes immediately (without writing a plan or stopping for review) ONLY for:
  - Single-component visual or cosmetic tweaks.
  - Copy text corrections.
  - Read-only codebases or directories investigation.

---

## Section 6: Verification Gate
At the end of every task, you must run the following verification sequence in order, and output the raw terminal results:

1. **Verify Types**: `npx tsc --noEmit` (Must return zero errors)
2. **Lint Checks**: `npm run lint` (Must return zero errors. If the `lint` script does not exist in `package.json`, mark it exactly as: `SKIPPED — to be configured in a later prompt`. Do not invent or substitute an alternative lint command. Do not silently pass the step.)
3. **Unit & Integration Tests**: `npm test` (Must return all green. Skip only if test runner is not yet installed in the workspace.)
4. **Production Build**: `npm run build` (Must succeed compile and static route generations)

If any step fails, the task is incomplete. Resolve the failure and restart the verification sequence from step 1.

---

## Section 7: Scope Discipline
- **Boundary Restriction**: Modify ONLY files listed in the task description's "Allowed Files" section.
- **Escalation**: If a task requires editing a file outside the allowed list, you must STOP and request explicit permission.
- **Refactoring Restrictions**: No unrelated "drive-by" code refactoring. Target edits precisely to preserve git diff histories.
- **Audit-trail file preservation**: NEVER `rm` or delete files matching `implementation_plan*.md`, `walkthrough*.md`, or `task*.md` from the repository root. These document the partnership decision history. Before any cleanup or `rm` operation, check filenames against this pattern. If a plan file appears stale, MOVE it to `docs/history/` rather than deleting. Cleanup commands like `rm -f *.md` are forbidden in the repo root regardless of glob.

---

## Section 8: Failure Behavior
- **Compilation/Lint Failures**: Read the console stack trace, isolate the code block, fix the root cause, and restart verification.
- **Task Ambiguity**: STOP and ask the user a single, structured question to clarify requirements. Do not guess.
- **Rules Conflict**: If instructions in a task contradict these mandates, STOP and report the conflict immediately.

---

## Section 9: Output Discipline
Every agent completion response must include:
1. **Files Changed**: A checklist of modified files.
2. **Files Considered But Not Changed**: A checklist of files reviewed with a brief reason explaining why they were left untouched.
3. **Verification Command Outputs**: Raw terminal stdout/stderr for the verification gate commands run.
4. **Deviations**: Any deviations made from the approved plan with a detailed technical rationale.

---

## Section 10: Core Library Reference
- `src/lib/types.ts` — Shared TypeScript models and types.
- `src/lib/storage.ts` — Data layer persistent interface. `STORAGE_KEYS` definitions.
- `src/lib/constants.ts` — Sourcing variables (Countries, Incoterms, categories) and seeds.
- `src/lib/utils.ts` — Currencies, dates, and typography formatting helper utilities.
- `src/lib/importers.ts` — CSV and JSON delimiter parsers and data mappings.
- `src/lib/templateEngine.ts` — Dynamic merge-tokens substitution helper.
- `src/lib/email.ts` — Sourcing campaigns simulation statistics generator.
- `src/lib/db/` — Database migration track schemas, client, and migrations.
  - `src/lib/db/client.ts` — Drizzle Node-Postgres client factory with manual environment loading.
  - `src/lib/db/schema/index.ts` — Barrel exports of all tables and enums.
  - `src/lib/db/schema/` — SQL tables and pgEnum declarations partitioned by functional domain (core, operations, finance, outreach, business).

---

## Section 11: Related Documents
- `TESTING.md` — Testing philosophies, Vitest/Playwright conventions, and localStorage mock setups.
- `.cursorrules` — Compressed workspace instructions for Cursor IDE.
- `README.md` — Developer onboarding overview.
- `.env.example` — Template defining local PostgreSQL environment variables.

---

## Section 12: API Conventions and Tenancy Safeguards (Phase 8a)
- **API Route Placement**: All REST endpoints live under `src/app/api/[entity]/` and `src/app/api/[entity]/[id]/`.
- **Validation**: All request payloads must be validated using Zod schemas defined under `src/lib/db/validation/`.
- **Tenant Isolation**: Every database read, insert, update, or delete MUST be scoped by the organization ID (`DEFAULT_ORG_ID` for now). Ensure `withTenant` from `src/lib/db/queries/base.ts` is applied to all WHERE conditions.
- **Deletions Auditing**: Standard DELETE operations must be executed inside a Drizzle transaction where:
  1. The row to be deleted is selected first.
  2. A snapshot of the row is inserted into the `deletion_logs` table (using the `deleteWithLog` helper).
  3. The target row is hard deleted from its table.
