// ============================================================
// TradeFlow — localStorage CRUD wrapper
// ============================================================

const STORAGE_PREFIX = 'tradeflow_';

/**
 * Get items from localStorage by key.
 * Returns typed array or empty array if not found.
 */
export function getItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    console.error(`Failed to parse localStorage key: ${key}`);
    return [];
  }
}

/**
 * Get a single item by id from a collection.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getItemById<T extends { id: string }>(key: string, id: string): T | undefined {
  const items = getItems<T>(key);
  return items.find(item => item.id === id);
}

/**
 * Save entire collection to localStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setItems<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(items));
  } catch (e) {
    console.error(`Failed to save to localStorage key: ${key}`, e);
  }
}

/**
 * Add a new item to a collection.
 */
export function addItem<T extends { id: string }>(key: string, item: T): T[] {
  const items = getItems<T>(key);
  items.push(item);
  setItems(key, items);
  return items;
}

/**
 * Update an existing item in a collection by id.
 */
export function updateItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T[] {
  const items = getItems<T>(key);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    const existing = items[index];
    if (existing) {
      items[index] = Object.assign({}, existing, updates);
      setItems(key, items);
    }
  }
  return items;
}

/**
 * Remove an item from a collection by id.
 */
export function removeItem<T extends { id: string }>(key: string, id: string): T[] {
  const items = getItems<T>(key).filter(item => item.id !== id);
  setItems(key, items);
  return items;
}

/**
 * Get a single value (non-array) from localStorage.
 */
export function getValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a single value (non-array) in localStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save value to localStorage key: ${key}`, e);
  }
}

// Storage keys as constants to prevent typos
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
