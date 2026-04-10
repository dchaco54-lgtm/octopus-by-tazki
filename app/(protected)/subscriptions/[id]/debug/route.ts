import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSubscriptionDetailSafe } from "@/services/subscriptions-service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const detail = await getSubscriptionDetailSafe(id);

  return NextResponse.json({
    id,
    auth: {
      ok: !userError,
      userPresent: Boolean(user),
      userError: userError?.message ?? null,
      userId: user?.id ?? null,
      email: user?.email ?? null,
    },
    detail,
  });
}

