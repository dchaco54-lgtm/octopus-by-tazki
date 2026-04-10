"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productSchema } from "@/modules/products/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function createProductAction(formData: FormData) {
  const category = getString(formData, "category") || "plan";
  const billingType = getString(formData, "billing_type") || "recurrente";
  const payload = {
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    category,
    billing_type: billingType,
    affects_mrr: getBoolean(formData, "affects_mrr"),
    affects_revenue: getBoolean(formData, "affects_revenue"),
    base_price_uf: Number(getString(formData, "base_price_uf") || 0),
    is_active: getBoolean(formData, "is_active"),
    allow_manual_override: getBoolean(formData, "allow_manual_override"),
    depends_on_plan: getBoolean(formData, "depends_on_plan"),
    is_legacy: getBoolean(formData, "is_legacy"),
    allow_upsell: getBoolean(formData, "allow_upsell"),
    allow_cross_sell: getBoolean(formData, "allow_cross_sell"),
  };

  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/products/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("products").insert(parsed.data);

  if (error) {
    redirect(`/products/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductAction(id: string, formData: FormData) {
  const category = getString(formData, "category") || "plan";
  const billingType = getString(formData, "billing_type") || "recurrente";
  const payload = {
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    category,
    billing_type: billingType,
    affects_mrr: getBoolean(formData, "affects_mrr"),
    affects_revenue: getBoolean(formData, "affects_revenue"),
    base_price_uf: Number(getString(formData, "base_price_uf") || 0),
    is_active: getBoolean(formData, "is_active"),
    allow_manual_override: getBoolean(formData, "allow_manual_override"),
    depends_on_plan: getBoolean(formData, "depends_on_plan"),
    is_legacy: getBoolean(formData, "is_legacy"),
    allow_upsell: getBoolean(formData, "allow_upsell"),
    allow_cross_sell: getBoolean(formData, "allow_cross_sell"),
  };

  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/products/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("products").update(parsed.data).eq("id", id);

  if (error) {
    redirect(`/products/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}
