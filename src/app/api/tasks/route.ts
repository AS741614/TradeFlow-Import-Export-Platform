import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getTasks, createTask } from '@/lib/db/queries/tasks';
import { insertTaskSchema } from '@/lib/db/validation/tasks';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { logActivity } from '@/lib/audit-logger';

import { getDb } from '@/lib/db/client';
import { tasks } from '@/lib/db/schema';
import { withTenant } from '@/lib/db/queries/base';
import { count, and } from 'drizzle-orm';
import { applySearchFilterSort } from '@/lib/db/queries/search-helpers';

export async function GET(req?: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    
    let limit = 50;
    let offset = 0;
    const searchParams = req ? new URL(req.url).searchParams : new URLSearchParams();
    
    if (req) {
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
    }

    const config = {
      searchColumns: [tasks.title, tasks.description],
      statusColumn: tasks.status,
      sortByWhitelist: ['title', 'status', 'dueDate', 'priority', 'createdAt'],
      sortByColumnMap: {
        title: tasks.title,
        status: tasks.status,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
      },
      defaultSortColumn: tasks.createdAt,
    };

    const { whereClause, orderClause } = applySearchFilterSort(searchParams, config);

    const db = getDb();
    let conditions = withTenant(tasks, session.orgId);
    if (whereClause) {
      const merged = and(conditions, whereClause);
      if (merged) {
        conditions = merged;
      }
    }

    const [countResult] = await db
      .select({ total: count() })
      .from(tasks)
      .where(conditions);
    const total = countResult?.total ?? 0;

    const list = await getTasks(session.orgId, limit, offset, whereClause, orderClause);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      data: list,
      pagination: { limit, offset, total, hasMore }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = insertTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createTask(session.orgId, parsed.data);
    
    // Log task creation
    await logActivity({
      orgId: session.orgId,
      userId: session.userId,
      entityType: 'task',
      entityId: record.id,
      action: 'created',
      changeSummary: { created: record },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
