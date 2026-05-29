import { NextRequest, NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { getContactAggregates } from '@/lib/db/queries/aggregates';
import { handleRouteError } from '@/lib/db/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const searchParams = new URL(req.url).searchParams;

    const statusVal = searchParams.get('status');
    const typeVal = searchParams.get('type');
    const countryVal = searchParams.get('country');

    const filters = {
      status: statusVal ?? undefined,
      type: typeVal ?? undefined,
      country: countryVal ?? undefined,
    };

    const aggregates = await getContactAggregates(session.orgId, filters);

    return NextResponse.json({ data: aggregates });
  } catch (error) {
    return handleRouteError(error);
  }
}
