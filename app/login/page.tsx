import { redirect } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/shared/login-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/modules/auth/auth-guards";

export default async function LoginPage() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("must_change_password")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      redirect(resolvePostLoginPath(profile?.must_change_password));
    }
  } catch {
    // If env vars are missing locally, keep the login screen accessible.
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(42,79,148,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(19,38,77,0.08),transparent_30%)]" />
      <div className="absolute left-1/2 top-12 h-60 w-60 -translate-x-1/2 rounded-full bg-[rgba(19,38,77,0.06)] blur-3xl" />

      <Card className="relative mx-auto w-full max-w-md border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <CardHeader className="space-y-5 px-8 pt-8 text-center">
          <div className="mx-auto">
            <AppLogo size="lg" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-[-0.03em]">Octopus</CardTitle>
            <CardDescription className="text-sm uppercase tracking-[0.26em] text-[var(--tazki-slate-500)]">
              by Tazki
            </CardDescription>
          </div>
          <p className="text-sm text-[var(--tazki-slate-700)]">Acceso interno para colaboradores Tazki</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
