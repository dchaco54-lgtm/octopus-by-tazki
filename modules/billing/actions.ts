"use server";

import { revalidatePath } from "next/cache";
import type { BillingDocumentMode, BillingOutputKind, BillingPersistPayload, BillingPersistResult } from "@/modules/billing/create-types";
import { deleteImportedBillingRecord, persistBillingDocument } from "@/modules/billing/server";

async function handleBillingAction(
  payload: BillingPersistPayload,
  options: { mode: BillingDocumentMode; generateOutput?: BillingOutputKind | null }
): Promise<BillingPersistResult> {
  const result = await persistBillingDocument(payload, options);

  if (result.ok) {
    revalidatePath("/billing");
    revalidatePath(`/billing/${result.recordId}`);
  }

  return result;
}

export async function saveBillingDraftAction(payload: BillingPersistPayload) {
  return handleBillingAction(payload, { mode: "draft" });
}

export async function saveExternalBillingAction(payload: BillingPersistPayload) {
  return handleBillingAction(payload, { mode: "draft" });
}

export async function emitBillingInvoiceAction(payload: BillingPersistPayload) {
  return handleBillingAction(payload, { mode: "issued" });
}

export async function generateBillingOutputAction(payload: BillingPersistPayload, kind: BillingOutputKind) {
  return handleBillingAction(payload, {
    mode: payload.origin === "externo" ? "draft" : payload.documentNumber.trim() ? "issued" : "draft",
    generateOutput: kind,
  });
}

export async function deleteImportedBillingRecordAction(recordId: string) {
  const result = await deleteImportedBillingRecord(recordId);

  if (result.ok) {
    revalidatePath("/billing");
  }

  return result;
}
