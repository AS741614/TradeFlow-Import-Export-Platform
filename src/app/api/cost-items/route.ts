// TODO(10b): Replace DEFAULT_USER_ID/DEFAULT_ORG_ID with session
import { NextRequest, NextResponse } from 'next/server';
import { getCostItems, createCostItem } from '@/lib/db/queries/cost-items';
import { insertCostItemSchema } from '@/lib/db/validation/cost-items';

export async function GET() {
  try {
    const list = await getCostItems();
    return NextResponse.json({ data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = insertCostItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createCostItem(parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
