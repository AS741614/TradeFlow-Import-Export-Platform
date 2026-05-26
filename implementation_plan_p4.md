# Implementation Plan - Technical Debt Cleanup

This plan details the implementation steps to resolve two source-code bugs (`getRelativeTime` and `extractVariables` regex) and add unit test suites for two remaining libraries (`importers.ts` and `email.ts`), establishing 95%+ statement coverage across all 5 core utility files. It also details the migration of ESLint ignores to the config file.

## User Review Required

No breaking changes or external dependencies are introduced. The existing tests locking the buggy behaviors will be updated to assert the new correct behaviors.

---

## Proposed Changes

### Source Code Bug Fixes

#### [MODIFY] [src/lib/utils.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/utils.ts)
Fixes `getRelativeTime` returning `"Just now"` for future dates.

**Before:**
```typescript
export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays < 7) return `${String(diffDays)}d ago`;
  if (diffDays < 30) return `${String(Math.floor(diffDays / 7))}w ago`;
  return formatDate(dateStr);
}
```

**After:**
```typescript
export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const isFuture = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  
  const diffMins = Math.floor(absDiffMs / 60000);
  const diffHours = Math.floor(absDiffMs / 3600000);
  const diffDays = Math.floor(absDiffMs / 86400000);

  if (isFuture) {
    if (diffMins < 1) return 'in 1m';
    if (diffMins < 60) return `in ${String(diffMins)}m`;
    if (diffHours < 24) return `in ${String(diffHours)}h`;
    if (diffDays < 7) return `in ${String(diffDays)}d`;
    if (diffDays < 30) return `in ${String(Math.floor(diffDays / 7))}w`;
    return formatDate(dateStr);
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  if (diffDays < 7) return `${String(diffDays)}d ago`;
  if (diffDays < 30) return `${String(Math.floor(diffDays / 7))}w ago`;
  return formatDate(dateStr);
}
```

#### [MODIFY] [src/lib/templateEngine.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/templateEngine.ts)
Fixes `extractVariables` regex to support variables with spaces/hyphens.

**Before:**
```typescript
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
...
```

**After:**
```typescript
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
...
```

---

### Test Updates

#### [MODIFY] [src/lib/__tests__/utils.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/utils.test.ts)
Update relative time assertion for future dates.

**Before (Bug Lock):**
```typescript
  it('should return Just now for future dates due to negative differences', () => {
    // This is the known bug / architectural limitation:
    // Future date tomorrow (relative to mock system time May 25, 2026)
    expect(getRelativeTime('2026-05-26T12:00:00Z')).toBe('Just now');
  });
```

**After (Correct Behavior):**
```typescript
  it('should return forward-looking relative strings for future dates', () => {
    // Future date tomorrow (relative to mock system time May 25, 2026)
    expect(getRelativeTime('2026-05-26T12:00:00Z')).toBe('in 1d');
    // Future date in 10 minutes
    expect(getRelativeTime('2026-05-25T12:10:00Z')).toBe('in 10m');
    // Future date in 5 hours
    expect(getRelativeTime('2026-05-25T17:00:00Z')).toBe('in 5h');
    // Future date in 2 weeks
    expect(getRelativeTime('2026-06-08T12:00:00Z')).toBe('in 2w');
  });
```

#### [MODIFY] [src/lib/__tests__/templateEngine.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/templateEngine.test.ts)
Update variable extraction assertion to support spaces.

**Before (Bug Lock):**
```typescript
  it('should not extract variables containing spaces due to regex design', () => {
    // Variable extraction regex is /\{\{([a-zA-Z0-9_]+)\}\}/g which does not support spaces inside braces
    const text = 'Hello {{ first_name }}, how are you?';
    const vars = extractVariables(text);
    expect(vars).toEqual([]);
  });
```

**After (Correct Behavior):**
```typescript
  it('should extract variables containing internal whitespace and hyphens', () => {
    const text = 'Hello {{ first_name }}, how is {{  company   }} and {{ custom-field }}?';
    const vars = extractVariables(text);
    expect(vars).toEqual(['first_name', 'company', 'custom-field']);
  });
```

---

### New Test Suites

#### [NEW] [importers.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/importers.test.ts)
Unit test suite targeting all parsing and mapping functionalities in `importers.ts`.

* **Functions to Test:**
  * `parseCSV`
  * `mapParsedDataToContacts`
  * `parseJSONContacts`
* **Test Cases Checklist:**
  * `describe('parseCSV')`
    - `should parse standard comma-separated values correctly`
    - `should handle escaped quotes containing commas without splitting`
    - `should ignore trailing empty lines`
    - `should handle both Windows and Unix style line endings uniformly`
  * `describe('mapParsedDataToContacts')`
    - `should map valid row arrays to contact objects based on mapping keys`
    - `should skip row records that do not contain valid email addresses`
    - `should parse semicolon-separated tag strings`
    - `should assign default tags list when tags columns are absent`
    - `should assign defaults for optional columns company and country`
    - `should convert contact emails to lowercase`
  * `describe('parseJSONContacts')`
    - `should parse valid contact object arrays from JSON text`
    - `should parse single contact objects wrapped as non-array`
    - `should resolve alternative key cases (firstName, FirstName, first_name)`
    - `should filter out records missing valid email properties`
    - `should handle parsed array/comma-separated tags lists`
    - `should catch parsing exceptions and return empty array gracefully`
* **Mocks & Fakes:**
  * Mock `console.error` to avoid CLI output clutter on expected JSON parsing exceptions.

#### [NEW] [email.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/email.test.ts)
Unit test suite targeting the campaign simulation lifecycle.

* **Functions to Test:**
  * `runCampaignSimulation`
* **Test Cases Checklist:**
  * `describe('runCampaignSimulation')`
    - `should do nothing when campaign ID is not present in storage`
    - `should do nothing when template ID is not present in storage`
    - `should transition status to completed immediately when contactIds is empty`
    - `should update campaign status to sending and then completed using timers`
    - `should aggregate campaign performance statistics correctly`
    - `should update contacts campaign history and contacted timestamps in storage`
    - `should distribute email outcomes deterministically when Math.random is mocked`
    - `should skip individual contacts that do not exist in storage when other contacts in contactIds do exist`
    - `should compute deliverable count as total minus bounced`
    - `should compute clicked count as subset of opened`
    - `should compute replied count as subset of clicked`
    - `should be idempotent`
    - `should handle templates containing tokens inside subject lines`
    - `should preserve existing campaign metadata fields (name, scheduledAt) when transitioning status`
* **Mocks & Fakes:**
  * `vi.useFakeTimers()` to verify state changes across the 1500ms simulation timeout.
  * Mock `Math.random` to test all possible contact history updates (`'bounced'`, `'replied'`, `'clicked'`, `'opened'`, `'delivered'`).

---

### Configurations & Pipeline Adjustments

#### [MODIFY] [vitest.config.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/vitest.config.ts)
Lock thresholds for `importers.ts` and `email.ts` at the actual achieved levels (targeting 95%+).

```typescript
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
        'src/lib/importers.ts': {
          statements: 100, // To be updated to actual measured % during execution
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/lib/email.ts': {
          statements: 100, // To be updated to actual measured % during execution
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
```

#### [MODIFY] [eslint.config.mjs](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/eslint.config.mjs)
Move coverage folder ignore pattern directly to flat config ignores block.

```diff
     ignores: [
       ".next/**",
       "node_modules/**",
       "public/**",
       "next-env.d.ts",
-      "eslint.config.mjs"
+      "eslint.config.mjs",
+      "coverage/**"
     ]
```

#### [MODIFY] [package.json](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/package.json)
Revert the lint scripts to remove the `--ignore-pattern` flag wrapper.

```diff
-    "lint": "eslint . --ignore-pattern \"coverage/**\"",
-    "lint:fix": "eslint . --fix --ignore-pattern \"coverage/**\"",
+    "lint": "eslint .",
+    "lint:fix": "eslint . --fix",
```

---

## Verification Plan

### Automated Checks
1. Compile Validation: `npx tsc --noEmit`
2. Configuration ignore double-check:
   - `npm run lint`
   - `npx eslint .` (without script wrapper, verifying ignores are parsed from configuration)
3. Tests run: `npm run test:coverage` (asserting all 5 files satisfy new baseline coverage thresholds).
4. Build: `npm run build`
