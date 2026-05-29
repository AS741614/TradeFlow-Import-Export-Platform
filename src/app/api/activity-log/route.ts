import { NextRequest, NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { getActivityLogs, getActivityLogsCount } from '@/lib/db/queries/activity-log';
import { handleRouteError } from '@/lib/db/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const searchParams = new URL(req.url).searchParams;

    let limit = 50;
    let offset = 0;

    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit >= 1) {
        limit = Math.min(parsedLimit, 200);
      }
    }
    if (offsetParam !== null) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters = {
      entityType: entityType ?? undefined,
      entityId: entityId ?? undefined,
      userId: userId ?? undefined,
      action: action ?? undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    };

    const [logs, total] = await Promise.all([
      getActivityLogs(session.orgId, filters, limit, offset),
      getActivityLogsCount(session.orgId, filters),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
