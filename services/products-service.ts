import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ListProductsParams {
  q?: string;
  active?: string;
  category?: string;
  categories?: string[];
  billing_type?: string;
}

export async function listProducts({ q, active, category, categories, billing_type }: ListProductsParams) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (active && active !== "all") {
    query = query.eq("is_active", active === "true");
  }

  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  } else if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (billing_type && billing_type !== "all") {
    query = query.eq("billing_type", billing_type);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getProductById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return data;
}

export async function listProductCategories() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("products").select("category");
  const values = new Set((data ?? []).map((item) => item.category).filter(Boolean));
  return Array.from(values);
}

export async function listPricingStrategies({ active }: { active?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("pricing_strategies").select("*").order("created_at", { ascending: false });

  if (active && active !== "all") {
    query = query.eq("is_active", active === "true");
  }

  const { data } = await query;
  return data ?? [];
}

export async function getPricingStrategyById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("pricing_strategies").select("*").eq("id", id).single();
  return data;
}

export async function listPricingVariables({ active }: { active?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("pricing_variables").select("*").order("created_at", { ascending: false });

  if (active && active !== "all") {
    query = query.eq("is_active", active === "true");
  }

  const { data } = await query;
  return data ?? [];
}

export async function getPricingVariableById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("pricing_variables").select("*").eq("id", id).single();
  return data;
}

export async function listPricingRules({ strategyId }: { strategyId?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("pricing_rules")
    .select(
      `
      *,
      pricing_strategy:pricing_strategies!pricing_rules_pricing_strategy_id_fkey(id, code, name),
      target_product:products!pricing_rules_target_product_id_fkey(id, code, name, category),
      target_variable:pricing_variables!pricing_rules_target_variable_id_fkey(id, variable_code, name)
    `
    )
    .order("created_at", { ascending: false });

  if (strategyId && strategyId !== "all") {
    query = query.eq("pricing_strategy_id", strategyId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getPricingRuleById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("pricing_rules").select("*").eq("id", id).single();
  return data;
}

export async function listSalesChannels({ active }: { active?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("sales_channels").select("*").order("created_at", { ascending: false });

  if (active && active !== "all") {
    query = query.eq("is_active", active === "true");
  }

  const { data } = await query;
  return data ?? [];
}

export async function getSalesChannelById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("sales_channels").select("*").eq("id", id).single();
  return data;
}

export async function listSalesExecutives({ active }: { active?: string } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("user_profiles").select("id, full_name, email, role, is_active, created_at").order("created_at", { ascending: false });

  if (active && active !== "all") {
    query = query.eq("is_active", active === "true");
  }

  const { data } = await query;
  return data ?? [];
}

export async function getProductsCatalogCounts() {
  const supabase = await createServerSupabaseClient();

  const [
    plans,
    addons,
    services,
    variables,
    strategies,
    rules,
    channels,
    executives,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category", "plan"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category", "addon"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("category", ["service", "implementation", "support", "one_time", "legacy"]),
    supabase.from("pricing_variables").select("id", { count: "exact", head: true }),
    supabase.from("pricing_strategies").select("id", { count: "exact", head: true }),
    supabase.from("pricing_rules").select("id", { count: "exact", head: true }),
    supabase.from("sales_channels").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    plans: plans.count ?? 0,
    addons: addons.count ?? 0,
    services: services.count ?? 0,
    variables: variables.count ?? 0,
    strategies: strategies.count ?? 0,
    rules: rules.count ?? 0,
    channels: channels.count ?? 0,
    executives: executives.count ?? 0,
  };
}
