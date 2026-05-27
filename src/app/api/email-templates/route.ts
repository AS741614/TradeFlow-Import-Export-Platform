// TODO(10b): Replace DEFAULT_USER_ID/DEFAULT_ORG_ID with session
import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplates, createEmailTemplate } from '@/lib/db/queries/email-templates';
import { insertEmailTemplateSchema } from '@/lib/db/validation/email-templates';

export async function GET() {
  try {
    const list = await getEmailTemplates();
    return NextResponse.json({ data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = insertEmailTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createEmailTemplate(parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
