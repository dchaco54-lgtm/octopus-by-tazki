export const BILLING_MODEL_OPTIONS = [
  { value: "recurring_without_oc", label: "Recurrente sin OC" },
  { value: "recurring_with_oc", label: "Recurrente con OC" },
  { value: "recurring_with_oc_validation", label: "Recurrente con OC + validacion" },
] as const;

export type BillingModel = (typeof BILLING_MODEL_OPTIONS)[number]["value"];

export const DEFAULT_BILLING_MODEL: BillingModel = "recurring_without_oc";

export const BILLING_DOCUMENT_REQUIREMENT_OPTIONS = [
  "Ninguno",
  "MIGO",
  "HES",
  "MIGO + HES",
  "Orden de Servicio",
  "Otro",
] as const;

export type BillingDocumentRequirement = (typeof BILLING_DOCUMENT_REQUIREMENT_OPTIONS)[number];

export const DEFAULT_BILLING_DOCUMENT_REQUIREMENT: BillingDocumentRequirement = "Ninguno";

export const OC_USAGE_TYPE_OPTIONS = [
  { value: "no_oc", label: "No utiliza OC" },
  { value: "annual_oc", label: "Utiliza OC anual" },
] as const;

export type OcUsageType = (typeof OC_USAGE_TYPE_OPTIONS)[number]["value"];

export const DEFAULT_OC_USAGE_TYPE: OcUsageType = "no_oc";
export const DEFAULT_OC_USAGE_TYPE_WITH_OC: OcUsageType = "annual_oc";

export function billingModelUsesOc(model: string | null | undefined) {
  return model === "recurring_with_oc" || model === "recurring_with_oc_validation";
}

export function billingModelRequiresValidation(model: string | null | undefined) {
  return model === "recurring_with_oc_validation";
}

export function getBillingModelLabel(model: string | null | undefined) {
  return BILLING_MODEL_OPTIONS.find((option) => option.value === model)?.label ?? BILLING_MODEL_OPTIONS[0].label;
}

export function getOcUsageTypeLabel(ocUsageType: string | null | undefined) {
  return OC_USAGE_TYPE_OPTIONS.find((option) => option.value === ocUsageType)?.label ?? OC_USAGE_TYPE_OPTIONS[0].label;
}
