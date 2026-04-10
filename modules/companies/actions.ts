"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { companySchema } from "@/modules/companies/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCompanyAction(formData: FormData) {
  const payload = {
    legal_name: getString(formData, "legal_name"),
    trade_name: getString(formData, "trade_name"),
    rut: getString(formData, "rut"),
    billing_email: getString(formData, "billing_email"),
    admin_email: getString(formData, "admin_email"),
    phone: getString(formData, "phone"),
    address: getString(formData, "address"),
    commune: getString(formData, "commune"),
    city: getString(formData, "city"),
    country: getString(formData, "country") || "Chile",
    legal_representative_name: getString(formData, "legal_representative_name"),
    legal_representative_rut: getString(formData, "legal_representative_rut"),
    status: getString(formData, "status") as "active" | "inactive" | "suspended",
    notes: getString(formData, "notes"),
  };

  const parsed = companySchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/companies/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("companies").insert(parsed.data);

  if (error) {
    redirect(`/companies/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompanyAction(id: string, formData: FormData) {
  const payload = {
    legal_name: getString(formData, "legal_name"),
    trade_name: getString(formData, "trade_name"),
    rut: getString(formData, "rut"),
    billing_email: getString(formData, "billing_email"),
    admin_email: getString(formData, "admin_email"),
    phone: getString(formData, "phone"),
    address: getString(formData, "address"),
    commune: getString(formData, "commune"),
    city: getString(formData, "city"),
    country: getString(formData, "country") || "Chile",
    legal_representative_name: getString(formData, "legal_representative_name"),
    legal_representative_rut: getString(formData, "legal_representative_rut"),
    status: getString(formData, "status") as "active" | "inactive" | "suspended",
    notes: getString(formData, "notes"),
  };

  const parsed = companySchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/companies/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("companies").update(parsed.data).eq("id", id);

  if (error) {
    redirect(`/companies/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}
