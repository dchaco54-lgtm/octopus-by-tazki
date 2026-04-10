import { redirect } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requiresFirstLoginPasswordChange } from "@/modules/auth/auth-guards";
import { MODULES_PATH } from "@/modules/auth/constants";

export default async function ChangePasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!requiresFirstLoginPasswordChange(profile?.must_change_password)) {
    redirect(MODULES_PATH);
  }

  return (
    <section className="flex min-h-[calc(100vh-120px)] items-center justify-center py-10">
      <Card className="w-full max-w-md border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <CardHeader className="space-y-5 px-8 pt-8 text-center">
          <div className="mx-auto">
            <AppLogo size="lg" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-[-0.03em]">Cambio de clave</CardTitle>
            <CardDescription className="text-sm text-[var(--tazki-slate-500)]">
              Por seguridad, debes actualizar tu clave en el primer ingreso antes de continuar.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </section>
  );
}
