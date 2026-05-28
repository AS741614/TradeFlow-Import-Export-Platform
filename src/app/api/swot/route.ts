import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getSwotItems, createSwotItem } from '@/lib/db/queries/swot';
import { insertSwotSchema } from '@/lib/db/validation/swot';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await throwIfNotAuthenticated();
    const list = await getSwotItems(session.orgId);
    return NextResponse.json({ data: list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = insertSwotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createSwotItem(session.orgId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
