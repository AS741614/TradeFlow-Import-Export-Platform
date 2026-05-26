import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact } from '@/lib/db/queries/contacts';
import { insertContactSchema } from '@/lib/db/validation/contacts';

export async function GET() {
  try {
    const list = await getContacts();
    return NextResponse.json({ data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = insertContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createContact(parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
