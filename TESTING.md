# TradeFlow Testing Discipline and Conventions

This document outlines the testing protocols, structural file layouts, conventions, and mocking standards for the TradeFlow Import/Export platform. All contributors and AI coding agents must follow these guidelines.

---

## Section 1: Testing Philosophy
- **Refactoring Safety**: Tests protect refactoring. They form the validation firewall that permits aggressive codebase upgrades.
- **Agent Safety**: Without automated tests, every code modification made by an AI developer agent is a statistical coin flip. Tests are required to guarantee stability.

---

## Section 2: Planned Tooling (Planned, Not Installed)
The following testing framework tools are planned for installation in **Phase 0 Prompt 2**. Do NOT write implementation imports or execute test suites utilizing these libraries until they are officially installed.

- **Vitest** (Planned) — Fast, native unit and integration test runner.
- **@testing-library/react & @testing-library/jest-dom** (Planned) — Component rendering and DOM nodes inspection.
- **jsdom** (Planned) — In-memory browser workspace simulation for Node environments.
- **Playwright** (Planned) — High-fidelity end-to-end browser integrations (scheduled for installation in a later phase).

---

## Section 3: Test File Layout & Directories
Test suites must conform to the following directory structure:
- **Unit and Integration Tests**: Placed inside `src/lib/__tests__/*.test.ts` (co-located with their library files under `src/lib/`).
- **UI Component Tests**: Co-located directly within the component directories: e.g. `src/components/layout/__tests__/Sidebar.test.tsx`.
- **End-to-End Tests**: Managed under the root directory inside `e2e/*.spec.ts` using Playwright.

---

## Section 4: Test Conventions
- **Structure**: Organize tests using one root-level `describe` block per function or component under test.
- **Focus**: Keep tests modular. Restrict tests to 1–3 focused assertions per `it` block. Avoid writing long "god-tests" that verify multiple unrelated capabilities.
- **Time Controls**: Eliminate test flakiness caused by async timeouts or date operations. Use Vitest's `vi.useFakeTimers()` for date- or time-dependent calculations.
- **Isolation**: Every test must run in complete independence. Do not allow state leakage between tests.
- **Console Silence**: Prevent test runner output clutter. Mock `console.error` and `console.warn` if logging output is expected under test conditions.

---

## Section 5: What to Test First
When implementing tests, follow this priority queue:
1. `src/lib/storage.ts` — Check every CRUD execution flow and verify keys handling.
2. `src/lib/templateEngine.ts` — Test token substitution cases (empty tokens, unknown variables, special characters).
3. `src/lib/utils.ts` — Test currency formats, relative dates, and string truncate methods.
4. `src/lib/importers.ts` — Test parsing on empty, well-formed, and malformed CSV rows.
5. `src/lib/email.ts` — Verify campaign delivery simulation stats distributions.

---

## Section 6: Test Naming Syntax
- **Test File names**: Must match `<sourceFile>.test.ts` or `<sourceFile>.test.tsx` (e.g. `storage.test.ts`).
- **Describe Block**: The literal name of the function, component, or class under test.
- **It Block**: Written in active voice with clear pre-conditions:
  - Format: `it('should <expected behavior> when <condition>')` (e.g. `it('should return default currency when formatting invalid numbers')`).

---

## Section 7: Coverage Posture
- **CI Enforcement**: No strict coverage percentage thresholds are configured in CI for Phase 0. Gates will be activated in Phase 1.
- **Focus**: Prioritize behavior coverage over line coverage. Aim to test real-world scenarios rather than simply hitting branch statements.

---

## Section 8: Running Tests
The following command scripts are planned for execution once the test runner is configured:
- `npm test` — Executes single run test pipelines.
- `npm run test:watch` — Launches watch mode for interactive test-driven development.
- `npm run test:ui` — Opens the Vitest UI HTML browser dashboard.
- `npm run test:e2e` — Initiates Playwright end-to-end browser assertions (in later phases).

---

## Section 9: When NOT to Test
- **Framework APIs**: Do not write tests for standard Next.js page routers, root layout structures, or React core engines.
- **Dependencies**: Do not test third-party dependencies or mock imported library logic.
- **Static Types**: Do not write assertions for static type definitions. TypeScript already guarantees structure checking at build time.

---

## Section 10: localStorage Mock Contract
Because our current local-first persistence depends heavily on browser-level storage, Vitest suites must use a unified, strict `localStorage` mock.

- **Interface Requirements**: The mock contract must implement standard Storage methods: `getItem`, `setItem`, `removeItem`, `clear`, `key`, and the `length` attribute.
- **Serialization Mirror**: Values passed to the mock must be automatically cast/serialized into strings to accurately replicate actual browser storage behaviors.
- **Quota Controls**: The mock must throw a `DOMException` with the name `QuotaExceededError` whenever a set operation exceeds a configurable data limit (default size limit is set to 5MB) to protect against tests passing locally on payload sizes that would crash in production.
- **Configuration Scope**: The mock must reside strictly in `vitest.setup.ts` as a global environment stub. Never create custom local storage mocks inside individual test files.
- **Suite Clean Slate**: Tests requiring a clean database must trigger `localStorage.clear()` within a `beforeEach` block.
