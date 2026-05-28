import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getShipments, createShipment } from '@/lib/db/queries/shipments';
import { insertShipmentSchema } from '@/lib/db/validation/shipments';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

import { getDb } from '@/lib/db/client';
import { shipments } from '@/lib/db/schema';
import { withTenant } from '@/lib/db/queries/base';
import { count } from 'drizzle-orm';

export async function GET(req?: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    
    let limit = 50;
    let offset = 0;
    
    if (req) {
      const { searchParams } = new URL(req.url);
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

    const db = getDb();
    const [countResult] = await db
      .select({ total: count() })
      .from(shipments)
      .where(withTenant(shipments, session.orgId));
    const total = countResult?.total ?? 0;

    const list = await getShipments(session.orgId, limit, offset);
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
    const parsed = insertShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createShipment(session.orgId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
