import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ERP_ASIDE_PANEL_CLASSNAME, ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import {
  getProductsCatalogCounts,
  listPricingRules,
  listPricingStrategies,
  listPricingVariables,
  listProducts,
  listSalesChannels,
  listSalesExecutives,
} from "@/services/products-service";

interface ProductsPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    active?: string;
  }>;
}

const productTabs = [
  { key: "plans", label: "Planes" },
  { key: "addons", label: "Addons" },
  { key: "services", label: "Servicios" },
  { key: "variables", label: "Variables" },
  { key: "strategies", label: "Estrategias" },
  { key: "rules", label: "Reglas" },
  { key: "channels", label: "Canales" },
  { key: "executives", label: "Ejecutivos" },
] as const;

function formatUf(value: number) {
  return `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} UF`;
}

function mapBillingType(value: string | null | undefined) {
  if (value === "recurrente") return "Recurrente";
  if (value === "no_recurrente") return "No recurrente";
  return value ?? "-";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "plans";
  const activeTab = productTabs.some((item) => item.key === tab) ? tab : "plans";
  const q = params.q ?? "";
  const active = params.active ?? "all";

  const [plans, addons, services, variables, strategies, rules, channels, executives] = await Promise.all([
    activeTab === "plans" ? listProducts({ q, active, category: "plan" }) : Promise.resolve([]),
    activeTab === "addons" ? listProducts({ q, active, category: "addon" }) : Promise.resolve([]),
    activeTab === "services"
      ? listProducts({ q, active, categories: ["service", "implementation", "support", "one_time", "legacy"] })
      : Promise.resolve([]),
    activeTab === "variables" ? listPricingVariables({ active }) : Promise.resolve([]),
    activeTab === "strategies" ? listPricingStrategies({ active }) : Promise.resolve([]),
    activeTab === "rules" ? listPricingRules() : Promise.resolve([]),
    activeTab === "channels" ? listSalesChannels({ active }) : Promise.resolve([]),
    activeTab === "executives" ? listSalesExecutives({ active }) : Promise.resolve([]),
  ]);

  const totals = await getProductsCatalogCounts();

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <div className="border-b border-[var(--tazki-slate-200)] pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">Catalogo</p>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Productos</h1>
                <p className="text-sm text-[var(--tazki-slate-500)]">
                  Configura planes, addons y servicios. Base para Suscripciones, Facturacion y Revenue Analytics.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/products/new">
                  <Button className="h-9 px-4 text-sm">Crear producto</Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="sticky top-[73px] z-10 -mx-5 border-b border-[var(--tazki-slate-200)] bg-white/96 px-5 py-1.5 backdrop-blur">
              <div className="flex flex-wrap gap-1.5">
                {productTabs.map((item) => {
                  const selected = activeTab === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={`/products?tab=${item.key}`}
                      className={`rounded-md border px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                        selected
                          ? "border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-900)] text-white"
                          : "border-transparent bg-transparent text-[var(--tazki-slate-600)] hover:bg-[var(--tazki-slate-100)] hover:text-[var(--tazki-slate-950)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <form className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar por nombre o codigo"
                  className="h-9 rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none transition focus:border-[var(--tazki-blue-300)]"
                />
                <select
                  name="active"
                  defaultValue={active}
                  className="h-9 rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none transition focus:border-[var(--tazki-blue-300)]"
                >
                  <option value="all">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
                <input type="hidden" name="tab" value={activeTab} />
                <Button type="submit" className="h-9 px-4 text-sm">
                  Filtrar
                </Button>
              </form>

              {activeTab === "plans" || activeTab === "addons" || activeTab === "services" ? (
                <div className="mb-3 flex items-center justify-end">
                  <Link
                    href={`/products/new?category=${activeTab === "plans" ? "plan" : activeTab === "addons" ? "addon" : "service"}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-50)] px-3 text-[13px] font-semibold text-[var(--tazki-blue-900)] transition hover:bg-[var(--tazki-blue-100)]"
                  >
                    {activeTab === "plans" ? "Crear plan" : activeTab === "addons" ? "Crear addon" : "Crear servicio"}
                  </Link>
                </div>
              ) : null}

              {activeTab === "plans" || activeTab === "addons" || activeTab === "services" ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Facturacion</TableHead>
                        <TableHead>MRR</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Precio base</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const rows = activeTab === "plans" ? plans : activeTab === "addons" ? addons : services;
                        if (rows.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={9} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                                No hay registros para este filtro.
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-semibold text-[var(--tazki-slate-950)]">{row.code}</TableCell>
                            <TableCell>
                              <p className="font-medium text-[var(--tazki-slate-900)]">{row.name}</p>
                              <p className="text-xs text-[var(--tazki-slate-500)]">{row.description ?? "Sin descripcion"}</p>
                            </TableCell>
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{mapBillingType(row.billing_type)}</TableCell>
                            <TableCell>{row.affects_mrr ? "Si" : "No"}</TableCell>
                            <TableCell>{row.affects_revenue ? "Si" : "No"}</TableCell>
                            <TableCell>{formatUf(Number(row.base_price_uf ?? 0))}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/products/${row.id}`} className="font-semibold text-[var(--tazki-blue-700)]">
                                Ver
                              </Link>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {activeTab === "variables" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Link
                      href="/products/variables/new"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-50)] px-3 text-[13px] font-semibold text-[var(--tazki-blue-900)] transition hover:bg-[var(--tazki-blue-100)]"
                    >
                      Crear variable
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Editar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variables.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay variables registradas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        variables.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-semibold text-[var(--tazki-slate-950)]">{row.variable_code}</TableCell>
                            <TableCell>
                              <p className="font-medium text-[var(--tazki-slate-900)]">{row.name}</p>
                              <p className="text-xs text-[var(--tazki-slate-500)]">{row.description ?? "-"}</p>
                            </TableCell>
                            <TableCell>{row.variable_type}</TableCell>
                            <TableCell>{row.unit ?? "-"}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/products/variables/${row.id}/edit`} className="font-semibold text-[var(--tazki-blue-700)]">
                                Editar
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "strategies" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Link
                      href="/products/pricing-strategies/new"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-50)] px-3 text-[13px] font-semibold text-[var(--tazki-blue-900)] transition hover:bg-[var(--tazki-blue-100)]"
                    >
                      Crear estrategia
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Vigencia</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Editar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {strategies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay estrategias registradas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        strategies.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-semibold text-[var(--tazki-slate-950)]">{row.code}</TableCell>
                            <TableCell>
                              <p className="font-medium text-[var(--tazki-slate-900)]">{row.name}</p>
                              <p className="text-xs text-[var(--tazki-slate-500)]">{row.description ?? "-"}</p>
                            </TableCell>
                            <TableCell>{row.version ?? 1}</TableCell>
                            <TableCell>{row.valid_from ?? "-"} {row.valid_to ? `a ${row.valid_to}` : ""}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/products/pricing-strategies/${row.id}/edit`}
                                className="font-semibold text-[var(--tazki-blue-700)]"
                              >
                                Editar
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "rules" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Link
                      href="/products/pricing-rules/new"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-50)] px-3 text-[13px] font-semibold text-[var(--tazki-blue-900)] transition hover:bg-[var(--tazki-blue-100)]"
                    >
                      Crear regla
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estrategia</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Valor UF</TableHead>
                        <TableHead>Rango</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Editar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay reglas registradas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.pricing_strategy?.code ?? "-"}</TableCell>
                            <TableCell>
                              {row.target_type === "variable"
                                ? `${row.target_variable?.variable_code ?? "-"} · ${row.target_variable?.name ?? "-"}`
                                : `${row.target_product?.code ?? "-"} · ${row.target_product?.name ?? "-"}`}
                            </TableCell>
                            <TableCell>{row.pricing_mode}</TableCell>
                            <TableCell>{row.value_uf ? formatUf(Number(row.value_uf)) : "-"}</TableCell>
                            <TableCell>
                              {row.min_value || row.max_value ? `${row.min_value ?? "-"} - ${row.max_value ?? "-"}` : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/products/pricing-rules/${row.id}/edit`} className="font-semibold text-[var(--tazki-blue-700)]">
                                Editar
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "channels" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Link
                      href="/products/channels/new"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-blue-200)] bg-[var(--tazki-blue-50)] px-3 text-[13px] font-semibold text-[var(--tazki-blue-900)] transition hover:bg-[var(--tazki-blue-100)]"
                    >
                      Crear canal
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripcion</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead className="text-right">Editar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay canales registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        channels.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-semibold text-[var(--tazki-slate-950)]">{row.channel_code}</TableCell>
                            <TableCell className="font-medium text-[var(--tazki-slate-900)]">{row.name}</TableCell>
                            <TableCell className="text-[13px] text-[var(--tazki-slate-600)]">{row.description ?? "-"}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/products/channels/${row.id}/edit`} className="font-semibold text-[var(--tazki-blue-700)]">
                                Editar
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "executives" ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Activo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executives.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay ejecutivos registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        executives.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-[var(--tazki-slate-900)]">{row.full_name ?? "-"}</TableCell>
                            <TableCell className="text-[13px] text-[var(--tazki-slate-600)]">{row.email}</TableCell>
                            <TableCell>{row.role}</TableCell>
                            <TableCell>
                              <Badge variant={row.is_active ? "success" : "default"}>{row.is_active ? "Activo" : "Inactivo"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-[88px] xl:self-start">
          <div className={ERP_ASIDE_PANEL_CLASSNAME}>
            <div className="space-y-3 p-3">
              <div className="border-b border-[var(--tazki-slate-200)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">Resumen</p>
                <p className="mt-1 text-sm text-[var(--tazki-slate-600)]">Catalogo de configuracion para revenue systems.</p>
              </div>

              <div className="space-y-2 text-[13px] text-[var(--tazki-slate-700)]">
                <p>Planes: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.plans}</span></p>
                <p>Addons: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.addons}</span></p>
                <p>Servicios: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.services}</span></p>
                <p>Variables: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.variables}</span></p>
                <p>Estrategias: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.strategies}</span></p>
                <p>Reglas: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.rules}</span></p>
                <p>Canales: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.channels}</span></p>
                <p>Ejecutivos: <span className="font-semibold text-[var(--tazki-slate-950)]">{totals.executives}</span></p>
              </div>

              <div className="pt-2">
                <Link href="/subscriptions">
                  <Button variant="outline" className="h-9 w-full justify-center text-sm">
                    Ir a Suscripciones
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
