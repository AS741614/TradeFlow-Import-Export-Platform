import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getAppMetadataValue, setAppMetadataValue, deleteAppMetadataValue } from '@/lib/db/queries/app-metadata';
import { saveAppMetadataSchema } from '@/lib/db/validation/app-metadata';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await throwIfNotAuthenticated();
    const { key } = await params;
    const record = await getAppMetadataValue(session.orgId, key);
    if (!record) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json({ data: { key: record.key, value: record.value } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await throwIfNotAuthenticated();
    const { key } = await params;
    const body: unknown = await req.json();
    const parsed = saveAppMetadataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await setAppMetadataValue(session.orgId, key, parsed.data.value);
    if (!record) {
      return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
    }
    return NextResponse.json({ data: { key: record.key, value: record.value } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await throwIfNotAuthenticated();
    const { key } = await params;
    await deleteAppMetadataValue(session.orgId, key);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return handleRouteError(error);
  }
}
