import { NextResponse } from 'next/server';

export interface SanitizedErrorResponse {
  message: string;
  status: number;
}

export function sanitizeDbError(error: unknown): SanitizedErrorResponse {
  // Log the full error message server-side for internal debugging
  console.error('[DB Error Audited]:', error);

  // Check 'Unauthorized' error first to preserve 401 status
  if (error instanceof Error && error.message === 'Unauthorized') {
    return {
      message: 'Unauthorized',
      status: 401,
    };
  }

  // Handle custom validation/insertion errors thrown during transactional actions
  if (error instanceof Error && (error.message.includes('validation failed') || error.message.includes('insertion failed'))) {
    return {
      message: error.message,
      status: 400,
    };
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Handle Postgres/Drizzle driver error states
    const code = err.code ?? (err.driverError ? (err.driverError as Record<string, unknown>).code : undefined);

    if (code === '23505') {
      return {
        message: 'This record already exists',
        status: 409,
      };
    }
    if (code === '23503') {
      return {
        message: 'Referenced item not found',
        status: 400,
      };
    }
    if (code === '23502') {
      return {
        message: 'Required field missing',
        status: 400,
      };
    }
  }

  return {
    message: 'Internal server error',
    status: 500,
  };
}

export function handleRouteError(error: unknown): NextResponse {
  const sanitized = sanitizeDbError(error);
  return NextResponse.json({ error: sanitized.message }, { status: sanitized.status });
}
