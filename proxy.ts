import { NextResponse, type NextRequest } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase/proxy";
import { resolvePostLoginPath } from "@/modules/auth/auth-guards";
import { CHANGE_PASSWORD_PATH, MODULES_PATH } from "@/modules/auth/constants";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isPasswordSetupPath = pathname === CHANGE_PASSWORD_PATH;

  const { supabase, response } = createProxySupabaseClient(request);

  if (!supabase) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (isPublic) {
      return NextResponse.redirect(new URL(resolvePostLoginPath(profile?.must_change_password), request.url));
    }

    if (profile?.must_change_password && !isPasswordSetupPath) {
      return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
    }

    if (!profile?.must_change_password && isPasswordSetupPath) {
      return NextResponse.redirect(new URL(MODULES_PATH, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
