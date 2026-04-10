import { NextResponse } from "next/server";
import { createServerBillingClient } from "@/modules/billing/server";

interface BillingOutputRouteProps {
  params: Promise<{
    id: string;
    kind: string;
  }>;
}

export async function GET(_: Request, { params }: BillingOutputRouteProps) {
  const { id, kind } = await params;

  if (kind !== "xml" && kind !== "pdf") {
    return NextResponse.json({ error: "Output no soportado" }, { status: 404 });
  }

  const supabase = await createServerBillingClient();
  const { data, error } = await supabase
    .from("billing_record_outputs")
    .select("file_name, mime_type, content_text")
    .eq("billing_record_id", id)
    .eq("output_type", kind)
    .maybeSingle();

  if (error || !data?.content_text) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", data.mime_type || (kind === "xml" ? "application/xml; charset=utf-8" : "application/pdf"));
  headers.set("Content-Disposition", `attachment; filename="${data.file_name || `billing-${id}.${kind}`}"`);

  if (kind === "pdf") {
    const buffer = Buffer.from(data.content_text, "base64");
    return new NextResponse(buffer, { headers });
  }

  return new NextResponse(data.content_text, { headers });
}
