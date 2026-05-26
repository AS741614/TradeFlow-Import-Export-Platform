import { NextRequest, NextResponse } from 'next/server';
import { getShipmentById, updateShipment, deleteShipment } from '@/lib/db/queries/shipments';
import { updateShipmentSchema } from '@/lib/db/validation/shipments';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getShipmentById(id);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
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
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await updateShipment(id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
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
    const record = await deleteShipment(id, reason);
    if (!record) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
