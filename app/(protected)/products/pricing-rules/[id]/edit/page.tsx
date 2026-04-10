import Link from "next/link";
import { notFound } from "next/navigation";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { updatePricingRuleAction } from "@/modules/products/catalog-actions";
import { getPricingRuleById, listPricingStrategies, listPricingVariables, listProducts } from "@/services/products-service";

interface EditPricingRulePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditPricingRulePage({ params, searchParams }: EditPricingRulePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [rule, strategies, variables, products] = await Promise.all([
    getPricingRuleById(id),
    listPricingStrategies({}),
    listPricingVariables({}),
    listProducts({}),
  ]);

  if (!rule) {
    notFound();
  }

  const boundAction = updatePricingRuleAction.bind(null, id);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Editar regla</h1>
          <Link href="/products?tab=rules" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
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
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Estrategia</span>
                <select
                  name="pricing_strategy_id"
                  required
                  defaultValue={rule.pricing_strategy_id ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.code} · {strategy.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Target type</span>
                <select
                  name="target_type"
                  defaultValue={rule.target_type ?? "plan"}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="plan">Plan</option>
                  <option value="addon">Addon</option>
                  <option value="service">Servicio</option>
                  <option value="variable">Variable</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Target producto</span>
                <select
                  name="target_product_id"
                  defaultValue={rule.target_product_id ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} · {product.name} ({product.category})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Target variable</span>
                <select
                  name="target_variable_id"
                  defaultValue={rule.target_variable_id ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {variables.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.variable_code} · {variable.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Pricing mode</span>
                <select
                  name="pricing_mode"
                  defaultValue={rule.pricing_mode ?? "fixed"}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="fixed">Fixed</option>
                  <option value="per_unit">Per unit</option>
                  <option value="range">Range</option>
                  <option value="formula">Formula</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Valor UF</span>
                <input
                  name="value_uf"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={rule.value_uf ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Min</span>
                <input
                  name="min_value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={rule.min_value ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Max</span>
                <input
                  name="max_value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={rule.max_value ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Formula</span>
              <textarea
                name="formula_text"
                rows={3}
                defaultValue={rule.formula_text ?? ""}
                className="w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={rule.is_active ?? true}
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
