import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getShipmentById, updateShipment, deleteShipment } from '@/lib/db/queries/shipments';
import { updateShipmentSchema } from '@/lib/db/validation/shipments';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { logActivity, getDiff } from '@/lib/audit-logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const record = await getShipmentById(session.orgId, id);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    // Fetch state before update for diff calculation
    const before = await getShipmentById(session.orgId, id);
    if (!before) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const record = await updateShipment(session.orgId, id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Log the diff of changed fields
    const diff = getDiff(before, record);
    await logActivity({
      orgId: session.orgId,
      userId: session.userId,
      entityType: 'shipment',
      entityId: id,
      action: 'updated',
      changeSummary: diff,
    });

    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const reason = searchParams.get('reason') ?? undefined;
    const record = await deleteShipment(session.orgId, id, session.userId, reason);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}
