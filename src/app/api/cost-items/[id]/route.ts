import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getCostItemById, updateCostItem, deleteCostItem } from '@/lib/db/queries/cost-items';
import { updateCostItemSchema } from '@/lib/db/validation/cost-items';
import { throwIfNotAuthenticated } from '@/lib/auth-server';
import { logActivity, getDiff } from '@/lib/audit-logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const record = await getCostItemById(session.orgId, id);
    if (!record) {
      return NextResponse.json({ error: 'Cost item not found' }, { status: 404 });
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
    const parsed = updateCostItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    // Fetch state before update for diff calculation
    const before = await getCostItemById(session.orgId, id);
    if (!before) {
      return NextResponse.json({ error: 'Cost item not found' }, { status: 404 });
    }

    const record = await updateCostItem(session.orgId, id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Cost item not found' }, { status: 404 });
    }

    // Log the diff of changed fields
    const diff = getDiff(before, record);
    await logActivity({
      orgId: session.orgId,
      userId: session.userId,
      entityType: 'cost-item',
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
    const record = await deleteCostItem(session.orgId, id, session.userId, reason);
    if (!record) {
      return NextResponse.json({ error: 'Cost item not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}
