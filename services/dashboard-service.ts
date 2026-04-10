import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardMetrics } from "@/types/entities";

const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createServerSupabaseClient();

  const [
    activeClientsResponse,
    activeSubscriptionsResponse,
    suspendedSubscriptionsResponse,
    pendingBillingResponse,
    monthlyBillingResponse,
    openOpportunitiesResponse,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").not("suspension_date", "is", null),
    supabase.from("billing_records").select("amount,status").eq("status", "pending_payment"),
    supabase.from("billing_records").select("amount,actual_invoice_date").gte("actual_invoice_date", startOfMonth),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).in("stage", ["open", "proposal", "negotiation"]),
  ]);

  const pendingBilling = (pendingBillingResponse.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const monthlyBilling = (monthlyBillingResponse.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    activeClients: activeClientsResponse.count ?? 0,
    activeSubscriptions: activeSubscriptionsResponse.count ?? 0,
    suspendedSubscriptions: suspendedSubscriptionsResponse.count ?? 0,
    pendingBilling,
    monthlyBilling,
    openOpportunities: openOpportunitiesResponse.count ?? 0,
  };
}

export async function getPendingBillingRows() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("billing_records")
    .select("id, amount, status, expected_invoice_date")
    .order("expected_invoice_date", { ascending: true })
    .limit(8);

  return (data ?? []).map((row) => ({
    ...row,
    service_period: row.expected_invoice_date ? row.expected_invoice_date.slice(0, 7) : "-",
  }));
}
