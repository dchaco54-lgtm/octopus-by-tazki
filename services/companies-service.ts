import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ListCompaniesParams {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function listCompanies({ q, status, from, to }: ListCompaniesParams) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("companies").select("*").order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`legal_name.ilike.%${q}%,trade_name.ilike.%${q}%,rut.ilike.%${q}%`);
  }

  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }

  if (to) {
    const endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt("created_at", endDate.toISOString());
  }

  const { data } = await query;
  return data ?? [];
}

export async function getCompanyById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("companies").select("*").eq("id", id).single();
  return data;
}

export async function getCompanyDetail(id: string) {
  const supabase = await createServerSupabaseClient();

  const [companyResult, contactsResult, subscriptionsResult] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).single(),
    supabase.from("contacts").select("id, first_name, last_name, email, role, is_primary, is_active").eq("company_id", id),
    supabase
      .from("subscriptions")
      .select("id, subscription_code, total_mrr_uf, status, recurrence, next_billing_date")
      .or(`customer_id.eq.${id},company_id.eq.${id}`)
      .order("next_billing_date", { ascending: true }),
  ]);

  return {
    company: companyResult.data,
    contacts: contactsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
  };
}
