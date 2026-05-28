import { NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { getDashboardStats } from '@/lib/db/queries/dashboard';
import { handleRouteError } from '@/lib/db/error-sanitizer';

export async function GET() {
  try {
    const session = await throwIfNotAuthenticated();
    const stats = await getDashboardStats(session.orgId, session.userId);
    return NextResponse.json({ data: stats });
  } catch (error) {
    return handleRouteError(error);
  }
}
