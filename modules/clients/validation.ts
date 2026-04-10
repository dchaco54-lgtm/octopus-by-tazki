import { z } from "zod";
import {
  BILLING_DOCUMENT_REQUIREMENT_OPTIONS,
  BILLING_MODEL_OPTIONS,
  OC_USAGE_TYPE_OPTIONS,
} from "@/modules/clients/constants";

const singleEmailSchema = z.string().email();

export function normalizeEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .join(", ");
}

export function isValidEmailList(value: string) {
  const emails = normalizeEmailList(value)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return emails.length > 0 && emails.every((email) => singleEmailSchema.safeParse(email).success);
}

export const dteEmailListSchema = z
  .string()
  .min(1, "Correo DTE invalido")
  .transform(normalizeEmailList)
  .refine(isValidEmailList, "Correo DTE invalido");

export const createClientSchema = z.object({
  trade_name: z.string().min(2, "Nombre cliente requerido"),
  legal_name: z.string().min(2, "Razon social requerida"),
  internal_code: z.string().trim().max(50, "Cliente ID demasiado largo").optional().or(z.literal("")),
  rut: z.string().min(7, "RUT invalido"),
  address: z.string().min(3, "Direccion requerida"),
  commune: z.string().min(2, "Comuna requerida"),
  city: z.string().min(2, "Ciudad requerida"),
  country: z.string().min(2, "Pais requerido"),
  phone: z.string().min(6, "Telefono requerido"),
  company_email: z.string().email("Correo empresa invalido"),
  dte_email: dteEmailListSchema,
  billing_email: z.string().email("Correo de facturacion invalido"),
  industry: z.string().min(2, "Giro requerido"),
  status: z.enum(["active", "inactive", "churned"]),
  customer_type: z.enum(["Empresa", "Persona"]),
  taxpayer_type: z.enum(["Primera Categoria", "Segunda Categoria", "Persona Natural"]),
  company_category: z.enum(["Enterprise", "Midmarket", "SMB"]),
  currency: z.enum(["UF", "USD", "CLP"]),
  billing_model: z.enum(BILLING_MODEL_OPTIONS.map((option) => option.value) as [string, ...string[]]),
  billing_document_requirement: z.enum(BILLING_DOCUMENT_REQUIREMENT_OPTIONS),
  oc_usage_type: z.enum(OC_USAGE_TYPE_OPTIONS.map((option) => option.value) as [string, ...string[]]),
  is_recurring_billing: z.boolean(),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;
