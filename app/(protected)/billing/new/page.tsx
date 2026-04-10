import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BillingCreateScreen } from "@/modules/billing/billing-create-screen";

export default async function NewBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const [query, { data: companies }, { data: subscriptions }, { data: products }, { data: executives }, { data: currencyRates }, { data: purchaseOrders }, { data: authData }] = await Promise.all([
    searchParams,
    supabase
      .from("companies")
      .select("id, trade_name, legal_name, rut, internal_code, payer_client_id, currency, dte_email, billing_email")
      .order("trade_name", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("id, company_id, subscription_code, payment_terms_days")
      .in("status", ["active", "suspended"])
      .order("subscription_code", { ascending: true }),
    supabase
      .from("products")
      .select("id, code, name, base_price_uf")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true }),
    supabase
      .from("currency_rates")
      .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, is_active")
      .eq("currency_code", "UF")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false }),
    supabase
      .from("client_purchase_orders")
      .select("id, client_id, purchase_order_number, valid_from, valid_to, status, notes")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const currentUserName =
    authData.user?.user_metadata?.full_name ||
    authData.user?.email ||
    "Sistema";
  const initialOrigin = query.origin === "externo" ? "externo" : "tazki";

  return (
    <BillingCreateScreen
      companies={companies ?? []}
      subscriptions={subscriptions ?? []}
      products={(products ?? []).map((product) => ({
        ...product,
        base_price_uf: Number(product.base_price_uf ?? 0),
      }))}
      executives={executives ?? []}
      purchaseOrders={purchaseOrders ?? []}
      currencyRates={(currencyRates ?? []).map((rate) => ({
        ...rate,
        currency_code: rate.currency_code === "CLP" ? "CLP" : "UF",
        source_type: rate.source_type === "api" ? "api" : "manual",
        rate_value: Number(rate.rate_value ?? 0),
      }))}
      currentUserName={currentUserName}
      initialOrigin={initialOrigin}
    />
  );
}
