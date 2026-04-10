import { z } from "zod";

export const pricingVariableSchema = z.object({
  variable_code: z.string().min(2, "Codigo requerido"),
  name: z.string().min(2, "Nombre requerido"),
  description: z.string().optional(),
  variable_type: z.enum(["number", "boolean", "select", "text"]),
  unit: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const salesChannelSchema = z.object({
  channel_code: z.string().min(2, "Codigo requerido"),
  name: z.string().min(2, "Nombre requerido"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const pricingStrategySchema = z.object({
  code: z.string().min(2, "Codigo requerido"),
  name: z.string().min(2, "Nombre requerido"),
  version: z.coerce.number().int().min(1, "Version invalida").default(1),
  description: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const pricingRuleSchema = z
  .object({
    pricing_strategy_id: z.string().uuid("Estrategia requerida"),
    target_type: z.enum(["plan", "addon", "service", "variable"]),
    target_product_id: z.string().uuid().optional(),
    target_variable_id: z.string().uuid().optional(),
    pricing_mode: z.enum(["fixed", "per_unit", "formula", "range"]),
    value_uf: z.coerce.number().optional(),
    min_value: z.coerce.number().optional(),
    max_value: z.coerce.number().optional(),
    formula_text: z.string().optional(),
    is_active: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.target_type === "variable") {
      if (!value.target_variable_id) {
        ctx.addIssue({ code: "custom", message: "Variable requerida", path: ["target_variable_id"] });
      }
      if (value.target_product_id) {
        ctx.addIssue({ code: "custom", message: "No debe definir producto cuando el target es variable", path: ["target_product_id"] });
      }
      return;
    }

    if (!value.target_product_id) {
      ctx.addIssue({ code: "custom", message: "Producto requerido", path: ["target_product_id"] });
    }

    if (value.target_variable_id) {
      ctx.addIssue({ code: "custom", message: "No debe definir variable cuando el target es producto", path: ["target_variable_id"] });
    }
  });

export type PricingVariableFormValues = z.infer<typeof pricingVariableSchema>;
export type SalesChannelFormValues = z.infer<typeof salesChannelSchema>;
export type PricingStrategyFormValues = z.infer<typeof pricingStrategySchema>;
export type PricingRuleFormValues = z.infer<typeof pricingRuleSchema>;

