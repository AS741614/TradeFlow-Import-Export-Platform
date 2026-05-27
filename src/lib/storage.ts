// ============================================================
// TradeFlow — API-Backed Storage Client
// ============================================================

import { apiFetch, StorageError } from './api-client';

/**
 * Maps generic storage keys to REST API paths.
 */
function getEndpoint(key: string): string {
  switch (key) {
    case 'products':
      return '/api/products';
    case 'shipments':
      return '/api/shipments';
    case 'invoices':
      return '/api/invoices';
    case 'contacts':
      return '/api/contacts';
    case 'compliance':
      return '/api/compliance';
    case 'tasks':
      return '/api/tasks';
    case 'business_plan':
      return '/api/business-plan';
    case 'swot_items':
      return '/api/swot';
    case 'projections':
      return '/api/financial-projections';
    case 'cost_items':
      return '/api/cost-items';
    case 'outreach_contacts':
      return '/api/outreach-contacts';
    case 'email_templates':
      return '/api/email-templates';
    case 'campaigns':
      return '/api/campaigns';
    default:
      return `/api/${key}`;
  }
}

/**
 * Get items from API.
 * Returns Promise of typed array.
 */
export async function getItems<T>(key: string): Promise<T[]> {
  const endpoint = getEndpoint(key);
  try {
    return await apiFetch<T[]>('GET', endpoint);
  } catch (error) {
    console.error(`Failed to fetch items for key ${key}:`, error);
    return [];
  }
}

/**
 * Get a single item by id from a collection.
 */
export async function getItemById<T extends { id: string }>(key: string, id: string): Promise<T | undefined> {
  const endpoint = `${getEndpoint(key)}/${id}`;
  try {
    return await apiFetch<T>('GET', endpoint);
  } catch (error) {
    if (error instanceof StorageError && error.statusCode === 404) {
      return undefined;
    }
    console.error(`Failed to fetch item by ID ${id} for key ${key}:`, error);
    return undefined;
  }
}

/**
 * Save entire collection.
 * Deprecated/Not supported in Prompt 9a. Returns rejected Promise.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function setItems<T extends { id: string }>(key: string, items: T[]): Promise<void> {
  void key;
  void items;
  return Promise.reject(
    new StorageError(
      'setItems bulk replace is not supported via API. ' +
      'Use individual addItem/updateItem/removeItem calls, or add ' +
      'a transactional bulk endpoint in a future prompt.',
      501
    )
  );
}

/**
 * Add a new item to a collection.
 */
export async function addItem<T extends { id: string }>(key: string, item: T): Promise<T[]> {
  const endpoint = getEndpoint(key);
  try {
    await apiFetch<T>('POST', endpoint, item);
  } catch (error) {
    console.error(`Failed to add item to key ${key}:`, error);
  }
  return getItems<T>(key);
}

/**
 * Update an existing item in a collection by id.
 */
export async function updateItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<T[]> {
  const endpoint = `${getEndpoint(key)}/${id}`;
  try {
    await apiFetch<T>('PATCH', endpoint, updates);
  } catch (error) {
    console.error(`Failed to update item ${id} for key ${key}:`, error);
  }
  return getItems<T>(key);
}

/**
 * Remove an item from a collection by id.
 */
export async function removeItem<T extends { id: string }>(key: string, id: string): Promise<T[]> {
  const endpoint = `${getEndpoint(key)}/${id}`;
  try {
    await apiFetch<T>('DELETE', endpoint);
  } catch (error) {
    console.error(`Failed to delete item ${id} for key ${key}:`, error);
  }
  return getItems<T>(key);
}

/**
 * Get a single value (non-array).
 */
export async function getValue<T>(key: string, defaultValue: T): Promise<T> {
  const endpoint = `/api/app-metadata/${key}`;
  try {
    const data = await apiFetch<{ key: string; value: string } | null>('GET', endpoint);
    if (!data?.value) {
      return defaultValue;
    }
    return JSON.parse(data.value) as T;
  } catch (error) {
    console.error(`Failed to get value for key ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a single value (non-array).
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function setValue<T>(key: string, value: T): Promise<void> {
  const endpoint = `/api/app-metadata/${key}`;
  await apiFetch<{ key: string; value: string }>('PUT' as 'POST', endpoint, {
    value: JSON.stringify(value),
  });
}

