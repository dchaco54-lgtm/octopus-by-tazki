import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ListSubscriptionsParams {
  q?: string;
  status?: string;
}

interface SubscriptionCustomer {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
  rut: string | null;
  internal_code: string | null;
}

interface SubscriptionReference {
  id: string;
  subscription_code: string | null;
  total_mrr_uf: number | string | null;
}

interface SubscriptionExecutive {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface PricingStrategy {
  id: string;
  code: string | null;
  name: string | null;
}

interface RawSubscriptionRow {
  id: string;
  subscription_code: string | null;
  status: "demo" | "active" | "closed";
  close_reason: "churn" | "downsell" | "upsell" | "new" | null;
  start_date: string | null;
  end_date: string | null;
  next_billing_date: string | null;
  billing_type: "recurrente" | "no_recurrente" | null;
  recurrence: "mensual" | "trimestral" | "semestral" | "anual" | "custom" | null;
  channel: string | null;
  hubspot_deal_id: string | null;
  payer_name: string | null;
  payer_rut: string | null;
  total_mrr_uf: number | string | null;
  sales_owner_name: string | null;
  middleware_sync_status: string | null;
  middleware_last_event: string | null;
  middleware_last_synced_at: string | null;
  hubspot_sync_status: string | null;
  hubspot_last_synced_at: string | null;
  suspension_date: string | null;
  contracted_at: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  previous_subscription_id: string | null;
  pricing_strategy_id: string | null;
  sales_executive_id: string | null;
}

export interface SubscriptionListRow {
  id: string;
  subscription_code: string;
  status: RawSubscriptionRow["status"];
  close_reason: RawSubscriptionRow["close_reason"];
  start_date: string | null;
  end_date: string | null;
  next_billing_date: string | null;
  suspension_date: string | null;
  billing_type: string | null;
  recurrence: string | null;
  channel: string | null;
  hubspot_deal_id: string | null;
  payer_name: string | null;
  payer_rut: string | null;
  total_mrr_uf: number;
  delta_mrr_uf: number;
  movement_type: "new" | "expansion" | "contraction" | "churn" | "flat";
  sales_owner_name: string | null;
  middleware_sync_status: string | null;
  hubspot_sync_status: string | null;
  customer: SubscriptionCustomer | null;
  previous_subscription: SubscriptionReference | null;
  pricing_strategy: PricingStrategy | null;
  sales_executive: SubscriptionExecutive | null;
  contracted_plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionSummary {
  active_mrr_uf: number;
  new_revenue_uf: number;
  expansion_uf: number;
  contraction_uf: number;
  churn_uf: number;
}

export interface SubscriptionItemRow {
  id: string;
  description: string | null;
  quantity: number;
  unit_price_uf: number;
  total_price_uf: number;
  product_id: string | null;
  product_name: string | null;
  plan_name: string | null;
  product: {
    id: string;
    code: string | null;
    name: string | null;
  } | null;
}

export interface SubscriptionLogRow {
  id: string;
  event_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  delta_uf: number;
  created_at: string;
}

export interface SubscriptionSyncEventRow {
  id: string;
  provider: string;
  event_type: string;
  status: string;
  payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
}

export interface SubscriptionDetail {
  subscription: SubscriptionListRow & {
    contracted_at: string | null;
    suspension_date: string | null;
    middleware_last_event: string | null;
    middleware_last_synced_at: string | null;
    hubspot_last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  };
  items: SubscriptionItemRow[];
  logs: SubscriptionLogRow[];
  syncEvents: SubscriptionSyncEventRow[];
}

export type SubscriptionDetailResult =
  | { ok: true; data: SubscriptionDetail }
  | { ok: false; error: string };

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function computeDelta(currentMrr: number, previousMrr: number) {
  return Number((currentMrr - previousMrr).toFixed(2));
}

function computeMovementType(row: {
  status: RawSubscriptionRow["status"];
  close_reason: RawSubscriptionRow["close_reason"];
  currentMrr: number;
  previousMrr: number;
}) {
  if (row.status === "closed" && row.close_reason === "churn") {
    return "churn" as const;
  }

  if (row.previousMrr <= 0) {
    return "new" as const;
  }

  if (row.currentMrr > row.previousMrr) {
    return "expansion" as const;
  }

  if (row.currentMrr < row.previousMrr) {
    return "contraction" as const;
  }

  return "flat" as const;
}

function mapSubscriptionRow(
  row: RawSubscriptionRow,
  relationships: {
    customer: SubscriptionCustomer | null;
    previousSubscription: SubscriptionReference | null;
    pricingStrategy: PricingStrategy | null;
    salesExecutive: SubscriptionExecutive | null;
  }
): SubscriptionListRow {
  const currentMrr = toNumber(row.total_mrr_uf);
  const previousMrr = toNumber(relationships.previousSubscription?.total_mrr_uf);
  const deltaMrrUf = computeDelta(currentMrr, previousMrr);

  return {
    id: row.id,
    subscription_code: row.subscription_code ?? row.id.slice(0, 8).toUpperCase(),
    status: row.status,
    close_reason: row.close_reason,
    start_date: row.start_date,
    end_date: row.end_date,
    next_billing_date: row.next_billing_date,
    suspension_date: row.suspension_date,
    billing_type: row.billing_type,
    recurrence: row.recurrence,
    channel: row.channel,
    hubspot_deal_id: row.hubspot_deal_id,
    payer_name: row.payer_name,
    payer_rut: row.payer_rut,
    total_mrr_uf: currentMrr,
    delta_mrr_uf: deltaMrrUf,
    movement_type: computeMovementType({
      status: row.status,
      close_reason: row.close_reason,
      currentMrr,
      previousMrr,
    }),
    sales_owner_name: row.sales_owner_name,
    middleware_sync_status: row.middleware_sync_status,
    hubspot_sync_status: row.hubspot_sync_status,
    customer: relationships.customer,
    previous_subscription: relationships.previousSubscription,
    pricing_strategy: relationships.pricingStrategy,
    sales_executive: relationships.salesExecutive,
    contracted_plan: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildSummary(rows: SubscriptionListRow[]): SubscriptionSummary {
  return rows.reduce<SubscriptionSummary>(
    (summary, row) => {
      if (row.status === "active") {
        summary.active_mrr_uf += row.total_mrr_uf;
      }

      if (row.movement_type === "new" && row.status === "active") {
        summary.new_revenue_uf += row.total_mrr_uf;
      }

      if (row.movement_type === "expansion") {
        summary.expansion_uf += Math.max(row.delta_mrr_uf, 0);
      }

      if (row.movement_type === "contraction") {
        summary.contraction_uf += Math.abs(Math.min(row.delta_mrr_uf, 0));
      }

      if (row.movement_type === "churn") {
        summary.churn_uf += Math.max(row.previous_subscription ? Math.abs(row.delta_mrr_uf) : row.total_mrr_uf, row.total_mrr_uf);
      }

      return summary;
    },
    {
      active_mrr_uf: 0,
      new_revenue_uf: 0,
      expansion_uf: 0,
      contraction_uf: 0,
      churn_uf: 0,
    }
  );
}

export async function listSubscriptions({ q, status }: ListSubscriptionsParams = {}) {
  const supabase = await createServerSupabaseClient();
  const normalizedQuery = q?.trim();
  let query = supabase
    .from("subscriptions")
    .select(
      `
      id,
      subscription_code,
      status,
      close_reason,
      start_date,
      end_date,
      next_billing_date,
      suspension_date,
      billing_type,
      recurrence,
      channel,
      hubspot_deal_id,
      payer_name,
      payer_rut,
      total_mrr_uf,
      sales_owner_name,
      middleware_sync_status,
      hubspot_sync_status,
      created_at,
      updated_at,
      customer_id,
      previous_subscription_id,
      pricing_strategy_id,
      sales_executive_id
    `
    )
    .order("next_billing_date", { ascending: true });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (normalizedQuery) {
    const search = normalizedQuery.toLowerCase();

    const [customersResult, strategiesResult, executivesResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id")
        .or(`trade_name.ilike.%${search}%,legal_name.ilike.%${search}%,rut.ilike.%${search}%,internal_code.ilike.%${search}%`)
        .limit(250),
      supabase
        .from("pricing_strategies")
        .select("id")
        .or(`name.ilike.%${search}%,code.ilike.%${search}%`)
        .limit(250),
      supabase
        .from("user_profiles")
        .select("id")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(250),
    ]);

    const customerIds = (customersResult.data ?? []).map((row) => row.id);
    const strategyIds = (strategiesResult.data ?? []).map((row) => row.id);
    const executiveIds = (executivesResult.data ?? []).map((row) => row.id);

    // PostgREST `or` supports `in.(...)` filters inside the OR group.
    const orParts = [
      `subscription_code.ilike.%${search}%`,
      `hubspot_deal_id.ilike.%${search}%`,
      `channel.ilike.%${search}%`,
      customerIds.length > 0 ? `customer_id.in.(${customerIds.join(",")})` : null,
      strategyIds.length > 0 ? `pricing_strategy_id.in.(${strategyIds.join(",")})` : null,
      executiveIds.length > 0 ? `sales_executive_id.in.(${executiveIds.join(",")})` : null,
    ].filter(Boolean);

    query = query.or(orParts.join(","));
  }

  const { data, error } = await query;

  if (error) {
    return {
      rows: [] as SubscriptionListRow[],
      summary: buildSummary([]),
      error: error.message,
    };
  }

  const rawRows = (data ?? []) as RawSubscriptionRow[];
  const customerIds = Array.from(new Set(rawRows.map((row) => row.customer_id).filter((value): value is string => Boolean(value))));
  const pricingStrategyIds = Array.from(
    new Set(rawRows.map((row) => row.pricing_strategy_id).filter((value): value is string => Boolean(value)))
  );
  const salesExecutiveIds = Array.from(
    new Set(rawRows.map((row) => row.sales_executive_id).filter((value): value is string => Boolean(value)))
  );
  const previousSubscriptionIds = Array.from(
    new Set(rawRows.map((row) => row.previous_subscription_id).filter((value): value is string => Boolean(value)))
  );

  const subscriptionIds = rawRows.map((row) => row.id);

  const [customersResult, strategiesResult, executivesResult, previousSubscriptionsResult, itemsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase.from("companies").select("id, trade_name, legal_name, rut, internal_code").in("id", customerIds)
      : Promise.resolve({ data: [] as SubscriptionCustomer[] }),
    pricingStrategyIds.length > 0
      ? supabase.from("pricing_strategies").select("id, code, name").in("id", pricingStrategyIds)
      : Promise.resolve({ data: [] as PricingStrategy[] }),
    salesExecutiveIds.length > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", salesExecutiveIds)
      : Promise.resolve({ data: [] as SubscriptionExecutive[] }),
    previousSubscriptionIds.length > 0
      ? supabase.from("subscriptions").select("id, subscription_code, total_mrr_uf").in("id", previousSubscriptionIds)
      : Promise.resolve({ data: [] as SubscriptionReference[] }),
    subscriptionIds.length > 0
      ? supabase
          .from("subscription_items")
          .select(
            `
            subscription_id,
            product_name,
            created_at,
            product:products(id, name, category)
          `
          )
          .in("subscription_id", subscriptionIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({
          data: [] as Array<{
            subscription_id: string;
            product_name: string | null;
            created_at: string;
            product: {
              id: string;
              name: string | null;
              category: string | null;
            } | null;
          }>,
        }),
  ]);

  const customersById = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer]));
  const strategiesById = new Map((strategiesResult.data ?? []).map((strategy) => [strategy.id, strategy]));
  const executivesById = new Map((executivesResult.data ?? []).map((exec) => [exec.id, exec]));
  const previousSubscriptionsById = new Map((previousSubscriptionsResult.data ?? []).map((sub) => [sub.id, sub]));

  const planBySubscriptionId = new Map<string, string>();
  for (const item of (itemsResult.data ?? []) as Array<{
    subscription_id: string;
    product_name: string | null;
    product: { id: string; name: string | null; category: string | null } | null;
  }>) {
    const subId = item.subscription_id;
    if (!subId) continue;

    const current = planBySubscriptionId.get(subId);
    const itemName = item.product?.name ?? item.product_name ?? null;
    if (!itemName) continue;

    // Prefer category = plan. If we already picked a plan, keep it.
    const isPlan = item.product?.category === "plan";
    if (isPlan) {
      planBySubscriptionId.set(subId, itemName);
      continue;
    }

    // Fallback: first item (only if nothing set yet).
    if (!current) {
      planBySubscriptionId.set(subId, itemName);
    }
  }

  const mappedRows = rawRows.map((row) => {
    const mapped = mapSubscriptionRow(row, {
      customer: row.customer_id ? customersById.get(row.customer_id) ?? null : null,
      previousSubscription: row.previous_subscription_id
        ? previousSubscriptionsById.get(row.previous_subscription_id) ?? null
        : null,
      pricingStrategy: row.pricing_strategy_id ? strategiesById.get(row.pricing_strategy_id) ?? null : null,
      salesExecutive: row.sales_executive_id ? executivesById.get(row.sales_executive_id) ?? null : null,
    });
    mapped.contracted_plan = planBySubscriptionId.get(row.id) ?? null;
    return mapped;
  });
  const rows = mappedRows;

  return {
    rows,
    summary: buildSummary(rows),
    error: null as string | null,
  };
}

export async function getSubscriptionDetail(id: string): Promise<SubscriptionDetail | null> {
  const supabase = await createServerSupabaseClient();
  const subscriptionResult = await supabase.from("subscriptions").select("*").eq("id", id).maybeSingle();

  if (subscriptionResult.error) {
    return null;
  }

  if (!subscriptionResult.data) {
    return null;
  }

  const itemsResult = await supabase
    .from("subscription_items")
    .select("*")
    .eq("subscription_id", id)
    .order("created_at", { ascending: true });

  const logsResult = await supabase
    .from("subscription_logs")
    .select("id, event_type, field_changed, old_value, new_value, changed_by, delta_uf, created_at")
    .eq("subscription_id", id)
    .order("created_at", { ascending: false });

  const syncEventsResult = await supabase
    .from("subscription_sync_events")
    .select("id, provider, event_type, status, payload, response_payload, sent_at, created_at")
    .eq("subscription_id", id)
    .order("created_at", { ascending: false });

  const subscriptionRow = subscriptionResult.data as unknown as RawSubscriptionRow & {
    company_id?: string | null;
    customer_id?: string | null;
    previous_subscription_id?: string | null;
    pricing_strategy_id?: string | null;
    sales_executive_id?: string | null;
  };

  const customerId = subscriptionRow.customer_id ?? subscriptionRow.company_id ?? null;
  const previousSubscriptionId = subscriptionRow.previous_subscription_id ?? null;
  const pricingStrategyId = subscriptionRow.pricing_strategy_id ?? null;
  const salesExecutiveId = subscriptionRow.sales_executive_id ?? null;

  const [customerResult, previousSubscriptionResult, pricingStrategyResult, salesExecutiveResult] = await Promise.all([
    customerId
      ? supabase.from("companies").select("id, trade_name, legal_name, rut, internal_code").eq("id", customerId).maybeSingle()
      : Promise.resolve({ data: null as SubscriptionCustomer | null }),
    previousSubscriptionId
      ? supabase.from("subscriptions").select("id, subscription_code, total_mrr_uf").eq("id", previousSubscriptionId).maybeSingle()
      : Promise.resolve({ data: null as SubscriptionReference | null }),
    pricingStrategyId
      ? supabase.from("pricing_strategies").select("id, code, name").eq("id", pricingStrategyId).maybeSingle()
      : Promise.resolve({ data: null as PricingStrategy | null }),
    salesExecutiveId
      ? supabase.from("user_profiles").select("id, full_name, email").eq("id", salesExecutiveId).maybeSingle()
      : Promise.resolve({ data: null as SubscriptionExecutive | null }),
  ]);

  const mappedSubscription = mapSubscriptionRow(
    {
      ...subscriptionRow,
      customer_id: customerId,
      previous_subscription_id: previousSubscriptionId,
      pricing_strategy_id: pricingStrategyId,
      sales_executive_id: salesExecutiveId,
    } as RawSubscriptionRow,
    {
      customer: customerResult.data ?? null,
      previousSubscription: previousSubscriptionResult.data ?? null,
      pricingStrategy: pricingStrategyResult.data ?? null,
      salesExecutive: salesExecutiveResult.data ?? null,
    }
  );

  const rawItems = (itemsResult.data ?? []) as Array<{
    id: string;
    description?: string | null;
    quantity?: number | string | null;
    unit_price_uf?: number | string | null;
    total_price_uf?: number | string | null;
    product_id?: string | null;
    product_name?: string | null;
    plan_name?: string | null;
  }>;

  const productIds = Array.from(new Set(rawItems.map((item) => item.product_id).filter((value): value is string => Boolean(value))));
  const itemProductsResult =
    productIds.length > 0
      ? await supabase.from("products").select("id, code, name").in("id", productIds)
      : { data: [] as { id: string; code: string | null; name: string | null }[] };
  const productsById = new Map((itemProductsResult.data ?? []).map((product) => [product.id, product]));

  const subscriptionData = subscriptionResult.data as RawSubscriptionRow & {
    contracted_at?: string | null;
    suspension_date?: string | null;
    middleware_last_event?: string | null;
    middleware_last_synced_at?: string | null;
    hubspot_last_synced_at?: string | null;
    created_at: string;
    updated_at: string;
  };

  return {
    subscription: {
      ...mappedSubscription,
      contracted_at: subscriptionData.contracted_at ?? null,
      suspension_date: subscriptionData.suspension_date ?? null,
      middleware_last_event: subscriptionData.middleware_last_event ?? null,
      middleware_last_synced_at: subscriptionData.middleware_last_synced_at ?? null,
      hubspot_last_synced_at: subscriptionData.hubspot_last_synced_at ?? null,
      created_at: subscriptionData.created_at,
      updated_at: subscriptionData.updated_at,
    },
    items: rawItems.map((item) => ({
      id: item.id,
      description: item.description ?? null,
      quantity: toNumber(item.quantity),
      unit_price_uf: toNumber(item.unit_price_uf),
      total_price_uf: toNumber(item.total_price_uf),
      product_id: item.product_id ?? null,
      product_name: item.product_name ?? null,
      plan_name: item.plan_name ?? null,
      product: item.product_id ? productsById.get(item.product_id) ?? null : null,
    })),
    logs: logsResult.error
      ? []
      : (logsResult.data ?? []).map((log) => ({
          id: log.id,
          event_type: log.event_type,
          field_changed: log.field_changed,
          old_value: log.old_value,
          new_value: log.new_value,
          changed_by: log.changed_by,
          delta_uf: toNumber(log.delta_uf),
          created_at: log.created_at,
        })),
    syncEvents: syncEventsResult.error
      ? []
      : (syncEventsResult.data ?? []).map((event) => ({
          id: event.id,
          provider: event.provider,
          event_type: event.event_type,
          status: event.status,
          payload: (event.payload as Record<string, unknown> | null) ?? null,
          response_payload: (event.response_payload as Record<string, unknown> | null) ?? null,
          sent_at: event.sent_at,
          created_at: event.created_at,
        })),
  };
}

export async function getSubscriptionDetailSafe(id: string): Promise<SubscriptionDetailResult> {
  const supabase = await createServerSupabaseClient();
  const subscriptionResult = await supabase.from("subscriptions").select("*").eq("id", id).maybeSingle();

  if (subscriptionResult.error) {
    return { ok: false, error: subscriptionResult.error.message };
  }

  if (!subscriptionResult.data) {
    return { ok: false, error: "Suscripcion no encontrada o sin permisos para leerla." };
  }

  const detail = await getSubscriptionDetail(id);
  if (!detail) {
    return { ok: false, error: "No se pudo construir el detalle (schema legacy o cache desalineado)." };
  }

  return { ok: true, data: detail };
}
