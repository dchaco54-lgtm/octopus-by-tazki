import { createServerSupabaseClient } from "@/lib/supabase/server";

type SubscriptionRow = {
  id: string;
  status: "demo" | "active" | "closed";
  close_reason: "churn" | "downsell" | "upsell" | "new" | null;
  start_date: string | null;
  end_date: string | null;
  previous_subscription_id: string | null;
  change_type: "upsell" | "downsell" | "renewal" | "new" | null;
  customer_id: string | null;
  company_id: string | null;
};

type SubscriptionItemRow = {
  subscription_id: string;
  created_at?: string | null;
  total_price_uf: number | string | null;
  product:
    | {
        id: string;
        category: string | null;
        billing_type: "recurrente" | "no_recurrente" | null;
        affects_mrr: boolean | null;
        affects_revenue: boolean | null;
      }
    | Array<{
        id: string;
        category: string | null;
        billing_type: "recurrente" | "no_recurrente" | null;
        affects_mrr: boolean | null;
        affects_revenue: boolean | null;
      }>
    | null;
};

export type MrrRevenueMonthPoint = {
  year: number;
  month: number; // 1-12
  mrr_end_uf: number;
  active_clients: number;

  new_uf: number;
  upsell_uf: number;
  downsell_uf: number;
  churn_uf: number;

  saas_subscription_uf: number;
  expansion_uf: number;
  implementation_uf: number;
  consulting_uf: number;
  total_revenue_uf: number;
};

function toNumber(value: number | string | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function isoDate(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function endOfMonthISO(y: number, m1: number) {
  // JS month is 0-based; using day 0 gives last day of previous month.
  const dt = new Date(Date.UTC(y, m1, 0));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthIndex(dateISO: string) {
  const [y, m] = dateISO.split("-").map((v) => Number(v));
  if (!y || !m) return null;
  return { year: y, month: m };
}

function isActiveAt(sub: SubscriptionRow, snapshotISO: string) {
  if (!sub.start_date) return false;
  // Inclusive start, exclusive end (end_date = start_date of new subscription).
  if (sub.start_date > snapshotISO) return false;
  if (sub.end_date && sub.end_date <= snapshotISO) return false;
  // Demo never counts to MRR.
  if (sub.status === "demo") return false;
  return true;
}

type SubscriptionAgg = {
  mrr_total: number;
  saas_total: number;
  expansion_total: number;
  implementation_total: number;
  consulting_total: number;
};

function emptyAgg(): SubscriptionAgg {
  return { mrr_total: 0, saas_total: 0, expansion_total: 0, implementation_total: 0, consulting_total: 0 };
}

function classifyItem(item: SubscriptionItemRow) {
  const product = Array.isArray(item.product) ? item.product[0] ?? null : item.product;
  const amount = toNumber(item.total_price_uf);
  const category = (product?.category ?? "").toLowerCase();
  const billingType = product?.billing_type ?? null;
  const affectsMrr = Boolean(product?.affects_mrr);
  const affectsRevenue = product?.affects_revenue ?? true;

  const isRecurring = billingType === "recurrente" && affectsMrr;
  const isOneTime = billingType === "no_recurrente" && affectsRevenue;

  if (isRecurring) {
    const isPlan = category === "plan";
    const isAddon = category === "addon";
    return {
      kind: "mrr" as const,
      amount,
      saas: isPlan ? amount : 0,
      expansion: isAddon ? amount : 0,
    };
  }

  if (isOneTime) {
    const isImplementation = category === "implementation" || category === "one_time";
    const isConsulting = category === "service" || category === "support" || category === "legacy";
    return {
      kind: "one_time" as const,
      amount,
      implementation: isImplementation ? amount : 0,
      consulting: isConsulting ? amount : 0,
    };
  }

  return { kind: "ignored" as const, amount: 0 };
}

async function fetchSubsAndAggs({
  supabase,
  subscriptionIds,
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  subscriptionIds: string[];
}) {
  const subsById = new Map<string, SubscriptionRow>();
  const aggsById = new Map<string, SubscriptionAgg>();
  const oneTimeByMonth = new Map<string, { implementation: number; consulting: number }>();

  if (subscriptionIds.length === 0) return { subsById, aggsById, oneTimeByMonth };

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id,status,close_reason,start_date,end_date,previous_subscription_id,change_type,customer_id,company_id")
    .in("id", subscriptionIds);

  for (const s of (subs ?? []) as SubscriptionRow[]) {
    subsById.set(s.id, s);
    aggsById.set(s.id, emptyAgg());
  }

  const { data: items } = await supabase
    .from("subscription_items")
    .select(
      `
      subscription_id,
      created_at,
      total_price_uf,
      product:products(id, category, billing_type, affects_mrr, affects_revenue)
    `
    )
    .in("subscription_id", subscriptionIds);

  for (const item of (items ?? []) as SubscriptionItemRow[]) {
    const subId = item.subscription_id;
    if (!subId) continue;
    const agg = aggsById.get(subId) ?? emptyAgg();
    const c = classifyItem(item);

    if (c.kind === "mrr") {
      agg.mrr_total += c.amount;
      agg.saas_total += c.saas;
      agg.expansion_total += c.expansion;
    } else if (c.kind === "one_time") {
      agg.implementation_total += c.implementation;
      agg.consulting_total += c.consulting;

      const created = (item.created_at ?? "").slice(0, 10);
      const mi = created ? monthIndex(created) : null;
      if (mi) {
        const key = `${mi.year}-${String(mi.month).padStart(2, "0")}`;
        const prev = oneTimeByMonth.get(key) ?? { implementation: 0, consulting: 0 };
        oneTimeByMonth.set(key, {
          implementation: prev.implementation + c.implementation,
          consulting: prev.consulting + c.consulting,
        });
      }
    }

    aggsById.set(subId, agg);
  }

  // Round to 2 decimals to match UF expectations.
  for (const [id, agg] of aggsById.entries()) {
    aggsById.set(id, {
      mrr_total: Number(agg.mrr_total.toFixed(2)),
      saas_total: Number(agg.saas_total.toFixed(2)),
      expansion_total: Number(agg.expansion_total.toFixed(2)),
      implementation_total: Number(agg.implementation_total.toFixed(2)),
      consulting_total: Number(agg.consulting_total.toFixed(2)),
    });
  }

  // Round one-time monthly buckets.
  for (const [k, v] of oneTimeByMonth.entries()) {
    oneTimeByMonth.set(k, {
      implementation: Number(v.implementation.toFixed(2)),
      consulting: Number(v.consulting.toFixed(2)),
    });
  }

  return { subsById, aggsById, oneTimeByMonth };
}

export async function getMrrRevenueSeriesByYear(year: number): Promise<MrrRevenueMonthPoint[]> {
  const supabase = await createServerSupabaseClient();

  const yearStart = isoDate(year, 1, 1);
  const yearEnd = isoDate(year, 12, 31);

  // Fetch subscriptions that intersect the year range (for snapshot) plus movements in-year.
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id,status,close_reason,start_date,end_date,previous_subscription_id,change_type,customer_id,company_id")
    .or(
      [
        `start_date.gte.${yearStart},start_date.lte.${yearEnd}`,
        `end_date.gte.${yearStart},end_date.lte.${yearEnd}`,
        `end_date.is.null,start_date.lte.${yearEnd}`,
      ].join(",")
    )
    .order("start_date", { ascending: true });

  if (error) {
    return Array.from({ length: 12 }, (_, i) => ({
      year,
      month: i + 1,
      mrr_end_uf: 0,
      active_clients: 0,
      new_uf: 0,
      upsell_uf: 0,
      downsell_uf: 0,
      churn_uf: 0,
      expansion_uf: 0,
      saas_subscription_uf: 0,
      implementation_uf: 0,
      consulting_uf: 0,
      total_revenue_uf: 0,
    }));
  }

  const rows = (subs ?? []) as SubscriptionRow[];
  const rowIds = rows.map((r) => r.id);

  const previousIds = Array.from(new Set(rows.map((r) => r.previous_subscription_id).filter((v): v is string => Boolean(v))));
  const missingPrevIds = previousIds.filter((id) => !rowIds.includes(id));

  const { aggsById: aggsInScope, oneTimeByMonth } = await fetchSubsAndAggs({ supabase, subscriptionIds: rowIds });
  const prevFetch = missingPrevIds.length > 0 ? await fetchSubsAndAggs({ supabase, subscriptionIds: missingPrevIds }) : null;
  const prevAggsById = prevFetch?.aggsById ?? new Map<string, SubscriptionAgg>();

  const allAggsById = new Map<string, SubscriptionAgg>([...aggsInScope.entries(), ...prevAggsById.entries()]);

  const points: MrrRevenueMonthPoint[] = Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    mrr_end_uf: 0,
    active_clients: 0,
    new_uf: 0,
    upsell_uf: 0,
    downsell_uf: 0,
    churn_uf: 0,
    saas_subscription_uf: 0,
    expansion_uf: 0,
    implementation_uf: 0,
    consulting_uf: 0,
    total_revenue_uf: 0,
  }));

  for (const p of points) {
    const snapshot = endOfMonthISO(year, p.month);
    const activeSubs = rows.filter((s) => isActiveAt(s, snapshot));
    p.mrr_end_uf = activeSubs.reduce((sum, s) => sum + (allAggsById.get(s.id)?.mrr_total ?? 0), 0);
    p.saas_subscription_uf = activeSubs.reduce((sum, s) => sum + (allAggsById.get(s.id)?.saas_total ?? 0), 0);
    p.expansion_uf = activeSubs.reduce((sum, s) => sum + (allAggsById.get(s.id)?.expansion_total ?? 0), 0);

    const clientIds = new Set<string>();
    for (const s of activeSubs) {
      const cid = (s.customer_id ?? s.company_id ?? "").trim();
      if (cid) clientIds.add(cid);
    }
    p.active_clients = clientIds.size;
  }

  // One-time revenue is attributed to the month when the item was created.
  for (const p of points) {
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    const ot = oneTimeByMonth.get(key);
    if (!ot) continue;
    p.implementation_uf += ot.implementation;
    p.consulting_uf += ot.consulting;
  }

  // Movements (new/upsell/downsell) are based on start_date in month.
  // - prioritize change_type
  // - delta is fallback
  // - upsell/downsell report delta only
  // - new reports full new recurring amount
  for (const s of rows) {
    if (!s.start_date) continue;
    const mi = monthIndex(s.start_date);
    if (!mi || mi.year !== year) continue;
    if (s.status === "demo") continue;

    const bucket = points[mi.month - 1];
    const currentAgg = allAggsById.get(s.id) ?? emptyAgg();
    const prevAgg = s.previous_subscription_id ? allAggsById.get(s.previous_subscription_id) ?? emptyAgg() : emptyAgg();
    const delta = Number((currentAgg.mrr_total - prevAgg.mrr_total).toFixed(2));

    const changeType = (s.change_type ?? "").toLowerCase();
    const inferred = delta > 0 ? "upsell" : delta < 0 ? "downsell" : "new";
    const movement =
      changeType === "upsell" || changeType === "downsell" || changeType === "new"
        ? changeType
        : s.previous_subscription_id
          ? inferred
          : "new";

    if (movement === "new") {
      bucket.new_uf += currentAgg.mrr_total;
    } else if (movement === "upsell") {
      const d = Math.max(0, delta);
      bucket.upsell_uf += d;
    } else if (movement === "downsell") {
      const d = Math.abs(Math.min(0, delta));
      bucket.downsell_uf += d;
    }
  }

  // Churn is based on end_date month when close_reason=churn.
  // Business rule: churn is reported on the 1st of the next month; we store that in end_date.
  for (const s of rows) {
    if (!s.end_date) continue;
    const mi = monthIndex(s.end_date);
    if (!mi || mi.year !== year) continue;
    if (s.close_reason !== "churn") continue;
    if (s.status === "demo") continue;
    const bucket = points[mi.month - 1];
    const agg = allAggsById.get(s.id) ?? emptyAgg();
    bucket.churn_uf += agg.mrr_total;
  }

  for (const p of points) {
    p.total_revenue_uf = Number((p.saas_subscription_uf + p.expansion_uf + p.implementation_uf + p.consulting_uf).toFixed(2));
    p.mrr_end_uf = Number(p.mrr_end_uf.toFixed(2));
    p.active_clients = Math.trunc(p.active_clients);
    p.new_uf = Number(p.new_uf.toFixed(2));
    p.upsell_uf = Number(p.upsell_uf.toFixed(2));
    p.downsell_uf = Number(p.downsell_uf.toFixed(2));
    p.churn_uf = Number(p.churn_uf.toFixed(2));
    p.saas_subscription_uf = Number(p.saas_subscription_uf.toFixed(2));
    p.expansion_uf = Number(p.expansion_uf.toFixed(2));
    p.implementation_uf = Number(p.implementation_uf.toFixed(2));
    p.consulting_uf = Number(p.consulting_uf.toFixed(2));
  }

  return points;
}
