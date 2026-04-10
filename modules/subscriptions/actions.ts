"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getNextFreeSubscriptionCode(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  // Best-effort: pick the smallest missing SUB### so deleting a subscription frees the number.
  const { data, error } = await supabase.from("subscriptions").select("subscription_code").not("subscription_code", "is", null);
  if (error) return null;

  const used = new Set<number>();
  for (const row of data ?? []) {
    const code = (row as { subscription_code: string | null }).subscription_code ?? "";
    const m = /^SUB0*([0-9]+)$/i.exec(code.trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) used.add(n);
  }

  let next = 1;
  while (used.has(next)) next += 1;
  return `SUB${String(next).padStart(3, "0")}`;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value.trim() : "")).filter((value) => value.length > 0);
}

function getNumber(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRecurrenceToLegacyBillingPeriod(recurrence: string) {
  const value = (recurrence || "").trim().toLowerCase();
  // `billing_period` (legacy) has a strict check constraint in some DBs.
  // Map Spanish recurrence to common legacy tokens.
  if (value === "monthly" || value === "quarterly" || value === "yearly" || value === "custom") return value;
  if (value === "mensual") return "monthly";
  if (value === "trimestral") return "quarterly";
  // Legacy constraint doesn't include semiannual, so we store it as custom.
  if (value === "semestral" || value === "semiannual" || value === "semestralmente") return "custom";
  // Legacy uses `yearly` (not `annual`).
  if (value === "anual" || value === "annual") return "yearly";
  if (value === "custom") return "custom";
  return "monthly";
}

async function requireEditorRole() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false as const, error: userError.message };
  }

  if (!user) {
    return { ok: false as const, error: "No autenticado" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, error: profileError.message };
  }

  const role = profile?.role ?? "basic";
  if (role !== "admin" && role !== "editor") {
    return { ok: false as const, error: "Sin permisos para gestionar suscripciones" };
  }

  return { ok: true as const, supabase, changedBy: profile?.email ?? user.email ?? null };
}

export async function createSubscriptionAction(formData: FormData) {
  const customerId = getString(formData, "customer_id");
  const status = getString(formData, "status") || "active";
  const closeReason = getString(formData, "close_reason") || null;
  const billingType = getString(formData, "billing_type") || "recurrente";
  const recurrence = getString(formData, "recurrence") || "mensual";
  const startDate = getString(formData, "start_date");
  const nextBillingDate = getString(formData, "next_billing_date") || null;
  const hubspotDealId = getString(formData, "hubspot_deal_id") || null;
  const pricingStrategyId = getString(formData, "pricing_strategy_id") || null;
  const salesExecutiveId = getString(formData, "sales_executive_id") || null;
  const channel = getString(formData, "channel") || null;
  const payerName = getString(formData, "payer_name") || null;
  const payerRut = getString(formData, "payer_rut") || null;
  const previousSubscriptionId = getString(formData, "previous_subscription_id") || null;
  const movement = getString(formData, "movement") || "";
  const changeType = movement === "upsell" || movement === "downsell" || movement === "renewal" ? movement : "new";

  const productIds = getStringArray(formData, "product_id[]");
  const quantitiesRaw = getStringArray(formData, "quantity[]");
  const unitPricesRaw = getStringArray(formData, "unit_price_uf[]");
  const descriptions = formData.getAll("description[]").map((value) => (typeof value === "string" ? value.trim() : ""));

  if (!customerId) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Cliente requerido")}`);
  }

  if (!startDate) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Fecha de inicio requerida")}`);
  }

  if ((changeType === "upsell" || changeType === "downsell") && !previousSubscriptionId) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Upsell/Downsell requiere una suscripcion previa")}`);
  }

  // Build item rows from parallel arrays (skip empty rows).
  const rawRows = productIds.map((productId, index) => ({
    productId,
    quantity: getNumber(quantitiesRaw[index] ?? "1") || 1,
    unitPriceUf: getNumber(unitPricesRaw[index] ?? "0"),
    description: descriptions[index] ?? "",
  }));

  const itemRows = rawRows.filter((row) => row.productId.length > 0);

  if (itemRows.length === 0) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Debes agregar al menos un producto con precio en UF")}`);
  }

  const invalidPrice = itemRows.find((row) => row.unitPriceUf <= 0);
  if (invalidPrice) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Cada item debe tener un precio UF mayor a 0")}`);
  }

  const supabase = await createServerSupabaseClient();
  const subscriptionCode = await getNextFreeSubscriptionCode(supabase);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, code, name, category")
    .in(
      "id",
      itemRows.map((row) => row.productId)
    );

  if (productsError) {
    redirect(`/subscriptions/new?error=${encodeURIComponent(productsError.message)}`);
  }

  const productsById = new Map((products ?? []).map((product) => [product.id, product]));
  const missingProduct = itemRows.find((row) => !productsById.has(row.productId));
  if (missingProduct) {
    redirect(`/subscriptions/new?error=${encodeURIComponent("Producto no encontrado")}`);
  }

  const itemPayload = itemRows.map((row) => {
    const product = productsById.get(row.productId)!;
    const totalPriceUf = Number((row.quantity * row.unitPriceUf).toFixed(2));

    return {
      product_id: product.id,
      product_name: product.name,
      plan_name: product.code,
      description: row.description || `${product.code} · ${product.name}`,
      quantity: row.quantity,
      unit_price_uf: row.unitPriceUf,
      total_price_uf: totalPriceUf,
    };
  });

  const totalMrrUf = itemPayload.reduce((sum, row) => sum + Number(row.total_price_uf ?? 0), 0);

  const computedCloseReason =
    status === "closed"
      ? closeReason
      : null;

  // Legacy columns compatibility:
  // - `company_id` points to companies (same as `customer_id` in current model).
  // - `billing_period` is NOT NULL in some environments.
  // - `amount` is NOT NULL in some environments; we mirror MRR UF for now.
  const legacyBillingPeriod = mapRecurrenceToLegacyBillingPeriod(recurrence || "mensual");
  const legacyAmount = Number.isFinite(totalMrrUf) && totalMrrUf > 0 ? totalMrrUf : 0.01;

  const baseSubscriptionInsert = {
    subscription_code: subscriptionCode,
    company_id: customerId,
    customer_id: customerId,
    previous_subscription_id: previousSubscriptionId,
    product_id: itemPayload[0]?.product_id ?? null,
    start_date: startDate,
    end_date: null,
    status,
    close_reason: computedCloseReason,
    billing_type: billingType,
    recurrence,
    hubspot_deal_id: hubspotDealId,
    pricing_strategy_id: pricingStrategyId,
    sales_executive_id: salesExecutiveId,
    channel: channel ?? (changeType === "upsell" || changeType === "downsell" ? changeType : null),
    payer_name: payerName,
    payer_rut: payerRut,
    total_mrr_uf: totalMrrUf,
    next_billing_date: nextBillingDate,
    change_type: changeType,
    billing_period: legacyBillingPeriod,
    amount: legacyAmount,
    currency: "UF",
  };

  let insertedSubscription: { id: string } | null = null;
  let subscriptionError: { message: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nextCode = attempt === 0 ? subscriptionCode : await getNextFreeSubscriptionCode(supabase);
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({ ...baseSubscriptionInsert, subscription_code: nextCode })
      .select("id")
      .single();

    if (!error) {
      insertedSubscription = data;
      subscriptionError = null;
      break;
    }

    subscriptionError = error;
    const msg = (error.message ?? "").toLowerCase();
    const isCodeDuplicate =
      msg.includes("subscription_code") &&
      (msg.includes("duplicate") || msg.includes("unique") || msg.includes("idx_subscriptions_subscription_code_unique"));

    if (!isCodeDuplicate) break;
  }

  if (subscriptionError) {
    const extra =
      subscriptionError.message.includes("billing_period")
        ? ` (billing_period=${legacyBillingPeriod})`
        : "";
    redirect(`/subscriptions/new?error=${encodeURIComponent(subscriptionError.message + extra)}`);
  }

  const subscriptionId = insertedSubscription!.id;
  const { error: itemsError } = await supabase
    .from("subscription_items")
    .insert(itemPayload.map((row) => ({ ...row, subscription_id: subscriptionId })));

  if (itemsError) {
    redirect(`/subscriptions/new?error=${encodeURIComponent(itemsError.message)}`);
  }

  // If this is an upsell/downsell, we close the previous subscription *as of the new start date*.
  if ((changeType === "upsell" || changeType === "downsell") && previousSubscriptionId) {
    const { data: previous, error: previousError } = await supabase
      .from("subscriptions")
      .select("id, customer_id, company_id, status, close_reason, end_date")
      .eq("id", previousSubscriptionId)
      .maybeSingle();

    if (previousError) {
      redirect(`/subscriptions/new?error=${encodeURIComponent(previousError.message)}`);
    }

    // Safety: don't accidentally close another customer's subscription.
    if (previous && (previous.customer_id ?? previous.company_id) && (previous.customer_id ?? previous.company_id) !== customerId) {
      redirect(`/subscriptions/new?error=${encodeURIComponent("La suscripcion previa no pertenece al mismo cliente")}`);
    }

    if (previous) {
      const { error: closeError } = await supabase
        .from("subscriptions")
        .update({
          status: "closed",
          close_reason: changeType,
          end_date: startDate,
        })
        .eq("id", previousSubscriptionId);

      if (closeError) {
        redirect(`/subscriptions/new?error=${encodeURIComponent(closeError.message)}`);
      }

      // Log changes in the previous subscription.
      const auth = await requireEditorRole();
      const changedBy = auth.ok ? auth.changedBy : null;

      await supabase.from("subscription_logs").insert([
        {
          subscription_id: previousSubscriptionId,
          event_type: changeType,
          field_changed: "status",
          old_value: previous.status ?? null,
          new_value: "closed",
          changed_by: changedBy,
          delta_uf: 0,
        },
        {
          subscription_id: previousSubscriptionId,
          event_type: changeType,
          field_changed: "close_reason",
          old_value: previous.close_reason ?? null,
          new_value: changeType,
          changed_by: changedBy,
          delta_uf: 0,
        },
        {
          subscription_id: previousSubscriptionId,
          event_type: changeType,
          field_changed: "end_date",
          old_value: previous.end_date ?? null,
          new_value: startDate,
          changed_by: changedBy,
          delta_uf: 0,
        },
      ]);
    }
  }

  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${subscriptionId}`);
  redirect(`/subscriptions/${subscriptionId}/view?tab=products`);
}

export async function updateSubscriptionSummaryAction(formData: FormData) {
  const subscriptionId = getString(formData, "subscription_id");
  const tab = getString(formData, "tab") || "products";

  const startDate = getString(formData, "start_date") || null;
  const nextBillingDate = getString(formData, "next_billing_date") || null;
  const recurrence = getString(formData, "recurrence") || null;
  const salesExecutiveId = getString(formData, "sales_executive_id") || null;
  const channel = getString(formData, "channel") || null;
  const hubspotDealId = getString(formData, "hubspot_deal_id") || null;
  const endDate = getString(formData, "end_date") || null;
  const suspensionDate = getString(formData, "suspension_date") || null;

  if (!subscriptionId) {
    redirect(`/subscriptions?error=${encodeURIComponent("Suscripcion requerida")}`);
  }

  const auth = await requireEditorRole();
  if (!auth.ok) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(auth.error)}`);
  }

  const { supabase, changedBy } = auth;
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("start_date, next_billing_date, recurrence, sales_executive_id, channel, hubspot_deal_id, end_date, suspension_date")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (existingError || !existing) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(existingError?.message ?? "No encontrado")}`);
  }

  const updatePayload = {
    start_date: startDate,
    next_billing_date: nextBillingDate,
    recurrence: recurrence as unknown as string,
    sales_executive_id: salesExecutiveId || null,
    channel,
    hubspot_deal_id: hubspotDealId,
    end_date: endDate,
    suspension_date: suspensionDate,
  };

  const { error: updateError } = await supabase.from("subscriptions").update(updatePayload).eq("id", subscriptionId);
  if (updateError) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(updateError.message)}`);
  }

  // Log only the fields that changed (compact + audit-friendly).
  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [
    { field: "start_date", oldValue: existing.start_date, newValue: startDate },
    { field: "next_billing_date", oldValue: existing.next_billing_date, newValue: nextBillingDate },
    { field: "recurrence", oldValue: existing.recurrence, newValue: recurrence },
    { field: "sales_executive_id", oldValue: existing.sales_executive_id, newValue: salesExecutiveId || null },
    { field: "channel", oldValue: existing.channel, newValue: channel },
    { field: "hubspot_deal_id", oldValue: existing.hubspot_deal_id, newValue: hubspotDealId },
    { field: "end_date", oldValue: existing.end_date, newValue: endDate },
    { field: "suspension_date", oldValue: existing.suspension_date, newValue: suspensionDate },
  ].filter((row) => (row.oldValue ?? null) !== (row.newValue ?? null));

  if (changes.length > 0) {
    await supabase.from("subscription_logs").insert(
      changes.map((c) => ({
        subscription_id: subscriptionId,
        event_type: "update",
        field_changed: c.field,
        old_value: c.oldValue,
        new_value: c.newValue,
        changed_by: changedBy,
        delta_uf: 0,
      }))
    );
  }

  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${subscriptionId}/view`);
  redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}`);
}

export async function updateSubscriptionStatusAction(formData: FormData) {
  const subscriptionId = getString(formData, "subscription_id");
  const tab = getString(formData, "tab") || "products";
  const status = getString(formData, "status");
  const closeReason = getString(formData, "close_reason") || null;
  const endDateRaw = getString(formData, "end_date") || null;

  if (!subscriptionId || !status) {
    redirect(`/subscriptions?error=${encodeURIComponent("Datos incompletos")}`);
  }

  const auth = await requireEditorRole();
  if (!auth.ok) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(auth.error)}`);
  }

  const { supabase, changedBy } = auth;
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("status, close_reason, end_date")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (existingError || !existing) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(existingError?.message ?? "No encontrado")}`);
  }

  function firstDayNextMonthISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstNext = new Date(y, m + 1, 1);
    return firstNext.toISOString().slice(0, 10);
  }

  const computedEndDate = status === "closed" ? (endDateRaw ?? firstDayNextMonthISO()) : null;
  const computedCloseReason = status === "closed" ? closeReason : null;

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status,
      close_reason: computedCloseReason,
      end_date: computedEndDate,
    })
    .eq("id", subscriptionId);

  if (updateError) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(updateError.message)}`);
  }

  const logRows: Array<{ field: string; oldVal: string | null; newVal: string | null }> = [
    { field: "status", oldVal: existing.status, newVal: status },
    { field: "close_reason", oldVal: existing.close_reason ?? null, newVal: computedCloseReason ?? null },
    { field: "end_date", oldVal: existing.end_date ?? null, newVal: computedEndDate ?? null },
  ].filter((r) => (r.oldVal ?? null) !== (r.newVal ?? null));

  if (logRows.length > 0) {
    await supabase.from("subscription_logs").insert(
      logRows.map((r) => ({
        subscription_id: subscriptionId,
        event_type: "update",
        field_changed: r.field,
        old_value: r.oldVal,
        new_value: r.newVal,
        changed_by: changedBy,
        delta_uf: 0,
      }))
    );
  }

  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${subscriptionId}/view`);
  redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}`);
}

export async function deleteSubscriptionAction(formData: FormData) {
  const subscriptionId = getString(formData, "subscription_id");
  const tab = getString(formData, "tab") || "products";

  if (!subscriptionId) {
    redirect(`/subscriptions?error=${encodeURIComponent("Suscripcion requerida")}`);
  }

  const auth = await requireEditorRole();
  if (!auth.ok) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(auth.error)}`);
  }

  const { supabase } = auth;
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("id, subscription_code")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (existingError || !existing) {
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(existingError?.message ?? "No encontrado")}`);
  }

  // Hard delete: deletes the subscription and cascades to items/logs/sync events.
  // This is intentionally destructive (cleanup of wrong records).
  const { error: deleteError } = await supabase.rpc("hard_delete_subscription", { target_id: subscriptionId });
  if (deleteError) {
    const hint =
      deleteError.message?.toLowerCase().includes("hard_delete_subscription") ||
      deleteError.message?.toLowerCase().includes("function") ||
      deleteError.message?.toLowerCase().includes("rpc")
        ? " (falta correr la SQL de hard delete en Supabase)"
        : "";
    redirect(`/subscriptions/${subscriptionId}/view?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(deleteError.message + hint)}`);
  }

  revalidatePath("/subscriptions");
  redirect(`/subscriptions?success=${encodeURIComponent(`Suscripcion eliminada${existing.subscription_code ? ` (${existing.subscription_code})` : ""}`)}`);
}
