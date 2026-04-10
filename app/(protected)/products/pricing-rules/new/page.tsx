import Link from "next/link";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { createPricingRuleAction } from "@/modules/products/catalog-actions";
import { listPricingStrategies, listPricingVariables, listProducts } from "@/services/products-service";

interface NewPricingRulePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewPricingRulePage({ searchParams }: NewPricingRulePageProps) {
  const params = await searchParams;
  const [strategies, variables, products] = await Promise.all([
    listPricingStrategies({ active: "true" }),
    listPricingVariables({ active: "true" }),
    listProducts({ active: "true" }),
  ]);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Nueva regla</h1>
          <Link href="/products?tab=rules" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Volver
          </Link>
        </div>

        <div className="pt-4">
          {params.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>
          ) : null}

          <form action={createPricingRuleAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Estrategia</span>
                <select
                  name="pricing_strategy_id"
                  required
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
                <select name="target_type" defaultValue="plan" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                  <option value="plan">Plan</option>
                  <option value="addon">Addon</option>
                  <option value="service">Servicio</option>
                  <option value="variable">Variable</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Target producto</span>
                <select name="target_product_id" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
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
                <select name="target_variable_id" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
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
                <select name="pricing_mode" defaultValue="fixed" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                  <option value="fixed">Fixed</option>
                  <option value="per_unit">Per unit</option>
                  <option value="range">Range</option>
                  <option value="formula">Formula</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Valor UF</span>
                <input name="value_uf" type="number" step="0.01" min="0" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Min</span>
                <input name="min_value" type="number" step="0.01" min="0" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Max</span>
                <input name="max_value" type="number" step="0.01" min="0" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Formula</span>
              <textarea name="formula_text" rows={3} className="w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 py-2 text-sm" />
              <p className="text-xs text-[var(--tazki-slate-500)]">
                Para MVP, la formula es texto. La evaluacion se implementa en fase 2.
              </p>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[var(--tazki-slate-700)]">
              <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-[var(--tazki-slate-300)]" />
              Activa
            </label>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--tazki-blue-900)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--tazki-blue-700)]"
            >
              Crear regla
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

