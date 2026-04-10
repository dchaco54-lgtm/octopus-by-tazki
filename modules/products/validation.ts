import { z } from "zod";

export const productSchema = z.object({
  code: z.string().min(2, "Codigo requerido"),
  name: z.string().min(2, "Nombre requerido"),
  description: z.string().optional(),
  category: z.enum(["plan", "addon", "service", "implementation", "support", "one_time", "legacy"]),
  billing_type: z.enum(["recurrente", "no_recurrente"]),
  affects_mrr: z.boolean().default(true),
  affects_revenue: z.boolean().default(true),
  base_price_uf: z.coerce.number().min(0, "Precio invalido"),
  is_active: z.boolean().default(true),
  allow_manual_override: z.boolean().default(true),
  depends_on_plan: z.boolean().default(false),
  is_legacy: z.boolean().default(false),
  allow_upsell: z.boolean().default(true),
  allow_cross_sell: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;
