import { NextResponse } from "next/server";
import { generateStoredBillingOutput } from "@/modules/billing/server";

interface BillingGenerateOutputRouteProps {
  params: Promise<{
    id: string;
    kind: string;
  }>;
}

export async function GET(request: Request, { params }: BillingGenerateOutputRouteProps) {
  const { id, kind } = await params;

  if (kind !== "xml" && kind !== "pdf") {
    return NextResponse.json({ error: "Output no soportado" }, { status: 404 });
  }

  const result = await generateStoredBillingOutput(id, kind);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/billing/${id}?error=${encodeURIComponent(result.error)}`, request.url));
  }

  const downloadPath = result.downloadPath ?? `/billing/${id}/outputs/${kind}`;
  return NextResponse.redirect(new URL(downloadPath, request.url));
}
