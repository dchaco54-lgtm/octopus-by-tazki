import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CompanyFormData {
  legal_name?: string;
  trade_name?: string;
  rut?: string;
  billing_email?: string;
  admin_email?: string;
  phone?: string | null;
  address?: string | null;
  commune?: string | null;
  city?: string | null;
  country?: string;
  legal_representative_name?: string | null;
  legal_representative_rut?: string | null;
  status?: "active" | "inactive" | "suspended";
  notes?: string | null;
}

interface CompanyFormProps {
  action: (formData: FormData) => void;
  defaultValues?: CompanyFormData;
  submitLabel: string;
}

export function CompanyForm({ action, defaultValues, submitLabel }: CompanyFormProps) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="legal_name">Razon social</Label>
          <Input id="legal_name" name="legal_name" defaultValue={defaultValues?.legal_name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade_name">Nombre comercial</Label>
          <Input id="trade_name" name="trade_name" defaultValue={defaultValues?.trade_name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rut">RUT</Label>
          <Input id="rut" name="rut" defaultValue={defaultValues?.rut ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "active"}
            className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_email">Email de facturacion</Label>
          <Input
            id="billing_email"
            name="billing_email"
            type="email"
            defaultValue={defaultValues?.billing_email ?? ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin_email">Email admin</Label>
          <Input id="admin_email" name="admin_email" type="email" defaultValue={defaultValues?.admin_email ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Pais</Label>
          <Input id="country" name="country" defaultValue={defaultValues?.country ?? "Chile"} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Direccion</Label>
          <Input id="address" name="address" defaultValue={defaultValues?.address ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commune">Comuna</Label>
          <Input id="commune" name="commune" defaultValue={defaultValues?.commune ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" name="city" defaultValue={defaultValues?.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legal_representative_name">Representante legal</Label>
          <Input
            id="legal_representative_name"
            name="legal_representative_name"
            defaultValue={defaultValues?.legal_representative_name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legal_representative_rut">RUT representante legal</Label>
          <Input
            id="legal_representative_rut"
            name="legal_representative_rut"
            defaultValue={defaultValues?.legal_representative_rut ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
