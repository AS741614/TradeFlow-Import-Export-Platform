import { NextRequest, NextResponse } from 'next/server';
import { getBusinessPlanSections, createBusinessPlanSection } from '@/lib/db/queries/business-plan';
import { insertBusinessPlanSchema } from '@/lib/db/validation/business-plan';

export async function GET() {
  try {
    const list = await getBusinessPlanSections();
    return NextResponse.json({ data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = insertBusinessPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createBusinessPlanSection(parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
