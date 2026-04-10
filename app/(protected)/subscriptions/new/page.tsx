import Link from "next/link";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSubscriptionAction } from "@/modules/subscriptions/actions";
import { listPricingStrategies, listProducts, listSalesChannels, listSalesExecutives } from "@/services/products-service";

interface NewSubscriptionPageProps {
  searchParams: Promise<{ error?: string; previous?: string; movement?: string }>;
}

function todayISO() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

export default async function NewSubscriptionPage({ searchParams }: NewSubscriptionPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const previousId = params.previous?.trim() || "";
  const movement = (params.movement?.trim() || "").toLowerCase();
  const isUpsellFlow = previousId.length > 0 && (movement === "upsell" || movement === "downsell");

  const previousSubscription = previousId
    ? await supabase
        .from("subscriptions")
        .select("id, customer_id, pricing_strategy_id, sales_executive_id, channel, payer_name, payer_rut, billing_type, recurrence")
        .eq("id", previousId)
        .maybeSingle()
    : null;

  const previousRow = previousSubscription?.data ?? null;
  const previousItems = previousId
    ? await supabase
        .from("subscription_items")
        .select("product_id, description, quantity, unit_price_uf")
        .eq("subscription_id", previousId)
        .order("created_at", { ascending: true })
    : null;
  const seedItems =
    (previousItems?.data ?? []).map((row) => ({
      product_id: row.product_id ?? "",
      description: row.description ?? "",
      quantity: String(row.quantity ?? 1),
      unit_price_uf: String(row.unit_price_uf ?? ""),
    })) ?? [];

  const customerForPrevious =
    previousRow?.customer_id
      ? await supabase.from("companies").select("id, trade_name, legal_name, rut").eq("id", previousRow.customer_id).maybeSingle()
      : null;
  const customerLabel =
    customerForPrevious?.data?.trade_name ?? customerForPrevious?.data?.legal_name ?? "";
  const customerRut = customerForPrevious?.data?.rut ?? "";
  const [{ data: companies }, strategies, products, channels, executives] = await Promise.all([
    supabase.from("companies").select("id, trade_name, legal_name, rut").order("trade_name", { ascending: true }),
    listPricingStrategies({ active: "true" }),
    listProducts({ active: "true" }),
    listSalesChannels({ active: "true" }),
    listSalesExecutives({ active: "true" }),
  ]);

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">
            Crear suscripcion{movement ? ` (${movement})` : ""}
          </h1>
          <Link href="/subscriptions" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Volver
          </Link>
        </div>

        <div className="pt-4">
          {params.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>
          ) : null}

          <form action={createSubscriptionAction} className="space-y-6">
            {previousRow ? <input type="hidden" name="previous_subscription_id" value={previousRow.id} /> : null}
            {isUpsellFlow ? <input type="hidden" name="movement" value={movement} /> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Cliente</span>
                {isUpsellFlow ? (
                  <>
                    <input type="hidden" name="customer_id" value={previousRow?.customer_id ?? ""} />
                    <div className="flex h-10 w-full items-center rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 text-sm text-[var(--tazki-slate-900)]">
                      {customerLabel ? `${customerLabel}${customerRut ? ` · ${customerRut}` : ""}` : "Cliente"}
                    </div>
                  </>
                ) : (
                  <select
                    name="customer_id"
                    required
                    defaultValue={previousRow?.customer_id ?? ""}
                    className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {(companies ?? []).map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.trade_name ?? company.legal_name} · {company.rut}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Estado</span>
                <select name="status" defaultValue="active" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                  <option value="demo">Demo</option>
                  <option value="active">Activa</option>
                  <option value="closed">Cerrada</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Motivo cierre (si aplica)</span>
                {isUpsellFlow ? (
                  <>
                    <input type="hidden" name="close_reason" value={movement} />
                    <div className="flex h-10 w-full items-center rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 text-sm text-[var(--tazki-slate-900)]">
                      {movement === "upsell" ? "Upsell" : "Downsell"}
                    </div>
                  </>
                ) : (
                  <select name="close_reason" defaultValue="" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm">
                    <option value="">-</option>
                    <option value="new">New</option>
                    <option value="upsell">Upsell</option>
                    <option value="downsell">Downsell</option>
                    <option value="churn">Churn</option>
                  </select>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Fecha inicio</span>
                <input
                  name="start_date"
                  type="date"
                  defaultValue={todayISO()}
                  required
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Tipo facturacion</span>
                <select
                  name="billing_type"
                  defaultValue={previousRow?.billing_type ?? "recurrente"}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="recurrente">Recurrente</option>
                  <option value="no_recurrente">No recurrente</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Recurrencia</span>
                <select
                  name="recurrence"
                  defaultValue={previousRow?.recurrence ?? "mensual"}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Proxima facturacion (opcional)</span>
                <input name="next_billing_date" type="date" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Pricing strategy</span>
                <select
                  name="pricing_strategy_id"
                  defaultValue={previousRow?.pricing_strategy_id ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="">-</option>
                  {strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.code} · {strategy.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Ejecutivo</span>
                <select
                  name="sales_executive_id"
                  defaultValue={previousRow?.sales_executive_id ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                >
                  <option value="">-</option>
                  {executives.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {exec.full_name ?? exec.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Canal</span>
                {isUpsellFlow ? (
                  <>
                    <input type="hidden" name="channel" value={movement} />
                    <div className="flex h-10 w-full items-center rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 text-sm text-[var(--tazki-slate-900)]">
                      {movement === "upsell" ? "Upsell" : "Downsell"}
                    </div>
                  </>
                ) : (
                  <select
                    name="channel"
                    defaultValue={previousRow?.channel ?? ""}
                    className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                  >
                    <option value="">-</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.name}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">HubSpot deal</span>
                <input name="hubspot_deal_id" className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">Cliente pagador</span>
                <input
                  name="payer_name"
                  defaultValue={previousRow?.payer_name ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--tazki-slate-700)]">RUT pagador</span>
                <input
                  name="payer_rut"
                  defaultValue={previousRow?.payer_rut ?? ""}
                  className="h-10 w-full rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
                />
              </label>
            </div>

            <div className="border-t border-[var(--tazki-slate-200)] pt-4">
              <p className="text-sm font-semibold text-[var(--tazki-slate-900)]">Productos</p>
              <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">
                Deja filas vacias si no aplican. Cada item debe tener precio UF mayor a 0.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[860px] table-fixed border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">
                      <th className="border-b border-[var(--tazki-slate-200)] px-2 pb-2">Producto</th>
                      <th className="border-b border-[var(--tazki-slate-200)] px-2 pb-2">Descripcion</th>
                      <th className="border-b border-[var(--tazki-slate-200)] px-2 pb-2">Cantidad</th>
                      <th className="border-b border-[var(--tazki-slate-200)] px-2 pb-2">Precio UF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(5, seedItems.length + 2) }).map((_, index) => (
                      <tr key={index} className="border-b border-[var(--tazki-slate-100)]">
                        <td className="px-2 py-2">
                          <select
                            name="product_id[]"
                            defaultValue={seedItems[index]?.product_id ?? ""}
                            className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                          >
                            <option value="">-</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.code} · {product.name} ({product.category})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            name="description[]"
                            defaultValue={seedItems[index]?.description ?? ""}
                            className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            name="quantity[]"
                            type="number"
                            step="1"
                            min="1"
                            defaultValue={seedItems[index]?.quantity ?? "1"}
                            className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            name="unit_price_uf[]"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={seedItems[index]?.unit_price_uf ?? ""}
                            className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--tazki-blue-900)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--tazki-blue-700)]"
            >
              Crear suscripcion
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
