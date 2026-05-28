import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getOutreachContacts, createOutreachContact } from '@/lib/db/queries/outreach-contacts';
import { insertOutreachContactSchema } from '@/lib/db/validation/outreach-contacts';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await throwIfNotAuthenticated();
    const list = await getOutreachContacts(session.orgId);
    return NextResponse.json({ data: list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = insertOutreachContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createOutreachContact(session.orgId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
