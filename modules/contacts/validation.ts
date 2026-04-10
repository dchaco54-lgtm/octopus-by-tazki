import { z } from "zod";

export const contactSchema = z.object({
  company_id: z.string().uuid("Cliente invalido"),
  first_name: z.string().min(2, "Nombre requerido"),
  last_name: z.string().min(2, "Apellido requerido"),
  email: z.string().email("Email invalido"),
  phone: z.string().optional(),
  role: z.string().optional(),
  area: z.string().optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
