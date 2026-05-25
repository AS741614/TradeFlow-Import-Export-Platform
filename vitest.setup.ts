import '@testing-library/jest-dom';

// ============================================================
// LocalStorage Mock conforming to TESTING.md Section 10 + UTF-16 bytes check
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
    return value ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    const key = keys[index];
    return key ?? null;
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
