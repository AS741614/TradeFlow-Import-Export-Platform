// TODO(10b): Replace DEFAULT_USER_ID/DEFAULT_ORG_ID with session
import { NextRequest, NextResponse } from 'next/server';
import { getAppMetadataValue, setAppMetadataValue, deleteAppMetadataValue } from '@/lib/db/queries/app-metadata';
import { saveAppMetadataSchema } from '@/lib/db/validation/app-metadata';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const record = await getAppMetadataValue(key);
    if (!record) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json({ data: { key: record.key, value: record.value } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body: unknown = await req.json();
    const parsed = saveAppMetadataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await setAppMetadataValue(key, parsed.data.value);
    if (!record) {
      return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
    }
    return NextResponse.json({ data: { key: record.key, value: record.value } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    await deleteAppMetadataValue(key);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
