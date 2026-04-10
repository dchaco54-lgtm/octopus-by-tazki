import Link from "next/link";
import { notFound } from "next/navigation";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { updatePricingStrategyAction } from "@/modules/products/catalog-actions";
import { getPricingStrategyById } from "@/services/products-service";

interface EditPricingStrategyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditPricingStrategyPage({ params, searchParams }: EditPricingStrategyPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const strategy = await getPricingStrategyById(id);

  if (!strategy) {
    notFound();
  }

  const boundAction = updatePricingStrategyAction.bind(null, id);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Editar estrategia</h1>
          <Link href="/products?tab=strategies" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Volver
          </Link>
        </div>

        <div className="pt-4">
          {query.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{query.error}</p>
          ) : null}

          <form action={boundAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Codigo</span>
                <input
                  name="code"
                  required
                  defaultValue={strategy.code ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Nombre</span>
                <input
                  name="name"
                  required
                  defaultValue={strategy.name ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Version</span>
                <input
                  name="version"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={(strategy.version ?? 1).toString()}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Vigencia desde</span>
                <input
                  name="valid_from"
                  type="date"
                  defaultValue={strategy.valid_from ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Vigencia hasta</span>
                <input
                  name="valid_to"
                  type="date"
                  defaultValue={strategy.valid_to ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Descripcion</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={strategy.description ?? ""}
                className="w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={strategy.is_active ?? true}
                className="h-4 w-4 rounded border-[var(--tazki-slate-300)]"
              />
              Activa
            </label>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--tazki-blue-900)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--tazki-blue-700)]"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

