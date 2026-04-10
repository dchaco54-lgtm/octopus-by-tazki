import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.from("subscriptions").select("id, subscription_code, status, customer_id, created_at").eq("id", id).maybeSingle();

  return NextResponse.json({
    ok: !error,
    id,
    found: Boolean(data),
    error: error?.message ?? null,
    row: data ?? null,
  });
}

