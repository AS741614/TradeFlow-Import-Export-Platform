# Implementation Plan - GitHub Actions CI Setup

This plan details the steps to set up a robust GitHub Actions Continuous Integration (CI) workflow that automatically locks the TradeFlow verification gate, requiring type checks, lints, test coverage thresholds, and production builds to pass before merging code.

## User Review Required

No breaking changes or config drift are planned. All CI steps will run automatically in GitHub's environment on every push and pull request to the `main` branch.

---

## Proposed Changes

### Configuration Files

#### [NEW] [.nvmrc](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.nvmrc)
Contains the Node.js version mapped to the Next.js requirements.
Next.js 16.2.6 requires Node `>=20.9.0`. We will pin to `22` (Active LTS).

```
22
```

#### [MODIFY] [package.json](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/package.json)
Adding the `engines.node` specification to lock development and CI to the same major version.

```json
  "engines": {
    "node": ">=22.0.0"
  }
```

#### [MODIFY] [vitest.config.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/vitest.config.ts)
Adding the `thresholds` block mapping to the per-file baseline results from Prompt 2 (verified compatible with Vitest 3.0.7).

```typescript
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        'src/lib/types.ts',          // pure interface declarations
        'src/lib/constants.ts',      // data tables, not logic
        'src/app/**',                // pages — covered in a later phase
        'src/components/**',         // components — covered in a later phase
        'src/app/api/**',            // API routes — covered in a later phase
        '**/*.d.ts',
      ],
      thresholds: {
        perFile: true,
        'src/lib/storage.ts': {
          statements: 100,
          branches: 83,
          functions: 100,
          lines: 100,
        },
        'src/lib/templateEngine.ts': {
          statements: 100,
          branches: 90,
          functions: 100,
          lines: 100,
        },
        'src/lib/utils.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
```

---

### CI Workflow Files

#### [NEW] [.github/workflows/ci.yml](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.github/workflows/ci.yml)
Verification gate pipeline definition for GitHub Actions with scoped Next.js build cache and reordered installation step.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verification-gate:
    name: verification-gate
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('src/**/*.{js,jsx,ts,tsx}', 'next.config.ts') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
            ${{ runner.os }}-nextjs-

      - name: Type check (tsc --noEmit)
        run: npx tsc --noEmit
        if: success()

      - name: Lint (ESLint strict)
        run: npm run lint
        if: success()

      - name: Test with coverage (Vitest + v8 thresholds)
        run: npm run test:coverage
        if: success()

      - name: Build (Next.js production)
        run: npm run build
        if: success()
```

#### [NEW] [.github/workflows/README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.github/workflows/README.md)
Complete verbatim contents of the workflows documentation and GitHub manual branch protection walkthrough.

```markdown
# TradeFlow CI Workflows & Branch Protection Guide

This directory contains automated workflow pipelines and instructions for securing the `main` branch of the TradeFlow Import/Export platform.

---

## Section 1: What This Workflow Does

The TradeFlow CI workflow is a quality gate that enforces the compilation and validation checks required by `AGENTS.md` Section 6. It guarantees that any code pushed or proposed for merge to the `main` branch is stable and matches project standards.

### Verification Steps
1. **Type check (`tsc --noEmit`)**: Catches static type errors, type mismatch regressions, and strict-mode compilation errors.
2. **Lint (`eslint`)**: Enforces Next.js web vitals, strict TypeScript rules, and jsx-a11y accessibility standards while ignoring coverage folders.
3. **Test with coverage (`vitest`)**: Runs the full suite of unit and integration tests under jsdom, asserting strict per-file thresholds for `storage.ts`, `templateEngine.ts`, and `utils.ts`.
4. **Build (`next build`)**: Verifies the Next.js application compiles successfully, optimizes pages, and generates static pages.

### Trigger Schedule
- **Pushes**: Triggers automatically on any direct commit push to the `main` branch.
- **Pull Requests**: Triggers on the creation, synchronization, or reopening of pull requests targeting the `main` branch.

### Execution Metrics
* **Expected Runtime**: ~1 to 2 minutes on GitHub Actions virtual machines (aided by npm and Next.js compiler caching).
* **Hard Timeout**: 10 minutes.

---

## Section 2: Interpreting CI Failures

When a build fails, the job stops immediately. Use this table to diagnose failures:

| Failed Step | Meaning | Local Reproduction Command | Common Causes |
| :--- | :--- | :--- | :--- |
| **Type check** | Static type definitions or parameter constraints are violated. | `npx tsc --noEmit` | - Mismatched generic variables<br>- Missing property types in entities<br>- Unchecked undefined index accesses |
| **Lint** | Coding conventions or style constraints are violated. | `npm run lint` | - Unused imports or variables<br>- Missing key attributes in lists<br>- Missing ARIA descriptors on inputs |
| **Test with coverage** | Logic broke OR coverage dropped below strict thresholds. | `npm run test:coverage` | - Broken logic in storage/utils<br>- Non-deterministic date mock failures<br>- Statement/branch coverage drop |
| **Build** | Compilation error preventing Next.js production packaging. | `npm run build` | - Routing conflicts or missing file paths<br>- Build-time SSR hydration mismatches |

---

## Section 3: Branch Protection Setup (REQUIRED MANUAL STEPS)

To lock the main branch behind this CI check, execute the following steps in the GitHub UI (2025+ layout):

1. Navigate to your repository on **GitHub**.
2. Click on the **[Settings]** tab located in the top navigation bar.
3. In the left-hand sidebar under the **Code and automation** section, click on **[Rules]** -> **[Rulesets]**.
4. Click the green **[New ruleset]** button in the upper right, and select **[New branch ruleset]**.
5. Fill out the Ruleset settings:
   - **Ruleset Name**: `main-protection`
   - **Enforcement status**: Set to **Active**
6. Scroll down to the **Target branches** section:
   - Select **[Add target]** -> **[Include by pattern]**
   - In the pattern box, enter `main` and click **[Add]**.
7. In the **Branch rules** section, enable the following protections:
   - Check **[Require a pull request before merging]** (optional for single solo dev; recommended for team branches).
   - Check **[Require status checks to pass before merging]**.
8. Set up the Status Checks:
   - Click the **[Add status check]** button.
   - In the search field, search for and select **`verification-gate`**.
   - Check **[Require branches to be up to date before merging]** to force testing on top of latest changes.
9. Leave other optional restrictions (signed commits, linear history) disabled initially for solo-dev simplicity.
10. Click the green **[Create]** button at the bottom of the page to activate branch lock.

*Note: If you prefer the legacy classics mode, go to **[Settings]** -> **[Branches]** -> **[Add classic branch protection rule]** -> pattern `main` -> check **Require status checks to pass before merging** -> search and add `verification-gate`.*

---

## Section 4: Single-Owner Project Recommendations

Because TradeFlow is currently managed by a single owner, team-oriented protections (like required pull request reviews or Code Owners approvals) add unnecessary workflow friction.

We recommend **enabling the status check requirement (`verification-gate`)** to catch errors before merge, but **leaving required reviews disabled** to allow direct self-merging of verified pull requests. When new contributors join the team, review thresholds can be toggled on inside the ruleset settings.

---

## Section 5: Troubleshooting

### Status check `verification-gate` does not appear in the search box
The status check name will only populate in GitHub's list once the CI workflow has run at least once. Push a commit or create a dummy PR to trigger the first run, then search for `verification-gate` again in the ruleset setup.

### Frequent cache misses slowing down runs
Next.js caches build segments. If cache misses occur on every run, verify that `package-lock.json` hasn't changed. Some cache invalidation is expected if you make major updates to the Tailwind config (N/A for TradeFlow) or Next config file.

### Node version mismatch errors
If the setup step fails with Node version errors, verify that `.nvmrc` contains a valid major version integer (e.g. `22`) which `actions/setup-node@v4` can resolve.
```

---

## Verification Plan

### Local Verification Gate
1. Validate workflow YAML syntax: `npx js-yaml .github/workflows/ci.yml > /dev/null`.
2. Confirm coverage threshold verification: Run `npm run test:coverage` locally.
3. Run the complete Verification Gate:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm test`
   - `npm run build`

### Target Coverage Baseline (Estimates)
- `storage.ts`: 100% Statements / 83.33% Branches
- `templateEngine.ts`: 100% Statements / 90% Branches
- `utils.ts`: 100% Statements / 100% Branches
- `importers.ts` & `email.ts`: Not measured (0% roadmap targets)
