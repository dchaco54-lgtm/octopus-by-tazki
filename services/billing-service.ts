import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BillingInvoiceStatus = "draft" | "issued" | "pending_payment" | "paid" | "cancelled";
export type BillingPaymentStatus = "pending" | "paid";
export type BillingRecordOrigin = "tazki" | "externo";

export type BillingListRow = {
  id: string;
  number: string;
  origin: BillingRecordOrigin;
  source_system: string | null;
  can_delete: boolean;
  currency: "UF" | "CLP";
  service_period: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_clp: number;
  total_uf: number;
  uf_value_used: number;
  outstanding_amount: number;
  invoice_status: BillingInvoiceStatus;
  payment_status: BillingPaymentStatus;
  blocked_by_oc: boolean;
  blocked_by_hes: boolean;
  company: {
    id: string;
    trade_name: string | null;
    legal_name: string | null;
    rut: string | null;
    internal_code: string | null;
  } | null;
  subscription: {
    id: string;
    subscription_code: string | null;
    payment_terms_days: number | null;
    total_mrr_uf: number | null;
  } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BillingPaymentRow = {
  id: string;
  payment_date: string;
  payment_method: string;
  total_paid: number;
  created_at: string | null;
};

type BillingCompanyRelation =
  | {
      id: string;
      trade_name: string | null;
      legal_name: string | null;
      rut: string | null;
      internal_code: string | null;
    }
  | {
      id: string;
      trade_name: string | null;
      legal_name: string | null;
      rut: string | null;
      internal_code: string | null;
    }[]
  | null;

type BillingSubscriptionRelation =
  | {
      id: string;
      subscription_code: string | null;
      payment_terms_days: number | null;
      total_mrr_uf: number | string | null;
    }
  | {
      id: string;
      subscription_code: string | null;
      payment_terms_days: number | null;
      total_mrr_uf: number | string | null;
    }[]
  | null;

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function addDays(value: string | null, days: number) {
  if (!value) return null;
  const source = value.includes("T") ? value.slice(0, 10) : value;
  const date = new Date(`${source}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeCompanyRelation(value: BillingCompanyRelation) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeSubscriptionRelation(value: BillingSubscriptionRelation) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function deriveNumber(id: string, invoiceDate: string | null, servicePeriod: string | null, subscriptionCode: string | null) {
  if (subscriptionCode?.trim()) {
    const prefix = invoiceDate ? "FAC" : "BOR";
    return `${prefix}-${subscriptionCode.trim()}`;
  }

  if (servicePeriod?.trim()) {
    const compactPeriod = servicePeriod.replaceAll(/\s+/g, "").slice(0, 12).toUpperCase();
    const prefix = invoiceDate ? "FAC" : "BOR";
    return `${prefix}-${compactPeriod}`;
  }

  return `${invoiceDate ? "FAC" : "BOR"}-${id.slice(0, 8).toUpperCase()}`;
}

function deriveInvoiceStatus(row: {
  status: string;
}): BillingInvoiceStatus {
  if (row.status === "issued" || row.status === "pending_payment" || row.status === "paid" || row.status === "cancelled") {
    return row.status;
  }
  return "draft";
}

function deriveOutstandingAmount(row: {
  amount: number;
  total_uf?: number;
  status: string;
  outstanding_amount?: number | string | null;
}): number {
  if (row.outstanding_amount !== undefined && row.outstanding_amount !== null) {
    return toNumber(row.outstanding_amount);
  }
  if (row.status === "cancelled") return 0;
  if (row.status === "paid") return 0;
  return row.amount;
}

function derivePaymentStatus(outstandingAmount: number): BillingPaymentStatus {
  return outstandingAmount > 500 ? "pending" : "paid";
}

function canDeleteBillingRecord() {
  return true;
}

function mapBillingRow(row: {
  id: string;
  origin?: BillingRecordOrigin | null;
  source_system?: string | null;
  service_period?: string | null;
  invoice_number?: string | null;
  expected_invoice_date: string | null;
  actual_invoice_date: string | null;
  currency?: "UF" | "CLP" | null;
  due_date?: string | null;
  amount: number | string;
  total_clp?: number | string | null;
  total_uf?: number | string | null;
  uf_value_used?: number | string | null;
  outstanding_amount?: number | string | null;
  status: string;
  blocked_by_oc: boolean;
  blocked_by_hes: boolean;
  created_at: string | null;
  updated_at: string | null;
  companies: BillingCompanyRelation;
  subscriptions: BillingSubscriptionRelation;
}): BillingListRow {
  const company = normalizeCompanyRelation(row.companies);
  const subscription = normalizeSubscriptionRelation(row.subscriptions);
  const totalClp = toNumber(row.amount);
  const totalUf = toNumber(row.total_uf ?? subscription?.total_mrr_uf ?? 0);
  const invoiceDate = row.actual_invoice_date ?? row.expected_invoice_date;
  const dueDate = row.due_date ?? addDays(invoiceDate, subscription?.payment_terms_days ?? 30);
  const outstandingAmount =
    deriveOutstandingAmount({
      amount: totalClp,
      total_uf: totalUf,
      status: row.status,
      outstanding_amount: row.outstanding_amount,
    });
  const invoiceStatus = deriveInvoiceStatus(row);

  return {
    id: row.id,
    origin: row.origin === "externo" ? "externo" : "tazki",
    source_system: row.source_system ?? null,
    can_delete: canDeleteBillingRecord(),
    currency: row.currency === "UF" ? "UF" : "CLP",
    number: row.invoice_number?.trim() || deriveNumber(row.id, row.actual_invoice_date, row.service_period ?? null, subscription?.subscription_code ?? null),
    service_period: row.service_period ?? null,
    invoice_date: invoiceDate,
    due_date: dueDate,
    total_clp: toNumber(row.total_clp ?? totalClp),
    total_uf: totalUf,
    uf_value_used: toNumber(row.uf_value_used ?? 0),
    outstanding_amount: outstandingAmount,
    invoice_status: invoiceStatus,
    payment_status: derivePaymentStatus(outstandingAmount),
    blocked_by_oc: row.blocked_by_oc,
    blocked_by_hes: row.blocked_by_hes,
    company,
    subscription: subscription
      ? {
          ...subscription,
          total_mrr_uf: subscription.total_mrr_uf === null ? null : toNumber(subscription.total_mrr_uf),
        }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listBillingRecords() {
  const supabase = await createServerSupabaseClient();
  const richSelect = `
      id,
      origin,
      source_system,
      service_period,
      invoice_number,
      expected_invoice_date,
      actual_invoice_date,
      due_date,
      currency,
      amount,
      total_clp,
      total_uf,
      uf_value_used,
      outstanding_amount,
      status,
      blocked_by_oc,
      blocked_by_hes,
      created_at,
      updated_at,
      companies:companies!billing_records_company_id_fkey(id, trade_name, legal_name, rut, internal_code),
      subscriptions:subscriptions!billing_records_subscription_id_fkey(id, subscription_code, payment_terms_days, total_mrr_uf)
    `;
  const legacySelect = `
      id,
      origin,
      expected_invoice_date,
      actual_invoice_date,
      source_system,
      amount,
      status,
      blocked_by_oc,
      blocked_by_hes,
      created_at,
      updated_at,
      companies:companies!billing_records_company_id_fkey(id, trade_name, legal_name, rut, internal_code),
      subscriptions:subscriptions!billing_records_subscription_id_fkey(id, subscription_code, payment_terms_days, total_mrr_uf)
    `;

  let data: Array<Parameters<typeof mapBillingRow>[0]> | null = null;
  let error: { message: string } | null = null;

  const richResponse = await supabase.from("billing_records").select(richSelect).order("expected_invoice_date", { ascending: false });
  if (richResponse.error) {
    const fallbackResponse = await supabase.from("billing_records").select(legacySelect).order("expected_invoice_date", { ascending: false });
    data = fallbackResponse.data;
    error = fallbackResponse.error;
  } else {
    data = richResponse.data;
  }

  if (error) {
    return {
      rows: [] as BillingListRow[],
      error: error.message,
    };
  }

  return {
    rows: (data ?? []).map((row) => mapBillingRow(row)),
    error: null,
  };
}

export async function getBillingRecordById(id: string) {
  const supabase = await createServerSupabaseClient();
  const richSelect = `
      id,
      origin,
      source_system,
      service_period,
      invoice_number,
      expected_invoice_date,
      actual_invoice_date,
      due_date,
      currency,
      amount,
      total_clp,
      total_uf,
      uf_value_used,
      outstanding_amount,
      status,
      blocked_by_oc,
      blocked_by_hes,
      created_at,
      updated_at,
      companies:companies!billing_records_company_id_fkey(id, trade_name, legal_name, rut, internal_code),
      subscriptions:subscriptions!billing_records_subscription_id_fkey(id, subscription_code, payment_terms_days, total_mrr_uf)
    `;
  const legacySelect = `
      id,
      origin,
      expected_invoice_date,
      actual_invoice_date,
      source_system,
      amount,
      status,
      blocked_by_oc,
      blocked_by_hes,
      created_at,
      updated_at,
      companies:companies!billing_records_company_id_fkey(id, trade_name, legal_name, rut, internal_code),
      subscriptions:subscriptions!billing_records_subscription_id_fkey(id, subscription_code, payment_terms_days, total_mrr_uf)
    `;

  const richResponse = await supabase.from("billing_records").select(richSelect).eq("id", id).maybeSingle();
  let data: Parameters<typeof mapBillingRow>[0] | null = null;
  let error: { message: string } | null = null;

  if (richResponse.error) {
    const fallbackResponse = await supabase.from("billing_records").select(legacySelect).eq("id", id).maybeSingle();
    data = fallbackResponse.data as Parameters<typeof mapBillingRow>[0] | null;
    error = fallbackResponse.error;
  } else {
    data = richResponse.data as Parameters<typeof mapBillingRow>[0] | null;
  }

  if (error || !data) {
    return null;
  }

  const record = mapBillingRow(data);
  let payments: BillingPaymentRow[] = [];
  let dualTotals = {
    net_uf: record.total_uf,
    tax_uf: 0,
    total_uf: record.total_uf,
    net_clp: record.total_clp,
    tax_clp: 0,
    total_clp: record.total_clp,
  };

  try {
    const { data: paymentRows, error: paymentsError } = await supabase
      .from("billing_payments")
      .select("id, payment_date, payment_method, total_paid, created_at")
      .eq("billing_record_id", id)
      .order("payment_date", { ascending: false });

    if (!paymentsError) {
      payments = (paymentRows ?? []).map((row) => ({
        id: row.id,
        payment_date: row.payment_date,
        payment_method: row.payment_method,
        total_paid: toNumber(row.total_paid),
        created_at: row.created_at,
      }));
    }
  } catch {
    payments = [];
  }

  try {
    const { data: lineRows, error: linesError } = await supabase
      .from("billing_record_lines")
      .select("quantity, unit_price, tax_rate, subtotal, total")
      .eq("billing_record_id", id);

    if (!linesError && lineRows) {
      const base = (lineRows as Array<{
        quantity: number | string | null;
        unit_price: number | string | null;
        tax_rate: number | string | null;
        subtotal: number | string | null;
        total: number | string | null;
      }>).reduce(
        (acc, row) => {
          const subtotal = row.subtotal === null || row.subtotal === undefined ? toNumber(row.quantity) * toNumber(row.unit_price) : toNumber(row.subtotal);
          const total = row.total === null || row.total === undefined ? subtotal + subtotal * (toNumber(row.tax_rate) / 100) : toNumber(row.total);
          return {
            net: acc.net + subtotal,
            tax: acc.tax + (total - subtotal),
            total: acc.total + total,
          };
        },
        { net: 0, tax: 0, total: 0 }
      );

      dualTotals =
        record.currency === "UF"
          ? {
              net_uf: base.net,
              tax_uf: base.tax,
              total_uf: base.total,
              net_clp: record.uf_value_used > 0 ? base.net * record.uf_value_used : record.total_clp,
              tax_clp: record.uf_value_used > 0 ? base.tax * record.uf_value_used : 0,
              total_clp: record.uf_value_used > 0 ? base.total * record.uf_value_used : record.total_clp,
            }
          : {
              net_uf: record.uf_value_used > 0 ? base.net / record.uf_value_used : 0,
              tax_uf: record.uf_value_used > 0 ? base.tax / record.uf_value_used : 0,
              total_uf: record.uf_value_used > 0 ? base.total / record.uf_value_used : record.total_uf,
              net_clp: base.net,
              tax_clp: base.tax,
              total_clp: base.total,
            };
    }
  } catch {
    // Keep fallback totals when line-level detail is unavailable.
  }

  return {
    record: {
      ...record,
      dual_totals: dualTotals,
    },
    payments,
  };
}
