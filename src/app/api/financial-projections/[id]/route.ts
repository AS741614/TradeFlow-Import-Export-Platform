import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getFinancialProjectionById, updateFinancialProjection, deleteFinancialProjection } from '@/lib/db/queries/financial-projections';
import { updateFinancialProjectionSchema } from '@/lib/db/validation/financial-projections';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const record = await getFinancialProjectionById(session.orgId, id);
    if (!record) {
      return NextResponse.json({ error: 'Financial projection not found' }, { status: 404 });
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
    const parsed = updateFinancialProjectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await updateFinancialProjection(session.orgId, id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Financial projection not found' }, { status: 404 });
    }
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
    const record = await deleteFinancialProjection(session.orgId, id, session.userId, reason);
    if (!record) {
      return NextResponse.json({ error: 'Financial projection not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}
