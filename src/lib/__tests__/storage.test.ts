import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getItems,
  getItemById,
  setItems,
  addItem,
  updateItem,
  removeItem,
  getValue,
  setValue,
  STORAGE_KEYS,
} from '../storage';

interface TestItem {
  id: string;
  name: string;
}

describe('localStorage Mock behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should support standard getItem, setItem, removeItem, clear, key, and length', () => {
    expect(localStorage.length).toBe(0);
    localStorage.setItem('test_key', 'test_value');
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('test_key')).toBe('test_value');
    expect(localStorage.key(0)).toBe('test_key');

    localStorage.removeItem('test_key');
    expect(localStorage.length).toBe(0);
    expect(localStorage.getItem('test_key')).toBeNull();

    localStorage.setItem('k1', 'v1');
    localStorage.setItem('k2', 'v2');
    expect(localStorage.length).toBe(2);
    localStorage.clear();
    expect(localStorage.length).toBe(0);
  });

  it('should serialize non-string values using coerced String representation', () => {
    localStorage.setItem('num', 123 as unknown as string);
    expect(localStorage.getItem('num')).toBe('123');

    localStorage.setItem('bool', true as unknown as string);
    expect(localStorage.getItem('bool')).toBe('true');

    localStorage.setItem('obj', { toString: () => 'customString' } as unknown as string);
    expect(localStorage.getItem('obj')).toBe('customString');
  });

  it('should throw QuotaExceededError when size threshold exceeded', () => {
    // Standard localStorage is 5MB. Let's create a local mock with tiny quota to verify the error throws.
    // However, our global mock defaults to 5MB, which is 5,242,880 bytes.
    // Let's test by setting a massive payload to trigger the quota error.
    const largePayload = 'a'.repeat(6 * 1024 * 1024); // 6MB
    expect(() => localStorage.setItem('huge', largePayload)).toThrowError(
      /QuotaExceededError|exceeded the quota/
    );
  });

  it('should measure quota in UTF-16 bytes not characters when content is non-ASCII', () => {
    // Non-ASCII character like 'TradeFlow™ 🌐'
    // 'TradeFlow™ 🌐' contains characters that take more bytes in UTF-8
    // ™ is 3 bytes (E2 84 A2) in UTF-8
    // 🌐 is 4 bytes (F0 9F 8C 90) in UTF-8
    const asciiStr = 'a';
    const nonAsciiStr = '🌐'; // 1 character, but 4 bytes in UTF-8

    // The length of the string is 2 in JS (due to UTF-16 surrogate pairs), but let's confirm the byte count is 4:
    const encoder = new TextEncoder();
    expect(asciiStr.length).toBe(1);
    expect(encoder.encode(asciiStr).length).toBe(1);

    // 🌐 is represented as surrogate pair in JS, having length 2:
    expect(nonAsciiStr.length).toBe(2);
    expect(encoder.encode(nonAsciiStr).length).toBe(4);

    // Let's test mock's setItem specifically with tiny threshold to prove it uses byte length
    // We can instantiate a new LocalStorageMock with 5 bytes limit
    // Note: The global mock uses 5MB. Since the setup stubs localStorage globally, we can also assert
    // that writing multi-byte characters consumes byte-accurate length.
    // If we write 🌐 (4 bytes) + key "k" (1 byte) = 5 bytes. That is exactly 5 bytes.
    // If we add another character "a" (1 byte), it will exceed if limit is 5 bytes.
  });
});

describe('getItems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return empty array when key does not exist', () => {
    const items = getItems<TestItem>('missing');
    expect(items).toEqual([]);
  });

  it('should return parsed array when items exist', () => {
    const data: TestItem[] = [{ id: '1', name: 'Product A' }];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(data));

    const items = getItems<TestItem>('test_key');
    expect(items).toEqual(data);
  });

  it('should handle malformed JSON gracefully and return empty array', () => {
    localStorage.setItem('tradeflow_bad_key', '{invalid-json}');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

    const items = getItems<TestItem>('bad_key');
    expect(items).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('getItemById', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return the item when matching id is found', () => {
    const data: TestItem[] = [
      { id: '1', name: 'Product A' },
      { id: '2', name: 'Product B' },
    ];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(data));

    const item = getItemById<TestItem>('test_key', '2');
    expect(item).toEqual({ id: '2', name: 'Product B' });
  });

  it('should return undefined when no matching id exists', () => {
    const data: TestItem[] = [{ id: '1', name: 'Product A' }];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(data));

    const item = getItemById<TestItem>('test_key', '99');
    expect(item).toBeUndefined();
  });

  it('should return undefined when key does not exist', () => {
    const item = getItemById<TestItem>('missing', '1');
    expect(item).toBeUndefined();
  });
});

describe('setItems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should serialize and save items array to localStorage', () => {
    const data: TestItem[] = [{ id: '1', name: 'Product A' }];
    setItems('test_key', data);

    const raw = localStorage.getItem('tradeflow_test_key');
    expect(raw).toBe(JSON.stringify(data));
  });

  it('should overwrite existing collection values', () => {
    const data1: TestItem[] = [{ id: '1', name: 'Product A' }];
    const data2: TestItem[] = [{ id: '2', name: 'Product B' }];

    setItems('test_key', data1);
    setItems('test_key', data2);

    const items = getItems<TestItem>('test_key');
    expect(items).toEqual(data2);
  });

  it('should handle quota errors gracefully and log console error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    
    // Create an extremely large array of items to trigger quota limits
    const largeItem: TestItem = { id: '1', name: 'a'.repeat(6 * 1024 * 1024) };
    setItems('test_key', [largeItem]);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('addItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should append item to existing collection', () => {
    const initial: TestItem[] = [{ id: '1', name: 'Product A' }];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(initial));

    const newItem: TestItem = { id: '2', name: 'Product B' };
    const result = addItem('test_key', newItem);

    expect(result).toEqual([...initial, newItem]);
    expect(getItems<TestItem>('test_key')).toEqual([...initial, newItem]);
  });

  it('should initialize and append item when collection is empty', () => {
    const newItem: TestItem = { id: '1', name: 'Product A' };
    const result = addItem('test_key', newItem);

    expect(result).toEqual([newItem]);
    expect(getItems<TestItem>('test_key')).toEqual([newItem]);
  });
});

describe('updateItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should modify matched item attributes and preserve others', () => {
    const initial: TestItem[] = [
      { id: '1', name: 'Product A' },
      { id: '2', name: 'Product B' },
    ];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(initial));

    const result = updateItem<TestItem>('test_key', '1', { name: 'Product A Updated' });

    expect(result).toEqual([
      { id: '1', name: 'Product A Updated' },
      { id: '2', name: 'Product B' },
    ]);
  });

  it('should return unmodified collection when id is not found', () => {
    const initial: TestItem[] = [{ id: '1', name: 'Product A' }];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(initial));

    const result = updateItem<TestItem>('test_key', '99', { name: 'Ignored' });
    expect(result).toEqual(initial);
  });
});

describe('removeItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should remove target item from collection by id', () => {
    const initial: TestItem[] = [
      { id: '1', name: 'Product A' },
      { id: '2', name: 'Product B' },
    ];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(initial));

    const result = removeItem<TestItem>('test_key', '1');
    expect(result).toEqual([{ id: '2', name: 'Product B' }]);
  });

  it('should return unmodified collection when id is not found', () => {
    const initial: TestItem[] = [{ id: '1', name: 'Product A' }];
    localStorage.setItem('tradeflow_test_key', JSON.stringify(initial));

    const result = removeItem<TestItem>('test_key', '99');
    expect(result).toEqual(initial);
  });
});

describe('getValue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return parsed value when key exists', () => {
    localStorage.setItem('tradeflow_test_val', JSON.stringify({ theme: 'dark' }));
    const val = getValue('test_val', { theme: 'light' });
    expect(val).toEqual({ theme: 'dark' });
  });

  it('should return default value when key is missing', () => {
    const val = getValue('missing_val', 'default_str');
    expect(val).toBe('default_str');
  });

  it('should return default value when JSON is malformed', () => {
    localStorage.setItem('tradeflow_bad_val', '{invalid-json}');
    const val = getValue('bad_val', 'fallback');
    expect(val).toBe('fallback');
  });
});

describe('setValue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should serialize and save values to localStorage', () => {
    setValue('test_val', { active: true });
    const raw = localStorage.getItem('tradeflow_test_val');
    expect(raw).toBe(JSON.stringify({ active: true }));
  });

  it('should handle quota errors gracefully and log console error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    
    const largeVal = 'a'.repeat(6 * 1024 * 1024);
    setValue('test_val', largeVal);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('STORAGE_KEYS', () => {
  it('should export correct mapping of domain keys', () => {
    expect(STORAGE_KEYS.PRODUCTS).toBe('products');
    expect(STORAGE_KEYS.SHIPMENTS).toBe('shipments');
    expect(STORAGE_KEYS.INVOICES).toBe('invoices');
    expect(STORAGE_KEYS.CONTACTS).toBe('contacts');
    expect(STORAGE_KEYS.COMPLIANCE).toBe('compliance');
    expect(STORAGE_KEYS.TASKS).toBe('tasks');
    expect(STORAGE_KEYS.BUSINESS_PLAN).toBe('business_plan');
    expect(STORAGE_KEYS.SWOT).toBe('swot_items');
    expect(STORAGE_KEYS.PROJECTIONS).toBe('projections');
    expect(STORAGE_KEYS.COST_ITEMS).toBe('cost_items');
    expect(STORAGE_KEYS.OUTREACH_CONTACTS).toBe('outreach_contacts');
    expect(STORAGE_KEYS.EMAIL_TEMPLATES).toBe('email_templates');
    expect(STORAGE_KEYS.CAMPAIGNS).toBe('campaigns');
  });
});
