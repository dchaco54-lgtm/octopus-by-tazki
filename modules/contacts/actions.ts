"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contactSchema } from "@/modules/contacts/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function createContactAction(formData: FormData) {
  const payload = {
    company_id: getString(formData, "company_id"),
    first_name: getString(formData, "first_name"),
    last_name: getString(formData, "last_name"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    role: getString(formData, "role"),
    area: getString(formData, "area"),
    is_primary: getBoolean(formData, "is_primary"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/contacts/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contacts").insert(parsed.data);

  if (error) {
    redirect(`/contacts/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");
  redirect("/contacts");
}

export async function updateContactAction(id: string, formData: FormData) {
  const payload = {
    company_id: getString(formData, "company_id"),
    first_name: getString(formData, "first_name"),
    last_name: getString(formData, "last_name"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    role: getString(formData, "role"),
    area: getString(formData, "area"),
    is_primary: getBoolean(formData, "is_primary"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = contactSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/contacts/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contacts").update(parsed.data).eq("id", id);

  if (error) {
    redirect(`/contacts/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/companies");
  redirect(`/contacts/${id}`);
}
