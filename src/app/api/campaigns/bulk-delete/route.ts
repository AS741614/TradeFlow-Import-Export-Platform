import { NextRequest, NextResponse } from 'next/server';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { executeBulkDelete } from '@/lib/db/bulk-delete-helper';
import { deleteCampaign } from '@/lib/db/queries/campaigns';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const result = await executeBulkDelete(
      session.orgId,
      session.userId,
      parsed.data.ids,
      'campaign',
      deleteCampaign
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
