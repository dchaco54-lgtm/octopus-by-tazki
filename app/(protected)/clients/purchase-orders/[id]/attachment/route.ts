import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PURCHASE_ORDER_BUCKET = "client-purchase-orders";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();

  const { data: order } = await supabase
    .from("client_purchase_orders")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();

  if (!order?.attachment_path) {
    return NextResponse.redirect(new URL("/clients?error=Sin%20PDF%20asociado", _request.url));
  }

  const { data, error } = await supabase.storage.from(PURCHASE_ORDER_BUCKET).createSignedUrl(order.attachment_path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.redirect(new URL("/clients?error=No%20se%20pudo%20generar%20link%20PDF", _request.url));
  }

  return NextResponse.redirect(data.signedUrl);
}

