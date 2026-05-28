import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getEmailTemplateById, updateEmailTemplate, deleteEmailTemplate } from '@/lib/db/queries/email-templates';
import { updateEmailTemplateSchema } from '@/lib/db/validation/email-templates';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await throwIfNotAuthenticated();
    const { id } = await params;
    const record = await getEmailTemplateById(session.orgId, id);
    if (!record) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
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
    const parsed = updateEmailTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await updateEmailTemplate(session.orgId, id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
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
    const record = await deleteEmailTemplate(session.orgId, id, session.userId, reason);
    if (!record) {
      return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (error) {
    return handleRouteError(error);
  }
}
