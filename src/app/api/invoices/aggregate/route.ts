import { NextRequest, NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { getInvoiceAggregates } from '@/lib/db/queries/aggregates';
import { handleRouteError } from '@/lib/db/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const searchParams = new URL(req.url).searchParams;

    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    const contactVal = searchParams.get('contactId');
    const statusVal = searchParams.get('status');

    const filters = {
      startDate: start ?? undefined,
      endDate: end ?? undefined,
      contactId: contactVal ?? undefined,
      status: statusVal ?? undefined,
    };

    const aggregates = await getInvoiceAggregates(session.orgId, filters);

    return NextResponse.json({ data: aggregates });
  } catch (error) {
    return handleRouteError(error);
  }
}
