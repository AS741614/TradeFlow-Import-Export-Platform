// ============================================================
// TradeFlow — API Client & Storage Error Handler
// ============================================================

export class StorageError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'StorageError';
    this.statusCode = statusCode;
    // Set the prototype explicitly for extending built-in Error in ES5/ES6 environments
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Resolves the base URL depending on execution environment.
 * In server-side environments, absolute URLs are required, using NEXT_PUBLIC_BASE_URL.
 * In client-side environments, relative URLs are used.
 */
function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  }
  return '';
}

/**
 * A thin fetch wrapper for interacting with the TradeFlow REST API.
 */
export async function apiFetch<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let errorMessage = `API request failed with status ${String(res.status)}`;
      try {
        const errorData = (await res.json()) as { error?: string };
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
      } catch {
        // Fallback to default message if response body is not JSON
      }
      throw new StorageError(errorMessage, res.status);
    }

    const payload = (await res.json()) as { data: T };
    return payload.data;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new StorageError(message, 500);
  }
}
