"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countActiveFilters } from "@/modules/billing/list-view/helpers";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";
import type { BillingViewFilters } from "@/modules/billing/list-view/types";

interface BillingFilterMenuProps {
  filters: BillingViewFilters;
  customerOptions: Array<{ id: string; label: string; meta: string }>;
  onChange: (filters: BillingViewFilters) => void;
}

export function BillingFilterMenu({ filters, customerOptions, onChange }: BillingFilterMenuProps) {
  const activeCount = countActiveFilters(filters);

  function update<K extends keyof BillingViewFilters>(key: K, value: BillingViewFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <ToolbarDropdown label="Filtros" icon={<Filter className="h-4 w-4" />} count={activeCount} panelClassName="w-[344px]">
      {({ close }) => (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Filtros</p>
            <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Estado factura, estado pago, cliente y fechas operativas.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Estado factura
              <select
                value={filters.invoiceStatus}
                onChange={(event) => update("invoiceStatus", event.target.value as BillingViewFilters["invoiceStatus"])}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="all">Todas</option>
                <option value="draft">Borrador</option>
                <option value="issued">Emitida</option>
                <option value="pending_payment">Pendiente de pago</option>
                <option value="paid">Pagada</option>
                <option value="cancelled">Anulada</option>
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Estado pago
              <select
                value={filters.paymentStatus}
                onChange={(event) => update("paymentStatus", event.target.value as BillingViewFilters["paymentStatus"])}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente de pago</option>
                <option value="paid">Pagada</option>
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Cliente
              <select
                value={filters.customerId}
                onChange={(event) => update("customerId", event.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="">Todos los clientes</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Solo borradores
              <select
                value={filters.draftOnly}
                onChange={(event) => update("draftOnly", event.target.value as BillingViewFilters["draftOnly"])}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="all">Todas</option>
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Factura desde
                <input
                  type="date"
                  value={filters.invoiceDateFrom}
                  onChange={(event) => update("invoiceDateFrom", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Factura hasta
                <input
                  type="date"
                  value={filters.invoiceDateTo}
                  onChange={(event) => update("invoiceDateTo", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Vencimiento desde
                <input
                  type="date"
                  value={filters.dueDateFrom}
                  onChange={(event) => update("dueDateFrom", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Vencimiento hasta
                <input
                  type="date"
                  value={filters.dueDateTo}
                  onChange={(event) => update("dueDateTo", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...filters, invoiceStatus: "all", paymentStatus: "all", customerId: "", invoiceDateFrom: "", invoiceDateTo: "", dueDateFrom: "", dueDateTo: "", draftOnly: "all" })}>
              Limpiar
            </Button>
            <Button type="button" size="sm" onClick={close}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </ToolbarDropdown>
  );
}
