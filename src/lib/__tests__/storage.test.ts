import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getItems,
  getItemById,
  setItems,
  addItem,
  updateItem,
  removeItem,
  getValue,
  setValue,
} from '../storage';
import { StorageError } from '../api-client';

interface TestItem {
  id: string;
  name: string;
}

describe('storage.ts REST API Integration Tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('getItems', () => {
    it('should perform GET request to correct endpoint and return items list', async () => {
      const data: TestItem[] = [{ id: '1', name: 'Product A' }];
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data }),
      } as unknown as Response);

      const result = await getItems<TestItem>('products');

      expect(fetch).toHaveBeenCalledWith('/api/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(data);
    });

    it('should log console error and return empty list on API failures', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database crash' }),
      } as unknown as Response);

      const result = await getItems<TestItem>('products');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getItemById', () => {
    it('should fetch single item by ID', async () => {
      const item: TestItem = { id: '1', name: 'Product A' };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: item }),
      } as unknown as Response);

      const result = await getItemById<TestItem>('products', '1');

      expect(fetch).toHaveBeenCalledWith('/api/products/1', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(item);
    });

    it('should return undefined and not throw on 404', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Product not found' }),
      } as unknown as Response);

      const result = await getItemById<TestItem>('products', '999');

      expect(result).toBeUndefined();
    });
  });

  describe('setItems', () => {
    it('should throw a 501 NotImplemented StorageError', async () => {
      const items: TestItem[] = [{ id: '1', name: 'Product A' }];
      await expect(setItems('products', items)).rejects.toThrowError(
        new StorageError(
          'setItems bulk replace is not supported via API. ' +
          'Use individual addItem/updateItem/removeItem calls, or add ' +
          'a transactional bulk endpoint in a future prompt.',
          501
        )
      );
    });
  });

  describe('addItem', () => {
    it('should call POST to append item, and then fetch updated collection list', async () => {
      const newItem: TestItem = { id: '2', name: 'Product B' };
      const updatedList: TestItem[] = [
        { id: '1', name: 'Product A' },
        { id: '2', name: 'Product B' },
      ];

      // First fetch call is POST /api/products
      // Second fetch call is GET /api/products
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: newItem }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: updatedList }),
        } as unknown as Response);

      const result = await addItem<TestItem>('products', newItem);

      expect(fetch).toHaveBeenNthCalledWith(1, '/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(updatedList);
    });
  });

  describe('updateItem', () => {
    it('should call PATCH to edit item, and then fetch updated collection list', async () => {
      const updates: Partial<TestItem> = { name: 'Product A Updated' };
      const updatedList: TestItem[] = [{ id: '1', name: 'Product A Updated' }];

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { id: '1', ...updates } }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: updatedList }),
        } as unknown as Response);

      const result = await updateItem<TestItem>('products', '1', updates);

      expect(fetch).toHaveBeenNthCalledWith(1, '/api/products/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(updatedList);
    });
  });

  describe('removeItem', () => {
    it('should call DELETE to remove item, and then fetch updated collection list', async () => {
      const updatedList: TestItem[] = [];

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { id: '1', name: 'Product A' } }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: updatedList }),
        } as unknown as Response);

      const result = await removeItem<TestItem>('products', '1');

      expect(fetch).toHaveBeenNthCalledWith(1, '/api/products/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(updatedList);
    });
  });

  describe('getValue', () => {
    it('should call GET /api/app-metadata/[key] and return parsed JSON value if found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { key: 'bp_last_saved', value: JSON.stringify('2026-05-27T10:00:00Z') } }),
      } as unknown as Response);

      const result = await getValue('bp_last_saved', 'default-value');
      expect(fetch).toHaveBeenCalledWith('/api/app-metadata/bp_last_saved', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toBe('2026-05-27T10:00:00Z');
    });

    it('should return defaultValue if GET returns null (not found)', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: null }),
      } as unknown as Response);

      const result = await getValue('bp_last_saved', 'default-value');
      expect(result).toBe('default-value');
    });

    it('should return defaultValue if fetch throws or parses invalid JSON', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { key: 'bp_last_saved', value: '{invalid json' } }),
      } as unknown as Response);

      const result = await getValue('bp_last_saved', 'default-value');
      expect(result).toBe('default-value');
    });
  });

  describe('setValue', () => {
    it('should call PUT /api/app-metadata/[key] with stringified value', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { key: 'bp_last_saved', value: JSON.stringify('2026-05-27T10:00:00Z') } }),
      } as unknown as Response);

      await setValue('bp_last_saved', '2026-05-27T10:00:00Z');
      expect(fetch).toHaveBeenCalledWith('/api/app-metadata/bp_last_saved', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify('2026-05-27T10:00:00Z') }),
      });
    });
  });

});
