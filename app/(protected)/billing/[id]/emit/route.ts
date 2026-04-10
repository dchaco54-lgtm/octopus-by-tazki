import { NextResponse } from "next/server";
import { emitStoredBillingDocument } from "@/modules/billing/server";

interface BillingEmitRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: BillingEmitRouteProps) {
  const { id } = await params;
  const result = await emitStoredBillingDocument(id);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/billing/${id}?error=${encodeURIComponent(result.error)}`, request.url));
  }

  return NextResponse.redirect(new URL(`/billing/${id}?success=${encodeURIComponent(result.message)}`, request.url));
}
