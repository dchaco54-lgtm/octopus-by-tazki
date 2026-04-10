"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const changePasswordSchema = z
  .object({
    password: z.string().min(8, "La nueva clave debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirma la nueva clave"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las claves no coinciden",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);

    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      setServerError("Tu sesion no es valida. Vuelve a iniciar sesion.");
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setServerError("No pudimos actualizar tu clave. Intenta nuevamente.");
      return;
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ must_change_password: false })
      .eq("auth_user_id", user.id);

    if (profileError) {
      setServerError("Tu clave se actualizo, pero no pudimos cerrar el primer ingreso. Intenta otra vez.");
      return;
    }

    router.replace("/modules");
    router.refresh();
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva clave</Label>
        <Input id="password" type="password" placeholder="********" {...register("password")} />
        {errors.password && <p className="text-sm text-[var(--tazki-danger)]">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nueva clave</Label>
        <Input id="confirmPassword" type="password" placeholder="********" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-sm text-[var(--tazki-danger)]">{errors.confirmPassword.message}</p>}
      </div>

      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{serverError}</p>}

      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Actualizando..." : "Guardar nueva clave"}
      </Button>
    </form>
  );
}
