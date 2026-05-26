import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, StorageError } from '../api-client';

describe('StorageError', () => {
  it('should instantiate correctly with a message and status code', () => {
    const error = new StorageError('Test Error', 400);
    expect(error).toBeInstanceOf(StorageError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test Error');
    expect(error.statusCode).toBe(400);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('should make a successful GET request', async () => {
    const responseData = { id: '1', name: 'John Doe' };
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: responseData }),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await apiFetch('GET', '/api/contacts');

    expect(fetch).toHaveBeenCalledWith('/api/contacts', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(responseData);
  });

  it('should make a successful POST request with body', async () => {
    const requestBody = { name: 'New Contact' };
    const responseData = { id: '2', name: 'New Contact' };
    const mockResponse = {
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: responseData }),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await apiFetch('POST', '/api/contacts', requestBody);

    expect(fetch).toHaveBeenCalledWith('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    expect(result).toEqual(responseData);
  });

  it('should propagate StorageError when API returns a non-ok status with JSON error message', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid name provided' }),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await expect(apiFetch('GET', '/api/contacts')).rejects.toThrowError(
      new StorageError('Invalid name provided', 400)
    );
  });

  it('should throw StorageError with generic message if response error JSON parsing fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Not JSON')),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await expect(apiFetch('GET', '/api/contacts')).rejects.toThrowError(
      new StorageError('API request failed with status 500', 500)
    );
  });

  it('should throw StorageError with 500 status on network failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Connection timed out'));

    await expect(apiFetch('GET', '/api/contacts')).rejects.toThrowError(
      new StorageError('Connection timed out', 500)
    );
  });

  it('should prepend NEXT_PUBLIC_BASE_URL when window is undefined (SSR mode)', async () => {
    const originalWindow = globalThis.window;
    // Force window to be undefined
    delete (globalThis as Record<string, unknown>).window;

    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://api.production.com');

    const responseData = { success: true };
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: responseData }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await apiFetch('GET', '/api/contacts');

    expect(fetch).toHaveBeenCalledWith('http://api.production.com/api/contacts', expect.any(Object));
    expect(result).toEqual(responseData);

    // Restore window
    globalThis.window = originalWindow;
  });
});
