import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/db/error-sanitizer';
import { getProducts, createProduct } from '@/lib/db/queries/products';
import { insertProductSchema } from '@/lib/db/validation/products';
import { throwIfNotAuthenticated } from '@/lib/auth-server';

export async function GET() {
  try {
    const session = await throwIfNotAuthenticated();
    const list = await getProducts(session.orgId);
    return NextResponse.json({ data: list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await throwIfNotAuthenticated();
    const body: unknown = await req.json();
    const parsed = insertProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const record = await createProduct(session.orgId, parsed.data);
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
