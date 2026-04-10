import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ListClientsParams {
  q?: string;
  search_by?: string;
  name?: string;
  company?: string;
  company_id?: string;
  email?: string;
  phone?: string;
  purchase_order?: string;
}

export async function listClients(params: ListClientsParams = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("companies").select("*").order("created_at", { ascending: false });

  const applyCompanySearch = (searchExpression: string) => {
    query = query.or(searchExpression);
  };

  const applyTextFilter = (field: string, term: string) => {
    if (field === "name" || field === "company") {
      applyCompanySearch(`legal_name.ilike.%${term}%,trade_name.ilike.%${term}%`);
      return;
    }
    if (field === "company_id") {
      query = query.ilike("internal_code", `%${term}%`);
      return;
    }
    if (field === "email") {
      applyCompanySearch(`company_email.ilike.%${term}%,billing_email.ilike.%${term}%,dte_email.ilike.%${term}%`);
      return;
    }
    if (field === "phone") {
      applyCompanySearch(`phone.ilike.%${term}%,mobile_phone.ilike.%${term}%`);
      return;
    }
    applyCompanySearch(
      `legal_name.ilike.%${term}%,trade_name.ilike.%${term}%,internal_code.ilike.%${term}%,rut.ilike.%${term}%,company_email.ilike.%${term}%,billing_email.ilike.%${term}%,dte_email.ilike.%${term}%,phone.ilike.%${term}%,mobile_phone.ilike.%${term}%`
    );
  };

  if (params.q) {
    if (params.search_by && params.search_by !== "purchase_order") {
      applyTextFilter(params.search_by, params.q);
    } else if (!params.search_by) {
      applyTextFilter("all", params.q);
    }
  } else {
    if (params.name) applyTextFilter("name", params.name);
    if (params.company) applyTextFilter("company", params.company);
    if (params.company_id) applyTextFilter("company_id", params.company_id);
    if (params.email) applyTextFilter("email", params.email);
    if (params.phone) applyTextFilter("phone", params.phone);
  }

  const { data } = await query;
  let clients = data ?? [];

  const purchaseOrderTerm = params.search_by === "purchase_order" && params.q ? params.q : params.purchase_order;
  if (purchaseOrderTerm) {
    const { data: purchaseOrders } = await supabase
      .from("client_purchase_orders")
      .select("client_id, purchase_order_number")
      .ilike("purchase_order_number", `%${purchaseOrderTerm}%`);
    const ids = new Set((purchaseOrders ?? []).map((po) => po.client_id));

    if (params.search_by === "purchase_order") {
      clients = clients.filter((client) => ids.has(client.id));
    } else if (params.q && !params.search_by) {
      const currentIds = new Set(clients.map((client) => client.id));
      const missingIds = [...ids].filter((id) => !currentIds.has(id));
      if (missingIds.length > 0) {
        const { data: extraClients } = await supabase.from("companies").select("*").in("id", missingIds);
        clients = [...clients, ...(extraClients ?? [])];
      }
    } else {
      clients = clients.filter((client) => ids.has(client.id));
    }
  }

  return clients;
}

export async function getClientById(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: client } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!client) return null;

  const [payerResponse, contactsResponse, internalContactsResponse, purchaseOrdersResponse, notesResponse, activityResponse] = await Promise.all([
    client.payer_client_id
      ? supabase.from("companies").select("id, trade_name, rut").eq("id", client.payer_client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("client_contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_internal_contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_purchase_orders").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("client_activity_logs").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  return {
    client,
    payer: payerResponse.data,
    contacts: contactsResponse.data ?? [],
    internalContacts: internalContactsResponse.data ?? [],
    purchaseOrders: purchaseOrdersResponse.data ?? [],
    notes: notesResponse.data ?? [],
    activityLogs: activityResponse.data ?? [],
  };
}

export async function listClientPayerOptions() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("companies").select("id, trade_name, rut").order("trade_name", { ascending: true });
  return data ?? [];
}
