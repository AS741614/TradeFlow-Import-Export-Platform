import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getContacts, createContact } from '@/lib/db/queries/contacts';
import { insertContactSchema } from '@/lib/db/validation/contacts';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await throwIfNotAuthenticated();
    const list = await getContacts(session.orgId);
    return NextResponse.json({ data: list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = insertContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createContact(session.orgId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
