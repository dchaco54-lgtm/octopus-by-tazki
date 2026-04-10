"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  pricingRuleSchema,
  pricingStrategySchema,
  pricingVariableSchema,
  salesChannelSchema,
} from "@/modules/products/catalog-validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function createPricingVariableAction(formData: FormData) {
  const payload = {
    variable_code: getString(formData, "variable_code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    variable_type: getString(formData, "variable_type"),
    unit: getString(formData, "unit"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingVariableSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/variables/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_variables").insert(parsed.data);
  if (error) {
    redirect(`/products/variables/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=variables");
}

export async function updatePricingVariableAction(id: string, formData: FormData) {
  const payload = {
    variable_code: getString(formData, "variable_code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    variable_type: getString(formData, "variable_type"),
    unit: getString(formData, "unit"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingVariableSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/variables/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_variables").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/products/variables/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=variables");
}

export async function createSalesChannelAction(formData: FormData) {
  const payload = {
    channel_code: getString(formData, "channel_code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = salesChannelSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/channels/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sales_channels").insert(parsed.data);
  if (error) {
    redirect(`/products/channels/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=channels");
}

export async function updateSalesChannelAction(id: string, formData: FormData) {
  const payload = {
    channel_code: getString(formData, "channel_code"),
    name: getString(formData, "name"),
    description: getString(formData, "description"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = salesChannelSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/channels/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("sales_channels").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/products/channels/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=channels");
}

export async function createPricingStrategyAction(formData: FormData) {
  const payload = {
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    version: getString(formData, "version"),
    description: getString(formData, "description"),
    valid_from: getString(formData, "valid_from"),
    valid_to: getString(formData, "valid_to"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingStrategySchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/pricing-strategies/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_strategies").insert(parsed.data);
  if (error) {
    redirect(`/products/pricing-strategies/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=strategies");
}

export async function updatePricingStrategyAction(id: string, formData: FormData) {
  const payload = {
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    version: getString(formData, "version"),
    description: getString(formData, "description"),
    valid_from: getString(formData, "valid_from"),
    valid_to: getString(formData, "valid_to"),
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingStrategySchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/pricing-strategies/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_strategies").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/products/pricing-strategies/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=strategies");
}

export async function createPricingRuleAction(formData: FormData) {
  const payload = {
    pricing_strategy_id: getString(formData, "pricing_strategy_id"),
    target_type: getString(formData, "target_type"),
    target_product_id: getString(formData, "target_product_id") || undefined,
    target_variable_id: getString(formData, "target_variable_id") || undefined,
    pricing_mode: getString(formData, "pricing_mode"),
    value_uf: getString(formData, "value_uf") || undefined,
    min_value: getString(formData, "min_value") || undefined,
    max_value: getString(formData, "max_value") || undefined,
    formula_text: getString(formData, "formula_text") || undefined,
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingRuleSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/pricing-rules/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_rules").insert(parsed.data);
  if (error) {
    redirect(`/products/pricing-rules/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=rules");
}

export async function updatePricingRuleAction(id: string, formData: FormData) {
  const payload = {
    pricing_strategy_id: getString(formData, "pricing_strategy_id"),
    target_type: getString(formData, "target_type"),
    target_product_id: getString(formData, "target_product_id") || undefined,
    target_variable_id: getString(formData, "target_variable_id") || undefined,
    pricing_mode: getString(formData, "pricing_mode"),
    value_uf: getString(formData, "value_uf") || undefined,
    min_value: getString(formData, "min_value") || undefined,
    max_value: getString(formData, "max_value") || undefined,
    formula_text: getString(formData, "formula_text") || undefined,
    is_active: getBoolean(formData, "is_active"),
  };

  const parsed = pricingRuleSchema.safeParse(payload);
  if (!parsed.success) {
    redirect(`/products/pricing-rules/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulario invalido")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("pricing_rules").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/products/pricing-rules/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/products");
  redirect("/products?tab=rules");
}

