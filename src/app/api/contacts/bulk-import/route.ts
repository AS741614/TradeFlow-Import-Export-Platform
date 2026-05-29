import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { bulkImportContacts } from '@/lib/db/queries/contacts-bulk';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { logActivity } from '@/lib/audit-logger';

// Route-level request body schema validation (Note B)
const bulkImportRequestSchema = z.object({
  rows: z.array(z.unknown()),
  continueOnError: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();

    // Validate request body structure
    const parsedRequest = bulkImportRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      return NextResponse.json({ error: parsedRequest.error.message }, { status: 400 });
    }

    const { rows, continueOnError } = parsedRequest.data;

    // Safety checks: Reject if payload exceeds 1,000 records (Note B)
    if (rows.length > 1000) {
      return new NextResponse('Payload Too Large', { status: 413 });
    }

    const result = await bulkImportContacts(session.orgId, rows, continueOnError !== false);

    if (result.imported > 0) {
      await logActivity({
        orgId: session.orgId,
        userId: session.userId,
        entityType: 'contact',
        entityId: '00000000-0000-0000-0000-000000000000',
        action: 'bulk_imported',
        changeSummary: {
          count: result.imported,
        },
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
