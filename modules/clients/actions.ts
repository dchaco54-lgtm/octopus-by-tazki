"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_BILLING_DOCUMENT_REQUIREMENT,
  DEFAULT_BILLING_MODEL,
  DEFAULT_OC_USAGE_TYPE,
  DEFAULT_OC_USAGE_TYPE_WITH_OC,
  billingModelRequiresValidation,
  billingModelUsesOc,
} from "@/modules/clients/constants";
import { createClientSchema, dteEmailListSchema, normalizeEmailList } from "@/modules/clients/validation";

const PURCHASE_ORDER_BUCKET = "client-purchase-orders";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "true";
}

function hasField(formData: FormData, key: string) {
  return formData.has(key);
}

function normalizeBillingSettings(formData: FormData) {
  const billingModel = getString(formData, "billing_model") || DEFAULT_BILLING_MODEL;
  const usesOc = billingModelUsesOc(billingModel);
  const requiresValidation = billingModelRequiresValidation(billingModel);
  const isRecurringValue = getString(formData, "is_recurring_billing");

  return {
    billing_model: billingModel,
    billing_document_requirement: requiresValidation
      ? getString(formData, "billing_document_requirement") || DEFAULT_BILLING_DOCUMENT_REQUIREMENT
      : DEFAULT_BILLING_DOCUMENT_REQUIREMENT,
    oc_usage_type: usesOc
      ? getString(formData, "oc_usage_type") || DEFAULT_OC_USAGE_TYPE_WITH_OC
      : DEFAULT_OC_USAGE_TYPE,
    is_recurring_billing: isRecurringValue ? getBoolean(formData, "is_recurring_billing") : true,
  };
}

async function writeClientActivityLog(clientId: string, actionType: string, description: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("client_activity_logs").insert({
    client_id: clientId,
    action_type: actionType,
    description,
    actor_name: user?.user_metadata?.full_name || user?.email || "Sistema",
    actor_email: user?.email || "sistema@tazki.cl",
  });
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const phone = getString(formData, "phone");
  const redirectTab = getString(formData, "redirect_tab");
  const { data: currentClient } = await supabase.from("companies").select("website").eq("id", clientId).maybeSingle();
  const payload = {
    trade_name: getString(formData, "trade_name"),
    legal_name: getString(formData, "legal_name"),
    internal_code: getString(formData, "internal_code") || null,
    rut: getString(formData, "rut"),
    address: getString(formData, "address"),
    commune: getString(formData, "commune"),
    city: getString(formData, "city"),
    country: getString(formData, "country"),
    customer_type: getString(formData, "customer_type"),
    phone,
    mobile_phone: phone,
    company_email: getString(formData, "company_email"),
    website: currentClient?.website ?? "",
    company_category: getString(formData, "company_category"),
    status: getString(formData, "status"),
    payer_client_id: getString(formData, "payer_client_id") || null,
    payer_client_rut: getString(formData, "payer_client_rut"),
  };

  const { error } = await supabase.from("companies").update(payload).eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "client_updated", "Se actualizaron los datos principales del cliente.");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(redirectTab ? `/clients/${clientId}?tab=${redirectTab}` : `/clients/${clientId}`);
}

export async function updateClientBillingAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const redirectTab = getString(formData, "redirect_tab");
  const { data: currentClient } = await supabase
    .from("companies")
    .select("billing_model, billing_document_requirement, billing_email, dte_email, payer_client_id, payer_client_rut, taxpayer_type, currency, industry")
    .eq("id", clientId)
    .maybeSingle();

  const billingSettings = normalizeBillingSettings(formData);
  const rawDteEmail = hasField(formData, "dte_email") ? getString(formData, "dte_email") : (currentClient?.dte_email ?? "");
  const parsedDteEmail = rawDteEmail ? dteEmailListSchema.safeParse(rawDteEmail) : { success: true as const, data: "" };

  if (!parsedDteEmail.success) {
    redirect(`/clients/${clientId}?tab=billing&error=${encodeURIComponent("Correo DTE invalido. Usa correos separados por coma.")}`);
  }

  const payload = {
    billing_email: hasField(formData, "billing_email")
      ? getString(formData, "billing_email")
      : (currentClient?.billing_email ?? ""),
    payer_client_id: hasField(formData, "payer_client_id")
      ? getString(formData, "payer_client_id") || null
      : (currentClient?.payer_client_id ?? null),
    payer_client_rut: hasField(formData, "payer_client_rut")
      ? getString(formData, "payer_client_rut")
      : (currentClient?.payer_client_rut ?? ""),
    taxpayer_type: hasField(formData, "taxpayer_type")
      ? getString(formData, "taxpayer_type")
      : (currentClient?.taxpayer_type ?? ""),
    currency: hasField(formData, "currency")
      ? getString(formData, "currency")
      : (currentClient?.currency ?? ""),
    dte_email: parsedDteEmail.data,
    industry: hasField(formData, "industry")
      ? getString(formData, "industry")
      : (currentClient?.industry ?? ""),
    ...billingSettings,
  };

  const { error } = await supabase.from("companies").update(payload).eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}?tab=billing&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "billing_updated", "Se actualizo la configuracion de facturacion del cliente.");
  if ((currentClient?.dte_email ?? "") !== payload.dte_email) {
    await writeClientActivityLog(clientId, "dte_email_updated", `Se actualizo correo DTE a ${payload.dte_email || "-"}.`);
  }
  if ((currentClient?.billing_model ?? DEFAULT_BILLING_MODEL) !== payload.billing_model) {
    await writeClientActivityLog(clientId, "billing_model_updated", `Se actualizo modelo de facturacion a ${payload.billing_model}.`);
  }
  if ((currentClient?.billing_document_requirement ?? DEFAULT_BILLING_DOCUMENT_REQUIREMENT) !== payload.billing_document_requirement) {
    await writeClientActivityLog(
      clientId,
      "billing_document_requirement_updated",
      `Se actualizo documento requerido para facturar a ${payload.billing_document_requirement}.`
    );
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(redirectTab ? `/clients/${clientId}?tab=${redirectTab}` : `/clients/${clientId}?tab=billing`);
}

function redirectCreateWithError(formData: FormData, errorMessage: string) {
  const params = new URLSearchParams();
  params.set("error", errorMessage);
  const keysToPersist = [
    "trade_name",
    "legal_name",
    "internal_code",
    "rut",
    "address",
    "commune",
    "city",
    "country",
    "phone",
    "company_email",
    "dte_email",
    "billing_email",
    "industry",
    "status",
    "customer_type",
    "taxpayer_type",
    "company_category",
    "currency",
    "billing_model",
    "billing_document_requirement",
    "oc_usage_type",
    "is_recurring_billing",
  ];

  keysToPersist.forEach((key) => {
    const value = getString(formData, key);
    if (value) params.set(key, value);
  });

  redirect(`/clients/new?${params.toString()}`);
}

export async function createClientAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const billingSettings = normalizeBillingSettings(formData);
  const parsed = createClientSchema.safeParse({
    trade_name: getString(formData, "trade_name"),
    legal_name: getString(formData, "legal_name"),
    internal_code: getString(formData, "internal_code"),
    rut: getString(formData, "rut"),
    address: getString(formData, "address"),
    commune: getString(formData, "commune"),
    city: getString(formData, "city"),
    country: getString(formData, "country"),
    phone: getString(formData, "phone"),
    company_email: getString(formData, "company_email"),
    dte_email: normalizeEmailList(getString(formData, "dte_email")),
    billing_email: getString(formData, "billing_email"),
    industry: getString(formData, "industry"),
    status: getString(formData, "status"),
    customer_type: getString(formData, "customer_type"),
    taxpayer_type: getString(formData, "taxpayer_type"),
    company_category: getString(formData, "company_category"),
    currency: getString(formData, "currency"),
    billing_model: billingSettings.billing_model,
    billing_document_requirement: billingSettings.billing_document_requirement,
    oc_usage_type: billingSettings.oc_usage_type,
    is_recurring_billing: billingSettings.is_recurring_billing,
  });

  if (!parsed.success) {
    redirectCreateWithError(formData, parsed.error.issues[0]?.message ?? "Completa todos los campos obligatorios");
    return;
  }
  const parsedData = parsed.data;

  const payload = {
    trade_name: parsedData.trade_name,
    legal_name: parsedData.legal_name,
    internal_code: parsedData.internal_code || null,
    rut: parsedData.rut,
    address: parsedData.address,
    commune: parsedData.commune,
    city: parsedData.city,
    country: parsedData.country,
    phone: parsedData.phone,
    mobile_phone: parsedData.phone,
    company_email: parsedData.company_email,
    dte_email: parsedData.dte_email,
    billing_email: parsedData.billing_email,
    admin_email: parsedData.company_email,
    industry: parsedData.industry,
    status: parsedData.status,
    customer_type: parsedData.customer_type,
    taxpayer_type: parsedData.taxpayer_type,
    company_category: parsedData.company_category,
    currency: parsedData.currency,
    billing_model: parsedData.billing_model,
    billing_document_requirement: parsedData.billing_document_requirement,
    oc_usage_type: parsedData.oc_usage_type,
    is_recurring_billing: parsedData.is_recurring_billing,
  };

  const { data, error } = await supabase.from("companies").insert(payload).select("id").single();
  if (error || !data) {
    redirectCreateWithError(formData, error?.message ?? "No fue posible crear el cliente");
    return;
  }
  const newClientId = data.id;

  await writeClientActivityLog(newClientId, "client_created", "Se creo el cliente en la ficha maestra.");
  revalidatePath("/clients");
  revalidatePath(`/clients/${newClientId}`);
  redirect(`/clients/${newClientId}`);
}

export async function addClientContactAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const payload = {
    client_id: clientId,
    contact_type: getString(formData, "contact_type"),
    name: getString(formData, "name"),
    email: getString(formData, "email"),
    address: getString(formData, "address"),
    city: getString(formData, "city"),
    phone: getString(formData, "phone"),
    notes: getString(formData, "notes"),
  };

  const { error } = await supabase.from("client_contacts").insert(payload);
  if (error) {
    redirect(`/clients/${clientId}?tab=client-contacts&new_contact=1&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "contact_added", `Se agrego contacto ${payload.name || payload.contact_type}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=client-contacts`);
}

export async function updateClientContactAction(clientId: string, contactId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const payload = {
    contact_type: getString(formData, "contact_type"),
    name: getString(formData, "name"),
    email: getString(formData, "email"),
    address: getString(formData, "address"),
    city: getString(formData, "city"),
    phone: getString(formData, "phone"),
    notes: getString(formData, "notes"),
  };

  const { error } = await supabase.from("client_contacts").update(payload).eq("id", contactId).eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=client-contacts&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "contact_updated", `Se actualizo contacto ${payload.name || payload.contact_type}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=client-contacts`);
}

export async function deleteClientContactAction(clientId: string, contactId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const contactName = getString(formData, "contact_name");

  const { error } = await supabase.from("client_contacts").delete().eq("id", contactId).eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=client-contacts&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "contact_deleted", `Se elimino contacto ${contactName || "sin nombre"}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=client-contacts`);
}

function internalRoleLabel(roleType: string) {
  if (roleType === "sdr") return "Quien prospecto";
  if (roleType === "prospector") return "Quien prospecto";
  if (roleType === "sales_executive") return "Ejecutivo de venta";
  if (roleType === "ob_executive") return "Ejecutivo de OB";
  if (roleType === "csm") return "Customer Success Manager";
  return roleType;
}

export async function addClientInternalContactAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const payload = {
    client_id: clientId,
    role_type: getString(formData, "role_type"),
    full_name: getString(formData, "full_name"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    notes: getString(formData, "notes"),
    is_active: getString(formData, "is_active") !== "false",
  };

  const { error } = await supabase.from("client_internal_contacts").insert(payload);
  if (error) {
    redirect(`/clients/${clientId}?tab=internal-team&new_internal_contact=1&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "internal_contact_added", `Se agrego ${internalRoleLabel(payload.role_type)}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=internal-team`);
}

export async function updateClientInternalContactAction(clientId: string, internalContactId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const payload = {
    role_type: getString(formData, "role_type"),
    full_name: getString(formData, "full_name"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    notes: getString(formData, "notes"),
    is_active: getString(formData, "is_active") !== "false",
  };

  const { error } = await supabase
    .from("client_internal_contacts")
    .update(payload)
    .eq("id", internalContactId)
    .eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=internal-team&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "internal_contact_updated", `Se actualizo ${internalRoleLabel(payload.role_type)}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=internal-team`);
}

export async function deleteClientInternalContactAction(clientId: string, internalContactId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const roleType = getString(formData, "role_type");

  const { error } = await supabase
    .from("client_internal_contacts")
    .delete()
    .eq("id", internalContactId)
    .eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=internal-team&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "internal_contact_deleted", `Se elimino contacto interno ${internalRoleLabel(roleType)}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=internal-team`);
}

export async function addClientPurchaseOrderAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const attachmentFile = getFile(formData, "attachment_pdf");
  if (attachmentFile && attachmentFile.type !== "application/pdf") {
    redirect(`/clients/${clientId}?tab=purchase-orders&new_po=1&error=${encodeURIComponent("El adjunto debe ser un PDF")}`);
  }

  const payload = {
    client_id: clientId,
    purchase_order_number: getString(formData, "purchase_order_number"),
    valid_from: getString(formData, "valid_from") || null,
    valid_to: getString(formData, "valid_to") || null,
    status: getString(formData, "status") || "vigente",
    notes: getString(formData, "notes"),
  };

  const { data: newOrder, error } = await supabase.from("client_purchase_orders").insert(payload).select("id").single();
  if (error || !newOrder) {
    redirect(`/clients/${clientId}?tab=purchase-orders&new_po=1&error=${encodeURIComponent(error?.message ?? "No se pudo crear la OC")}`);
  }

  if (attachmentFile) {
    const path = `${clientId}/${newOrder.id}.pdf`;
    const { error: uploadError } = await supabase.storage.from(PURCHASE_ORDER_BUCKET).upload(path, attachmentFile, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) {
      redirect(`/clients/${clientId}?tab=purchase-orders&new_po=1&error=${encodeURIComponent(uploadError.message)}`);
    }

    const { error: updateError } = await supabase
      .from("client_purchase_orders")
      .update({ attachment_path: path })
      .eq("id", newOrder.id);
    if (updateError) {
      redirect(`/clients/${clientId}?tab=purchase-orders&new_po=1&error=${encodeURIComponent(updateError.message)}`);
    }
    await writeClientActivityLog(clientId, "purchase_order_pdf_attached", `Se adjunto PDF a OC ${payload.purchase_order_number}.`);
  }

  await writeClientActivityLog(clientId, "purchase_order_added", `Se agrego OC ${payload.purchase_order_number}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=purchase-orders`);
}

export async function updateClientPurchaseOrderAction(clientId: string, purchaseOrderId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const attachmentFile = getFile(formData, "attachment_pdf");
  if (attachmentFile && attachmentFile.type !== "application/pdf") {
    redirect(`/clients/${clientId}?tab=purchase-orders&error=${encodeURIComponent("El adjunto debe ser un PDF")}`);
  }

  const payload = {
    purchase_order_number: getString(formData, "purchase_order_number"),
    valid_from: getString(formData, "valid_from") || null,
    valid_to: getString(formData, "valid_to") || null,
    status: getString(formData, "status") || "vigente",
    notes: getString(formData, "notes"),
  };

  const { error } = await supabase.from("client_purchase_orders").update(payload).eq("id", purchaseOrderId).eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=purchase-orders&error=${encodeURIComponent(error.message)}`);
  }

  if (attachmentFile) {
    const path = `${clientId}/${purchaseOrderId}.pdf`;
    const { error: uploadError } = await supabase.storage.from(PURCHASE_ORDER_BUCKET).upload(path, attachmentFile, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) {
      redirect(`/clients/${clientId}?tab=purchase-orders&error=${encodeURIComponent(uploadError.message)}`);
    }

    const { error: updateError } = await supabase
      .from("client_purchase_orders")
      .update({ attachment_path: path })
      .eq("id", purchaseOrderId)
      .eq("client_id", clientId);
    if (updateError) {
      redirect(`/clients/${clientId}?tab=purchase-orders&error=${encodeURIComponent(updateError.message)}`);
    }
    await writeClientActivityLog(clientId, "purchase_order_pdf_attached", `Se adjunto PDF a OC ${payload.purchase_order_number}.`);
  }

  await writeClientActivityLog(clientId, "purchase_order_updated", `Se actualizo OC ${payload.purchase_order_number}.`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=purchase-orders`);
}

export async function addClientNoteAction(clientId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const redirectTab = getString(formData, "redirect_tab");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    client_id: clientId,
    author_name: user?.user_metadata?.full_name || user?.email || "Usuario interno",
    author_email: user?.email || "sistema@tazki.cl",
    body: getString(formData, "body"),
  };

  const { error } = await supabase.from("client_notes").insert(payload);
  if (error) {
    redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "note_added", "Se agrego una nota interna.");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}`);
}

export async function deleteClientNoteAction(clientId: string, noteId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const redirectTab = getString(formData, "redirect_tab");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserEmail = user?.email?.trim().toLowerCase();
  if (!currentUserEmail) {
    redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}&error=${encodeURIComponent("No se pudo validar el autor de la nota.")}`);
  }

  const { data: note } = await supabase
    .from("client_notes")
    .select("id, author_email, body")
    .eq("id", noteId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!note) {
    redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}&error=${encodeURIComponent("La nota no existe o ya fue eliminada.")}`);
  }

  const noteAuthorEmail = note.author_email?.trim().toLowerCase() ?? "";
  if (noteAuthorEmail !== currentUserEmail) {
    redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}&error=${encodeURIComponent("Solo puedes eliminar tus propias notas.")}`);
  }

  const { error } = await supabase.from("client_notes").delete().eq("id", noteId).eq("client_id", clientId);
  if (error) {
    redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}&error=${encodeURIComponent(error.message)}`);
  }

  await writeClientActivityLog(clientId, "note_deleted", `Se elimino una nota interna: ${note.body.slice(0, 80)}${note.body.length > 80 ? "..." : ""}`);
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=${redirectTab || "client-contacts"}`);
}
