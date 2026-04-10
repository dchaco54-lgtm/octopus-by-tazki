import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSubscriptionDetailSafe } from "@/services/subscriptions-service";
import { listSalesChannels, listSalesExecutives } from "@/services/products-service";
import { updateSubscriptionSummaryAction } from "@/modules/subscriptions/actions";
import { SubscriptionHeaderActions } from "@/modules/subscriptions/subscription-header-actions";

const tabs = [
  { key: "products", label: "Productos" }, // Siempre primero.
  { key: "changes", label: "Cambios" },
  { key: "information", label: "Otra informacion" },
  { key: "integrations", label: "Integraciones" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatUf(value: number) {
  return `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} UF`;
}

function renderValue(value: string | null | undefined) {
  if (!value) return "-";
  return value;
}

function mapStatus(status: string) {
  if (status === "active") return { label: "Activa", variant: "success" as const };
  if (status === "demo") return { label: "Demo", variant: "warning" as const };
  return { label: "Cerrada", variant: "default" as const };
}

function mapRecurrence(value: string | null) {
  if (value === "mensual") return "Mensual";
  if (value === "trimestral") return "Trimestral";
  if (value === "semestral") return "Semestral";
  if (value === "anual") return "Anual";
  if (value === "custom") return "Custom";
  return value ?? "-";
}

function SummaryField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3 py-1">
      <span className="text-[11px] font-semibold text-[var(--tazki-slate-500)]">{label}</span>
      <div className="min-w-0 text-[13px] text-[var(--tazki-slate-950)]">{value}</div>
    </div>
  );
}

export async function SubscriptionDetailScreen({
  subscriptionId,
  tab,
  baseHref,
  edit,
  errorMessage,
}: {
  subscriptionId: string;
  tab?: string;
  baseHref: string;
  edit?: boolean;
  errorMessage?: string;
}) {
  const activeTab = tabs.some((t) => t.key === tab) ? (tab as (typeof tabs)[number]["key"]) : "products";
  const detail = await getSubscriptionDetailSafe(subscriptionId);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("user_profiles").select("role").eq("auth_user_id", user.id).maybeSingle()
    : { data: null as { role: string } | null };
  const canManage = profile?.role === "admin" || profile?.role === "editor";

  if (!detail.ok) {
    return (
      <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--tazki-slate-200)] pb-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--tazki-slate-950)]">Suscripcion</h1>
            <Link href="/subscriptions" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
              Volver
            </Link>
          </div>
          <div className="pt-4">
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{detail.error}</p>
          </div>
        </div>
      </section>
    );
  }

  const { subscription, items, logs, syncEvents } = detail.data;
  const showStatus = canManage || subscription.status === "active";
  const status = mapStatus(subscription.status);
  const customerName = subscription.customer?.trade_name ?? subscription.customer?.legal_name ?? "Cliente sin nombre";
  const executive = subscription.sales_executive?.full_name ?? subscription.sales_owner_name ?? "-";

  const isEditing = Boolean(edit && canManage);
  const [channels, executives] = isEditing
    ? await Promise.all([listSalesChannels({ active: "true" }), listSalesExecutives({ active: "true" })])
    : [[], []];

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
        <div className="border-b border-[var(--tazki-slate-200)] pb-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tazki-slate-400)]">Suscripciones</p>
                {showStatus ? <Badge variant={status.variant}>{status.label}</Badge> : null}
              </div>
              <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-[var(--tazki-slate-950)]">
                {subscription.subscription_code} - {customerName}
              </h1>
            </div>
            <SubscriptionHeaderActions
              subscriptionId={subscription.id}
              activeTab={activeTab}
              canManage={canManage}
              isEditing={isEditing}
              currentStatus={subscription.status}
              currentCloseReason={subscription.close_reason ?? null}
              currentEndDate={subscription.end_date ?? null}
            />
          </div>

          {errorMessage ? (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{errorMessage}</p>
          ) : null}

          {(() => {
            const summaryGrid = (
              <div className="mt-2.5 grid gap-x-10 gap-y-0.5 md:grid-cols-2">
                <div>
                  <SummaryField
                    label="Cliente"
                    value={
                      subscription.customer?.id ? (
                        <Link href={`/clients/${subscription.customer.id}`} className="font-semibold text-[var(--tazki-blue-700)]">
                          {customerName}
                        </Link>
                      ) : (
                        customerName
                      )
                    }
                  />
                  <SummaryField label="RUT" value={subscription.customer?.rut ?? "-"} />
                  <SummaryField
                    label="Fecha de inicio"
                    value={
                      isEditing ? (
                        <input
                          name="start_date"
                          type="date"
                          defaultValue={subscription.start_date ?? ""}
                          className="h-8 w-full max-w-[220px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        />
                      ) : (
                        formatDate(subscription.start_date)
                      )
                    }
                  />
                  <SummaryField
                    label="Fecha prox factura"
                    value={
                      isEditing ? (
                        <input
                          name="next_billing_date"
                          type="date"
                          defaultValue={subscription.next_billing_date ?? ""}
                          className="h-8 w-full max-w-[220px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        />
                      ) : (
                        formatDate(subscription.next_billing_date)
                      )
                    }
                  />
                  <SummaryField
                    label="Tipo de cobro"
                    value={
                      isEditing ? (
                        <select
                          name="recurrence"
                          defaultValue={subscription.recurrence ?? "mensual"}
                          className="h-8 w-full max-w-[220px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        >
                          <option value="mensual">Mensual</option>
                          <option value="trimestral">Trimestral</option>
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                          <option value="custom">Custom</option>
                        </select>
                      ) : (
                        mapRecurrence(subscription.recurrence)
                      )
                    }
                  />
                </div>
                <div>
                  <SummaryField
                    label="Ejecutivo de venta"
                    value={
                      isEditing ? (
                        <select
                          name="sales_executive_id"
                          defaultValue={subscription.sales_executive?.id ?? ""}
                          className="h-8 w-full max-w-[260px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        >
                          <option value="">-</option>
                          {executives.map((exec) => (
                            <option key={exec.id} value={exec.id}>
                              {exec.full_name ?? exec.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        executive
                      )
                    }
                  />
                  <SummaryField
                    label="Canal"
                    value={
                      isEditing ? (
                        <select
                          name="channel"
                          defaultValue={subscription.channel ?? ""}
                          className="h-8 w-full max-w-[260px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        >
                          <option value="">-</option>
                          {channels.map((ch) => (
                            <option key={ch.id} value={ch.name}>
                              {ch.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        renderValue(subscription.channel)
                      )
                    }
                  />
                  <SummaryField
                    label="ID HubSpot"
                    value={
                      isEditing ? (
                        <input
                          name="hubspot_deal_id"
                          defaultValue={subscription.hubspot_deal_id ?? ""}
                          className="h-8 w-full max-w-[260px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        />
                      ) : (
                        renderValue(subscription.hubspot_deal_id)
                      )
                    }
                  />
                  <SummaryField
                    label="Fecha fin"
                    value={
                      isEditing ? (
                        <input
                          name="end_date"
                          type="date"
                          defaultValue={subscription.end_date ?? ""}
                          className="h-8 w-full max-w-[220px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        />
                      ) : (
                        formatDate(subscription.end_date)
                      )
                    }
                  />
                  <SummaryField
                    label="Fecha suspension"
                    value={
                      isEditing ? (
                        <input
                          name="suspension_date"
                          type="date"
                          defaultValue={subscription.suspension_date ?? ""}
                          className="h-8 w-full max-w-[220px] rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                        />
                      ) : (
                        formatDate(subscription.suspension_date)
                      )
                    }
                  />
                </div>
              </div>
            );

            if (!isEditing) return summaryGrid;

            return (
              <form id="subscription-summary-form" action={updateSubscriptionSummaryAction}>
                <input type="hidden" name="subscription_id" value={subscription.id} />
                <input type="hidden" name="tab" value={activeTab} />
                {summaryGrid}
              </form>
            );
          })()}
        </div>

        <div className="mt-3.5">
          <div className="-mx-5 border-b border-[var(--tazki-slate-200)] px-5">
            <nav className="flex flex-wrap gap-0.5">
              {tabs.map((t) => {
                const selected = activeTab === t.key;
                return (
                  <Link
                    key={t.key}
                    href={`${baseHref}?tab=${t.key}${isEditing ? "&edit=1" : ""}`}
                    prefetch={false}
                    className={`-mb-px rounded-t-md border border-[var(--tazki-slate-200)] px-3 py-2 text-[13px] font-semibold ${
                      selected
                        ? "border-b-white bg-white text-[var(--tazki-slate-950)]"
                        : "border-b-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] text-[var(--tazki-slate-600)] hover:bg-white hover:text-[var(--tazki-slate-950)]"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-2.5">
            {activeTab === "products" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead className="w-[120px]">Cantidad</TableHead>
                      <TableHead className="w-[140px]">Precio un.</TableHead>
                      <TableHead className="w-[140px]">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-[var(--tazki-slate-500)]">
                          No hay productos cargados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium text-[var(--tazki-slate-950)]">{item.product?.name ?? item.product_name ?? "-"}</p>
                          </TableCell>
                          <TableCell className="text-[13px] text-[var(--tazki-slate-700)]">{item.description ?? "-"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatUf(item.unit_price_uf)}</TableCell>
                          <TableCell className="font-medium text-[var(--tazki-slate-950)]">{formatUf(item.total_price_uf)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {activeTab === "changes" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Delta UF</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-[var(--tazki-slate-500)]">
                          No hay cambios registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                          <TableCell className="font-medium text-[var(--tazki-slate-950)]">{log.event_type}</TableCell>
                          <TableCell>{log.field_changed ?? "-"}</TableCell>
                          <TableCell>{log.delta_uf ? formatUf(log.delta_uf) : "-"}</TableCell>
                          <TableCell className="min-w-[220px]">
                            <p>{log.changed_by ?? "system"}</p>
                            {log.old_value || log.new_value ? (
                              <p className="text-xs text-[var(--tazki-slate-500)]">
                                {renderValue(log.old_value)} → {renderValue(log.new_value)}
                              </p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {activeTab === "information" ? (
              <div className="grid gap-x-12 gap-y-2 md:grid-cols-2">
                <div>
                  <SummaryField label="Cliente pagador" value={renderValue(subscription.payer_name)} />
                  <SummaryField label="RUT pagador" value={renderValue(subscription.payer_rut)} />
                  <SummaryField label="Pricing strategy" value={subscription.pricing_strategy?.name ?? "-"} />
                  <SummaryField label="Suscripcion previa" value={subscription.previous_subscription?.subscription_code ?? "-"} />
                </div>
                <div>
                  <SummaryField label="Tipo facturacion" value={renderValue(subscription.billing_type)} />
                  <SummaryField label="Motivo cierre" value={renderValue(subscription.close_reason)} />
                  <SummaryField label="MRR total" value={formatUf(subscription.total_mrr_uf)} />
                </div>
              </div>
            ) : null}

            {activeTab === "integrations" ? (
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Middleware</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{subscription.middleware_sync_status ?? "-"}</p>
                    <p className="text-xs text-[var(--tazki-slate-500)]">
                      Ultimo evento: {subscription.middleware_last_event ?? "-"} · {formatDateTime(subscription.middleware_last_synced_at)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">HubSpot</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--tazki-slate-950)]">{subscription.hubspot_sync_status ?? "-"}</p>
                    <p className="text-xs text-[var(--tazki-slate-500)]">
                      Deal {subscription.hubspot_deal_id ?? "-"} · {formatDateTime(subscription.hubspot_last_synced_at)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Payload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-[var(--tazki-slate-500)]">
                            No hay eventos de integracion.
                          </TableCell>
                        </TableRow>
                      ) : (
                        syncEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="whitespace-nowrap">{formatDateTime(event.created_at)}</TableCell>
                            <TableCell>{event.provider}</TableCell>
                            <TableCell>{event.event_type}</TableCell>
                            <TableCell>{event.status}</TableCell>
                            <TableCell className="max-w-[360px] truncate text-xs text-[var(--tazki-slate-500)]">
                              {event.payload ? JSON.stringify(event.payload) : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
