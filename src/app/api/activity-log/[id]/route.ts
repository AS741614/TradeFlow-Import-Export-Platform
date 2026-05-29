import { NextRequest, NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { getActivityLogById } from '@/lib/db/queries/activity-log';
import { handleRouteError } from '@/lib/db/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await throwIfNotAuthenticated();
    const resolvedParams = await params;
    const log = await getActivityLogById(session.orgId, resolvedParams.id);

    if (!log) {
      return NextResponse.json({ error: 'Activity log not found' }, { status: 404 });
    }

    return NextResponse.json({ data: log });
  } catch (error) {
    return handleRouteError(error);
  }
}
