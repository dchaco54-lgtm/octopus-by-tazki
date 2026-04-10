import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ListContactsParams {
  q?: string;
  company_id?: string;
  active?: string;
}

export async function listContacts({ q, company_id, active }: ListContactsParams) {
  const supabase = await createServerSupabaseClient();
  const companySelect = "id, trade_name, legal_name, internal_code, rut";
  const buildBaseQuery = () => {
    let query = supabase
      .from("contacts")
      .select(`*, companies!contacts_company_id_fkey(${companySelect})`)
      .order("created_at", { ascending: false });

    if (company_id && company_id !== "all") {
      query = query.eq("company_id", company_id);
    }

    if (active && active !== "all") {
      query = query.eq("is_active", active === "true");
    }

    return query;
  };

  if (!q) {
    const { data } = await buildBaseQuery();
    return data ?? [];
  }

  const term = q.trim();
  const [directMatchesResponse, relatedCompaniesResponse] = await Promise.all([
    buildBaseQuery().or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`),
    supabase
      .from("companies")
      .select("id")
      .or(
        `internal_code.ilike.%${term}%,trade_name.ilike.%${term}%,legal_name.ilike.%${term}%,rut.ilike.%${term}%,company_email.ilike.%${term}%,phone.ilike.%${term}%,mobile_phone.ilike.%${term}%`
      ),
  ]);

  const directMatches = directMatchesResponse.data ?? [];
  const relatedCompanyIds = (relatedCompaniesResponse.data ?? []).map((company) => company.id);

  if (relatedCompanyIds.length === 0) {
    return directMatches;
  }

  const { data: relatedClientMatches } = await buildBaseQuery().in("company_id", relatedCompanyIds);
  const mergedContacts = [...directMatches, ...(relatedClientMatches ?? [])];
  const contactsById = new Map(mergedContacts.map((contact) => [contact.id, contact]));

  return [...contactsById.values()].sort((left, right) => {
    const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightDate - leftDate;
  });
}

export async function getContactById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("contacts")
    .select("*, companies!contacts_company_id_fkey(id, trade_name, legal_name, internal_code, rut)")
    .eq("id", id)
    .single();
  return data;
}

export async function listCompanyOptions() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("companies")
    .select("id, trade_name, legal_name, internal_code, rut")
    .order("trade_name", { ascending: true });
  return data ?? [];
}
