"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isCorporateEmail, resolvePostLoginPath } from "@/modules/auth/auth-guards";
import { ALLOWED_DOMAIN } from "@/modules/auth/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mapAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Correo o clave incorrectos. Verifica tus credenciales corporativas.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Tu acceso fue creado, pero debes confirmar el correo antes de ingresar.";
  }

  return "No pudimos iniciar sesion. Revisa tus credenciales.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;
    setServerError(null);
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log("LOGIN SUBMIT", { email: normalizedEmail });

      if (!normalizedEmail || !password) {
        setServerError("Ingresa tu correo corporativo y tu clave.");
        return;
      }

      if (!isCorporateEmail(normalizedEmail)) {
        setServerError(`Solo se permiten cuentas corporativas ${ALLOWED_DOMAIN}`);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      console.log("LOGIN RESULT", { ok: !error, error: error?.message ?? null });

      if (error) {
        setServerError(mapAuthError(error.message));
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setServerError("No pudimos obtener tu sesion luego del login. Intenta nuevamente.");
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("must_change_password, is_active")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!profile && !profileError) {
        const fallback = await supabase
          .from("user_profiles")
          .select("must_change_password, is_active")
          .eq("email", normalizedEmail)
          .maybeSingle();
        profile = fallback.data;
        profileError = fallback.error;
      }

      console.log("PROFILE RESULT", { profile, error: profileError?.message ?? null });

      if (profileError) {
        setServerError("No pudimos validar tu perfil interno. Intenta nuevamente.");
        return;
      }

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        setServerError("Tu acceso interno esta desactivado. Contacta a un administrador.");
        return;
      }

      const redirectTarget = resolvePostLoginPath(profile?.must_change_password);
      console.log("REDIRECT TARGET", redirectTarget);
      router.push(redirectTarget);
      router.refresh();
    } catch {
      setServerError("Ocurrio un error inesperado al iniciar sesion. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Correo corporativo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="equipo@tazki.cl"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Clave</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="********"
            className="pr-11"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? "Ocultar clave" : "Mostrar clave"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tazki-slate-500)] transition hover:text-[var(--tazki-blue-900)]"
            onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
            disabled={isLoading}
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{serverError}</p>}

      <Button type="submit" className="h-11 w-full" disabled={isLoading}>
        {isLoading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
