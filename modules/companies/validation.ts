import { z } from "zod";

export const companySchema = z.object({
  legal_name: z.string().min(2, "Razon social requerida"),
  trade_name: z.string().min(2, "Nombre comercial requerido"),
  rut: z.string().min(7, "RUT invalido"),
  billing_email: z.string().email("Email de facturacion invalido"),
  admin_email: z.string().email("Email de administracion invalido"),
  phone: z.string().optional(),
  address: z.string().optional(),
  commune: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("Chile"),
  legal_representative_name: z.string().optional(),
  legal_representative_rut: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]),
  notes: z.string().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
