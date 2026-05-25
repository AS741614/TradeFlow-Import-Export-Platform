# Implementation Plan - Vitest Setup & Foundation Test Suites

This plan defines the configuration of Vitest, React Testing Library, and jsdom for the TradeFlow Import/Export platform, along with the implementation details for the first three target test suites: `storage.ts`, `templateEngine.ts`, and `utils.ts`.

## User Review Required

No breaking changes or config drift are planned. All dependencies will be installed as `devDependencies` and all test suites will be added strictly under the allowed test paths.

## Verbatim LocalStorage Mock Contract (TESTING.md Section 10)

From `TESTING.md` Section 10:
> - **Interface Requirements**: The mock contract must implement standard Storage methods: `getItem`, `setItem`, `removeItem`, `clear`, `key`, and the `length` attribute.
> - **Serialization Mirror**: Values passed to the mock must be automatically cast/serialized into strings to accurately replicate actual browser storage behaviors.
> - **Quota Controls**: The mock must throw a `DOMException` with the name `QuotaExceededError` whenever a set operation exceeds a configurable data limit (default size limit is set to 5MB) to protect against tests passing locally on payload sizes that would crash in production.
> - **Configuration Scope**: The mock must reside strictly in `vitest.setup.ts` as a global environment stub. Never create custom local storage mocks inside individual test files.
> - **Suite Clean Slate**: Tests requiring a clean database must trigger `localStorage.clear()` within a `beforeEach` block.

---

## Proposed Changes

### Configuration Files

#### [NEW] [vitest.config.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/vitest.config.ts)
Vite-based test runner configuration specifying global options, path aliases, test environment, and project-wide coverage.

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
    },
  },
});
```

#### [NEW] [vitest.setup.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/vitest.setup.ts)
Standard setup script executing before each test run, containing global mocks (specifically the strict `localStorage` mock measuring in UTF-16 bytes) and DOM extensions.

```typescript
import '@testing-library/jest-dom';

// ============================================================
// LocalStorage Mock conforming to TESTING.md Section 10
// ============================================================
class LocalStorageMock implements Storage {
  private store: Map<string, string>;
  private maxBytes: number;

  constructor(maxBytes = 5 * 1024 * 1024) { // Default 5MB
    this.store = new Map<string, string>();
    this.maxBytes = maxBytes;
  }

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    const value = this.store.get(key);
    return value !== undefined ? value : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    const key = keys[index];
    return key !== undefined ? key : null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: unknown): void {
    const stringValue = String(value);
    
    const byteLength = (str: string): number => {
      return new TextEncoder().encode(str).length;
    };
    
    // Calculate potential new store size in UTF-16 bytes
    let currentSize = 0;
    for (const [k, v] of this.store.entries()) {
      if (k !== key) {
        currentSize += byteLength(k) + byteLength(v);
      }
    }
    
    const newSize = currentSize + byteLength(key) + byteLength(stringValue);
    
    if (newSize > this.maxBytes) {
      throw new DOMException(
        `Failed to execute 'setItem' on 'Storage': Setting the value of '${key}' exceeded the quota.`,
        'QuotaExceededError'
      );
    }
    
    this.store.set(key, stringValue);
  }
}

const mockLocalStorage = new LocalStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
```

#### [MODIFY] [package.json](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/package.json)
Adding pinned testing dependencies and execution scripts.

**Dependencies to add (devDependencies):**
- `vitest`: `3.0.7`
- `@vitest/coverage-v8`: `3.0.7`
- `@testing-library/react`: `16.3.2`
- `@testing-library/jest-dom`: `6.9.1`
- `jsdom`: `26.0.0`

**Scripts to add:**
- `"test"`: `"vitest run"`
- `"test:watch"`: `"vitest"`
- `"test:ui"`: `"vitest --ui"`
- `"test:coverage"`: `"vitest run --coverage"`

#### [MODIFY] [.gitignore](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.gitignore)
Double check and confirm `/coverage` is ignored (already ignored as of research).

---

### Source Code Test Suites

#### [NEW] [storage.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/storage.test.ts)

Tests CRUD interactions and data mapping within the storage layer.

- **Functions to Test:**
  - `getItems`
  - `getItemById`
  - `setItems`
  - `addItem`
  - `updateItem`
  - `removeItem`
  - `getValue`
  - `setValue`
- **Test Cases:**
  - `describe('getItems')`
    - `it('should return empty array when key does not exist')`
    - `it('should return parsed array when items exist')`
    - `it('should handle malformed JSON gracefully and return empty array')`
  - `describe('getItemById')`
    - `it('should return the item when matching id is found')`
    - `it('should return undefined when no matching id exists')`
    - `it('should return undefined when key does not exist')`
  - `describe('setItems')`
    - `it('should serialize and save items array to localStorage')`
    - `it('should overwrite existing collection values')`
    - `it('should handle quota errors gracefully and log console error')`
  - `describe('addItem')`
    - `it('should append item to existing collection')`
    - `it('should initialize and append item when collection is empty')`
  - `describe('updateItem')`
    - `it('should modify matched item attributes and preserve others')`
    - `it('should return unmodified collection when id is not found')`
  - `describe('removeItem')`
    - `it('should remove target item from collection by id')`
    - `it('should return unmodified collection when id is not found')`
  - `describe('getValue')`
    - `it('should return parsed value when key exists')`
    - `it('should return default value when key is missing')`
    - `it('should return default value when JSON is malformed')`
  - `describe('setValue')`
    - `it('should serialize and save values to localStorage')`
    - `it('should handle quota errors gracefully and log console error')`
  - `describe('STORAGE_KEYS')`
    - `it('should export correct mapping of domain keys')`
  - `describe('localStorage Mock behavior')`
    - `it('should throw QuotaExceededError when size threshold exceeded')`
    - `it('should serialize non-string values using coerced String representation')`
    - `it('should measure quota in UTF-16 bytes not characters when content is non-ASCII')`
- **Mocks & Fakes:**
  - Mock `console.error` to avoid terminal pollution on expected failure cases (JSON parse failures and quota failures).

#### [NEW] [templateEngine.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/templateEngine.test.ts)

Tests Email Outreach template parsing and substitution variables.

- **Functions to Test:**
  - `extractVariables`
  - `renderTemplate`
- **Test Cases:**
  - `describe('extractVariables')`
    - `it('should extract variables in standard curly braces format')`
    - `it('should filter duplicates and return unique variables')`
    - `it('should return empty array when no variables are present')`
    - `it('should not extract variables containing spaces due to regex design')`
  - `describe('renderTemplate')`
    - `it('should replace core contact properties with matching fields')`
    - `it('should fall back to defaults when contact fields are missing')`
    - `it('should replace custom parameters using customVars override')`
    - `it('should handle placeholders ignoring inner spacing')`
    - `it('should perform case-insensitive placeholder replacements')`
    - `it('should strip unmatched placeholders from the output string')`
- **Mocks & Fakes:**
  - None required (pure functions).

#### [NEW] [utils.test.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/__tests__/utils.test.ts)

Tests date/currency formatting, text truncation, percentage maths, and utility helpers.

- **Functions to Test:**
  - `generateId`
  - `formatCurrency`
  - `formatDate`
  - `formatDateTime`
  - `getRelativeTime`
  - `nowISO`
  - `truncate`
  - `isValidEmail`
  - `formatNumber`
  - `calcPercentage`
  - `debounce`
  - `titleCase`
  - `getStatusColor`
  - `clamp`
- **Test Cases:**
  - `describe('generateId')`
    - `it('should return a string')`
    - `it('should output a valid UUID format')`
    - `it('should generate unique values on consecutive calls')`
  - `describe('formatCurrency')`
    - `it('should format numeric inputs with standard decimal limits')`
    - `it('should handle alternative currencies like EUR and GBP')`
    - `it('should handle negative and zero values')`
  - `describe('formatDate')`
    - `it('should format ISO string to standard date representation')`
    - `it('should return raw input string when input is invalid')`
  - `describe('formatDateTime')`
    - `it('should format ISO string to date with time')`
    - `it('should return raw input string when input is invalid')`
  - `describe('getRelativeTime')`
    - `it('should return relative time strings for minutes, hours, days, and weeks')`
    - `it('should format absolute dates for intervals older than 30 days')`
    - `it('should return Just now for future dates due to negative differences')`
  - `describe('nowISO')`
    - `it('should produce a string matching the ISO 8601 datetime format')`
    - `it('should round-trip through new Date() without losing precision')`
    - `it('should reflect the mocked system time when timers are faked')`
  - `describe('truncate')`
    - `it('should return unchanged string if length within max bound')`
    - `it('should trim string and append ellipsis when exceeding bounds')`
    - `it('should return empty string on empty input')`
  - `describe('isValidEmail')`
    - `it('should validate standard compliant email addresses')`
    - `it('should reject email formats missing symbols or domains')`
  - `describe('formatNumber')`
    - `it('should format large numbers with standard thousands separators')`
  - `describe('calcPercentage')`
    - `it('should calculate integer percentages correctly')`
    - `it('should return 0 when total denominator is 0')`
  - `describe('debounce')`
    - `it('should delay target function execution and aggregate calls')`
  - `describe('titleCase')`
    - `it('should capitalize first letters of words in a string')`
  - `describe('getStatusColor')`
    - `it('should map domain status terms to correct styling classes')`
    - `it('should default to status-neutral when status is unknown')`
  - `describe('clamp')`
    - `it('should confine values inside defined boundaries')`
- **Mocks & Fakes:**
  - `vi.useFakeTimers()` and `vi.setSystemTime()` to mock the system date for `getRelativeTime`, `nowISO`, and `debounce` tests.

---

## Verification Plan

### Automated Tests
1. **Dependencies Verification**: Confirm installations complete cleanly without peer dependency conflicts.
2. **Smoke Test**: Run the localStorage mock verification test first.
3. **Execution**: Run `npm test` and `npm run test:coverage`.
4. **Gates**:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`

### Target Coverage Baseline (Estimates)
- `storage.ts`: 100% Statements / 100% Branches
- `templateEngine.ts`: 100% Statements / 100% Branches
- `utils.ts`: 100% Statements / 95%+ Branches (due to standard Intl fallbacks)

---

## Found Bugs and Architecture Observations

1. **`getRelativeTime` future dates limitation**:
   - The method computes `diffMs = now - then`. If the input date `dateStr` is in the future, `diffMs` is negative. This causes `diffMins` to be negative, triggering the first branch `if (diffMins < 1) return 'Just now'`. Thus, all future dates return `'Just now'`. We will document this behavior in the test suite without altering the source code.
2. **Variable extraction vs template rendering discrepancy**:
   - `extractVariables` matches strictly `[a-zA-Z0-9_]+` without whitespace or hyphens.
   - `renderTemplate` allows whitespace surrounding the variable keys (`\\{\\{\\s*${key}\\s*\\}\\}`) and handles hyphens in its stripping pattern (`/\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/g`).
   - Consequently, templates with keys like `{{ first_name }}` (with spaces) are processed correctly by `renderTemplate` but their keys are not extracted by `extractVariables`. This distinction will be covered by the test assertions.
