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
