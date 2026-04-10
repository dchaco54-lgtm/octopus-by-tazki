import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProductFormData {
  code?: string;
  name?: string;
  description?: string | null;
  category?: string;
  billing_type?: string;
  base_price_uf?: number;
  is_active?: boolean;
  affects_mrr?: boolean;
  affects_revenue?: boolean;
  allow_manual_override?: boolean;
  depends_on_plan?: boolean;
  is_legacy?: boolean;
  allow_upsell?: boolean;
  allow_cross_sell?: boolean;
}

interface ProductFormProps {
  action: (formData: FormData) => void;
  defaultValues?: ProductFormData;
  submitLabel: string;
}

export function ProductForm({ action, defaultValues, submitLabel }: ProductFormProps) {
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Codigo</Label>
          <Input id="code" name="code" defaultValue={defaultValues?.code ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            name="category"
            defaultValue={defaultValues?.category ?? "plan"}
            className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
          >
            <option value="plan">Plan</option>
            <option value="addon">Addon</option>
            <option value="service">Servicio</option>
            <option value="implementation">Implementacion</option>
            <option value="support">Soporte</option>
            <option value="one_time">One-time</option>
            <option value="legacy">Legacy</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_type">Tipo de facturacion</Label>
          <select
            id="billing_type"
            name="billing_type"
            defaultValue={defaultValues?.billing_type ?? "recurrente"}
            className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
          >
            <option value="recurrente">Recurrente</option>
            <option value="no_recurrente">No recurrente</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="base_price_uf">Precio base (UF)</Label>
          <Input
            id="base_price_uf"
            name="base_price_uf"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.base_price_uf?.toString() ?? "0"}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripcion</Label>
        <Textarea id="description" name="description" defaultValue={defaultValues?.description ?? ""} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={defaultValues?.is_active ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Activo
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="affects_mrr"
            defaultChecked={defaultValues?.affects_mrr ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Suma MRR
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="affects_revenue"
            defaultChecked={defaultValues?.affects_revenue ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Suma revenue
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="allow_upsell"
            defaultChecked={defaultValues?.allow_upsell ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Permite upsell
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="allow_cross_sell"
            defaultChecked={defaultValues?.allow_cross_sell ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Permite cross-sell
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="allow_manual_override"
            defaultChecked={defaultValues?.allow_manual_override ?? true}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Override manual
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="depends_on_plan"
            defaultChecked={defaultValues?.depends_on_plan ?? false}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Depende de plan
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
          <input
            type="checkbox"
            name="is_legacy"
            defaultChecked={defaultValues?.is_legacy ?? false}
            className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
          />
          Legacy/manual
        </label>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
