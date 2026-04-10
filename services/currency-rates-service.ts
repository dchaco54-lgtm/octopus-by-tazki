import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CurrencyCode, CurrencyRateRecord } from "@/modules/settings/currencies/types";

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function mapCurrencyRate(row: {
  id: string;
  currency_code: string;
  period_year: number;
  period_month: number;
  reference_date: string;
  rate_value: number | string;
  source_type: string;
  source_note: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}): CurrencyRateRecord {
  return {
    id: row.id,
    currency_code: row.currency_code === "CLP" ? "CLP" : "UF",
    period_year: row.period_year,
    period_month: row.period_month,
    reference_date: row.reference_date,
    rate_value: toNumber(row.rate_value),
    source_type: row.source_type === "api" ? "api" : "manual",
    source_note: row.source_note,
    is_active: row.is_active,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getPeriodFromDate(value: string) {
  const source = value.includes("T") ? value.slice(0, 10) : value;
  const [yearRaw, monthRaw] = source.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export async function listCurrencyRates() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("currency_rates")
    .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, source_note, is_active, created_by, updated_by, created_at, updated_at")
    .order("currency_code", { ascending: true })
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  return {
    rows: (data ?? []).map((row) => mapCurrencyRate(row)),
    error: error?.message ?? null,
  };
}

export async function getCurrencyRateForPeriod(currencyCode: CurrencyCode, period: { year: number; month: number }) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("currency_rates")
    .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, source_note, is_active, created_by, updated_by, created_at, updated_at")
    .eq("currency_code", currencyCode)
    .eq("period_year", period.year)
    .eq("period_month", period.month)
    .maybeSingle();

  if (error || !data) return null;
  return mapCurrencyRate(data);
}
