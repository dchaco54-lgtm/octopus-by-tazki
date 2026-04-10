"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CurrencyRateActionResult, CurrencyRateRecord, CurrencyRateUpsertInput } from "@/modules/settings/currencies/types";

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

async function getAuthorizedProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, error: "Debes iniciar sesion para administrar monedas." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false as const, error: "No se encontro tu perfil interno para configurar monedas." };
  }

  if (profile.role !== "admin" && profile.role !== "editor") {
    return { ok: false as const, error: "No tienes permisos para administrar monedas." };
  }

  return { ok: true as const, supabase, profileId: profile.id };
}

function validateInput(input: CurrencyRateUpsertInput) {
  if (input.currencyCode !== "UF" && input.currencyCode !== "CLP") {
    return "La moneda debe ser UF o CLP.";
  }
  if (!Number.isInteger(input.periodYear) || input.periodYear < 2000 || input.periodYear > 2100) {
    return "Debes ingresar un anio valido.";
  }
  if (!Number.isInteger(input.periodMonth) || input.periodMonth < 1 || input.periodMonth > 12) {
    return "El mes debe estar entre 1 y 12.";
  }
  if (!input.referenceDate) {
    return "La fecha de referencia es obligatoria.";
  }
  if (!Number.isFinite(input.rateValue) || input.rateValue <= 0) {
    return "El valor debe ser mayor a 0.";
  }
  if (input.sourceType !== "manual" && input.sourceType !== "api") {
    return "El origen debe ser manual o api.";
  }

  return null;
}

function revalidateCurrencyViews() {
  revalidatePath("/settings");
  revalidatePath("/settings/currencies");
  revalidatePath("/billing");
  revalidatePath("/billing/new");
}

export async function upsertCurrencyRateAction(input: CurrencyRateUpsertInput): Promise<CurrencyRateActionResult> {
  const validationError = validateInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const auth = await getAuthorizedProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const payload = {
    currency_code: input.currencyCode,
    period_year: input.periodYear,
    period_month: input.periodMonth,
    reference_date: input.referenceDate,
    rate_value: Number(input.rateValue.toFixed(6)),
    source_type: input.sourceType,
    source_note: input.sourceNote.trim() || null,
    is_active: input.isActive,
    updated_by: auth.profileId,
  };

  const query = input.id
    ? auth.supabase
        .from("currency_rates")
        .update(payload)
        .eq("id", input.id)
        .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, source_note, is_active, created_by, updated_by, created_at, updated_at")
        .single()
    : auth.supabase
        .from("currency_rates")
        .insert({
          ...payload,
          created_by: auth.profileId,
        })
        .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, source_note, is_active, created_by, updated_by, created_at, updated_at")
        .single();

  const { data, error } = await query;
  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: `Ya existe un valor ${input.currencyCode} para ${input.periodMonth}/${input.periodYear}.` };
    }

    return { ok: false, error: error?.message ?? "No fue posible guardar el valor de moneda." };
  }

  revalidateCurrencyViews();

  return {
    ok: true,
    message: input.id ? "Valor de moneda actualizado." : "Valor de moneda creado.",
    rate: mapCurrencyRate(data),
  };
}

export async function deactivateCurrencyRateAction(id: string): Promise<CurrencyRateActionResult> {
  const auth = await getAuthorizedProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("currency_rates")
    .update({
      is_active: false,
      updated_by: auth.profileId,
    })
    .eq("id", id)
    .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, source_note, is_active, created_by, updated_by, created_at, updated_at")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No fue posible desactivar el valor." };
  }

  revalidateCurrencyViews();

  return {
    ok: true,
    message: "Valor desactivado.",
    rate: mapCurrencyRate(data),
  };
}
