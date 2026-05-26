import { NextRequest, NextResponse } from 'next/server';
import { getContactById, updateContact, deleteContact } from '@/lib/db/queries/contacts';
import { updateContactSchema } from '@/lib/db/validation/contacts';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getContactById(id);
    if (!record) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await updateContact(id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const reason = searchParams.get('reason') ?? undefined;
    const record = await deleteContact(id, reason);
    if (!record) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
