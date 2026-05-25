# Implementation Plan — TradeFlow Governance Harmonization

This plan details the harmonization of the project's governance documentation across four files (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `TESTING.md`), alongside an additive edit to the `README.md`.

---

## 1. Project Stack & Environment Confirmation

Based on the inspection of `package.json` and `src/lib/storage.ts`:

- **Next.js Version**: `16.2.6` (App Router)
- **React Version**: `19.2.4`
- **ESLint Configured**: **No**. There is no ESLint package dependency, devDependency, or config file in the root. The verification gate step for `npm run lint` will be listed as skipped unless it's configured.
- **STORAGE_KEYS Current Content**:
  ```typescript
  export const STORAGE_KEYS = {
    PRODUCTS: 'products',
    SHIPMENTS: 'shipments',
    INVOICES: 'invoices',
    CONTACTS: 'contacts',
    COMPLIANCE: 'compliance',
    TASKS: 'tasks',
    BUSINESS_PLAN: 'business_plan',
    SWOT: 'swot_items',
    PROJECTIONS: 'projections',
    COST_ITEMS: 'cost_items',
    OUTREACH_CONTACTS: 'outreach_contacts',
    EMAIL_TEMPLATES: 'email_templates',
    CAMPAIGNS: 'campaigns',
  } as const;
  ```

---

## 2. Quoted Current State of Existing Governance Files

### A. Current `CLAUDE.md`
```markdown
# TradeFlow Project Guide — CLAUDE.md

Quick reference for commands, styling conventions, and rules when editing the TradeFlow project.

## 🚀 Build & Development Commands
- **Start Local Server**: `npm run dev`
- **Build Production Bundle**: `npm run build`
- **Verify TypeScript Compilation**: `npx tsc --noEmit`

## 🎨 Code Style & Styling Conventions
- **Style Constraints**: All CSS rules are located in [globals.css](file:///src/app/globals.css). Do not import Tailwind CSS, separate modular stylesheets, or CSS-in-JS libraries. Leverage the predefined CSS variable system (`--accent-blue`, `--bg-secondary`, `--radius-lg`, etc.).
- **Typography & Icons**: Use the Inter font family. Write clean, inline SVGs with standard paths and no hardcoded dimensions (let the global CSS `svg` rules size and stroke them).
- **TypeScript**: Strictly type-safe code. Avoid using `any`. Create new models or types directly inside [types.ts](file:///src/lib/types.ts) if necessary.

## 🧠 Architecture Principles
- **Data Persistence**: Local Storage first. Always read and write using [storage.ts](file:///src/lib/storage.ts) wrappers to keep client-side updates fluid.
- **Interactivity**: Mark stateful templates with `'use client';`. Ensure all buttons, forms, selects, and links have unique, descriptive `id` attributes.
- **Commit Format**: Use conventional commits (e.g. `feat: add ...`, `fix: resolve ...`, `style: update css ...`).
```

### B. Current `AGENTS.md`
```markdown
# TradeFlow Coding Agent Directives — AGENTS.md

Welcome to the TradeFlow Import-Export platform repository. If you are an AI coding assistant, developer agent, or automatic review system, you MUST conform to the rules and mappings outlined below.

---

## 🛠️ Codebase Stack & Constraints

1. **Framework & Setup**:
   - Built on Next.js 16 (React 19) utilizing the App Router directory structure under `src/app/`.
   - Written in highly strict TypeScript. Do not bypass compile-time checks or use `any`.

2. **Styling Rules**:
   - Styling is strictly centralized in [globals.css](file:///src/app/globals.css).
   - Do NOT add Tailwind CSS packages or write custom CSS modules (`.module.css`).
   - Re-use established CSS custom properties for gradients, cards, forms, metrics, and list staggered entries.

3. **Client-Side State Persistence**:
   - The application does not connect to an active SQL/NoSQL backend database.
   - Utilize [storage.ts](file:///src/lib/storage.ts) API commands (`getItems`, `addItem`, `updateItem`, `removeItem`) to read/write state with browser `localStorage`.
   - Never modify or write custom keys without appending them to the `STORAGE_KEYS` object definition inside `src/lib/storage.ts`.

4. **Testing & Test IDs**:
   - For browser testing, automation, and UI checks, all interactive components (buttons, links, inputs, selectors, and submit triggers) must contain a unique `id` attribute.

---

## 📂 Core Library Modules

- [types.ts](file:///src/lib/types.ts) — Blueprint interfaces for models.
- [storage.ts](file:///src/lib/storage.ts) — Data retrieval and deletion.
- [constants.ts](file:///src/lib/constants.ts) — Dropdowns arrays (Countries, Incoterms, product categories) and seed generators.
- [utils.ts](file:///src/lib/utils.ts) — Helper formulas for dates, currencies, and formatting text.
- [importers.ts](file:///src/lib/importers.ts) — CSV parse mapping arrays.
- [templateEngine.ts](file:///src/lib/templateEngine.ts) — Token substitution handlers.
- [email.ts](file:///src/lib/email.ts) — Simulation runner generating outreach funnel statistics.

---

## 🤖 Workflow Rules for Agents

- **Modifications**: Retain existing docstrings and code comments unless explicitly updating the associated logic.
- **Verification**: Run `npm run build` and `npx tsc --noEmit` locally before finalizing any code edits to ensure zero static-type failures.
- **Git Commits**: Write git commits conforming to Conventional Commits standards (e.g. `feat:`, `fix:`, `refactor:`, `style:`).
```

### C. Current `.cursorrules`
```markdown
# TradeFlow Project Cursor Rules

This project is a TypeScript Next.js App Router application designed for managing import/export trade operations. Follow these guidelines strictly.

## 🛠️ Tech Stack & Constraints
- **Framework**: Next.js App Router (React 19, Next.js 16)
- **Language**: TypeScript (strict types, no `any`)
- **Styling**: Vanilla CSS (specifically targeting the custom utilities and rules defined inside [globals.css](file:///src/app/globals.css)). Do NOT use Tailwind CSS, CSS Modules, or external style sheets unless explicitly requested.
- **State & Data**: Local-first storage model. Use [storage.ts](file:///src/lib/storage.ts) for reading and writing records to `localStorage`. Never create a remote database or server-side API dependencies unless instructed.

## 📁 Key Files Reference
- Core Interfaces: [types.ts](file:///src/lib/types.ts)
- localStorage Helpers: [storage.ts](file:///src/lib/storage.ts)
- Seed Data / Constants: [constants.ts](file:///src/lib/constants.ts)
- Utilities & Formats: [utils.ts](file:///src/lib/utils.ts)
- Stylesheet Design System: [globals.css](file:///src/app/globals.css)

## 💡 Code Conventions & Best Practices
- **Client Components**: Mark interactive client-side pages with `'use client';` at the top of the file.
- **Interactions**: Every interactive UI element (inputs, buttons, select, modals) MUST have a unique `id` attribute for testing purposes.
- **Local Persistence**: Use `STORAGE_KEYS` constants from `storage.ts` when retrieving or storing datasets to ensure key consistency.
- **SVG Icons**: Embed inline SVG paths instead of importing heavy image files or font libraries. Inline SVGs automatically inherit size and color properties from `globals.css`.
- **Transitions**: Apply the `.stagger-item` class to lists of cards, rows, or list elements to activate CSS slide-up entry animations.

## 🚀 Terminal Commands
- Run development server: `npm run dev`
- Production compilation build: `npm run build`
- Type checking verification: `npx tsc --noEmit`
```

---

## 3. Contradiction List

The following contradictions exist between `CLAUDE.md`, `AGENTS.md`, and `.cursorrules`:

1. **Next.js Version Specification**:
   - `AGENTS.md` (Section: Framework & Setup) states: "Built on Next.js 16".
   - `.cursorrules` (Section: Tech Stack & Constraints) states: "Next.js App Router (React 19, Next.js 16)".
   - `CLAUDE.md` does not specify version constraints, which creates ambiguity.
2. **Client Components Directive**:
   - `.cursorrules` (Section: Code Conventions) states: "Mark interactive client-side **pages** with `'use client';`".
   - This conflicts with the architecture rule of using Server Components by default, marking only **interactive leaves** (components) with `'use client'`, keeping parent routing pages server-rendered.
3. **Validation Command Discrepancy**:
   - `CLAUDE.md` and `.cursorrules` include only three validation commands: `npm run dev`, `npm run build`, and `npx tsc --noEmit`.
   - `AGENTS.md` states: "Run `npm run build` and `npx tsc --noEmit`".
   - There is no unified verification gate sequence including lint check or test run.

---

## 4. Gap List

The following details are currently unaddressed in the governance system:

1. **Verification Gate Sequence**: No ordered sequence of commands (`tsc`, `lint`, `test`, `build`) with pass/fail criteria is enforced.
2. **Backend-Portability Rules**: Gaps in defining portable guidelines:
   - Ensuring `types.ts` types are strictly JSON-serializable (dates as ISO 8601 strings rather than `Date` objects).
   - Enforcing async function signatures in `storage.ts` persistence interfaces to protect future client-server database transitions.
   - Forbidding direct reference of `localStorage` inside UI components.
3. **Scope Discipline**: Lack of directives restricting agents to the prompt's `Allowed Files` list, and rules against unrelated "drive-by" refactoring.
4. **Failure Behavior**: No rules mapping out how compiler/lint failures must be fixed before declaring done, or when to stop and ask for clarification.
5. **Output Discipline**: Absence of standard formatting templates for final agent replies (listing changed files, un-changed files considered, compile trace outputs, and deviations).
6. **Testing Posture & Discipline**: No governance regarding Vitest + Playwright setups, test conventions, file layouts, mocking local storage, or priority testing targets.

---

## 5. Proposed AGENTS.md (and CLAUDE.md) Table of Contents

```markdown
# TradeFlow Project Governance and Architectural Mandates

1. Project Identity
2. Architectural Commitments (Local-First, Backend-Portable)
3. Styling Commitments (Vanilla CSS Design System)
4. Code Conventions (Strict TS, Leaf Component Isolation, Interactive IDs)
5. Workflow Mode (Planning vs. Direct Execution)
6. Verification Gate (Validation Pipeline Sequence)
7. Scope Discipline
8. Failure Behavior
9. Output Discipline (Reporting Template)
10. Core Library Reference
11. Related Documents
```

---

## 6. Proposed TESTING.md Table of Contents

```markdown
# TradeFlow Testing Discipline and Conventions

1. Testing Philosophy
2. Planned Tooling (Vitest, React Testing Library, JSDOM, Playwright)
3. Test File Layout & Directories
4. Test Conventions (Structure, Timers, Local Storage Mocks)
5. Test Focus Priorities
6. Test Naming Syntax
7. Coverage Posture
8. Running Tests
9. Out-of-Scope Tests
```

---

## 7. Proposed README.md "Governance" Addition

```markdown
## Governance

This project is governed by four documents:
- `AGENTS.md` — full spec for AI coding agents
- `CLAUDE.md` — mirror of AGENTS.md
- `.cursorrules` — compressed cross-tool summary
- `TESTING.md` — test discipline and conventions

Any AI agent or human contributor must read AGENTS.md before making changes.
```

---

## 8. Workflow Gate

Once you approve this plan, I will write the final files. Please provide feedback or write "Approved" to proceed to the Implementation Phase.
