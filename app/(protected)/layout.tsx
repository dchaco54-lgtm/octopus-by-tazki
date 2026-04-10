import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name?.trim() || user.user_metadata.full_name || user.email || "Colaborador Tazki";
  const userEmail = profile?.email || user.email || "equipo@tazki.cl";

  return (
    <ProtectedShell displayName={displayName} email={userEmail}>
      {children}
    </ProtectedShell>
  );
}
