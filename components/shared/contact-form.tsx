import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompanyOption {
  id: string;
  trade_name: string | null;
  legal_name?: string | null;
  internal_code?: string | null;
  rut?: string | null;
}

interface ContactFormData {
  company_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  role?: string | null;
  area?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
}

interface ContactFormProps {
  action: (formData: FormData) => void;
  companies: CompanyOption[];
  defaultValues?: ContactFormData;
  submitLabel: string;
}

export function ContactForm({ action, companies, defaultValues, submitLabel }: ContactFormProps) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="company_id">Cliente</Label>
          <select
            id="company_id"
            name="company_id"
            defaultValue={defaultValues?.company_id ?? ""}
            className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
            required
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {(company.trade_name || company.legal_name || "Cliente sin nombre") +
                  (company.internal_code ? ` · Cliente ID ${company.internal_code}` : "") +
                  (company.rut ? ` · ${company.rut}` : "")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="first_name">Nombre</Label>
          <Input id="first_name" name="first_name" defaultValue={defaultValues?.first_name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Apellido</Label>
          <Input id="last_name" name="last_name" defaultValue={defaultValues?.last_name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <Input id="role" name="role" defaultValue={defaultValues?.role ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" name="area" defaultValue={defaultValues?.area ?? ""} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="is_primary"
            defaultChecked={defaultValues?.is_primary ?? false}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Contacto primario
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={defaultValues?.is_active ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Contacto activo
        </label>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
