"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countActiveFilters } from "@/modules/subscriptions/list-view/helpers";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";
import { type SubscriptionViewFilters } from "@/modules/subscriptions/list-view/types";

interface SubscriptionFilterMenuProps {
  filters: SubscriptionViewFilters;
  customerOptions: Array<{ id: string; label: string; meta: string }>;
  productOptions: string[];
  onChange: (filters: SubscriptionViewFilters) => void;
}

export function SubscriptionFilterMenu({ filters, customerOptions, productOptions, onChange }: SubscriptionFilterMenuProps) {
  const activeCount = countActiveFilters(filters);

  function update<K extends keyof SubscriptionViewFilters>(key: K, value: SubscriptionViewFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <ToolbarDropdown label="Filtros" icon={<Filter className="h-4 w-4" />} count={activeCount} panelClassName="w-[344px]">
      {({ close }) => (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Filtros</p>
            <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Estado, cliente, producto y fechas operativas.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Estado
              <select
                value={filters.status}
                onChange={(event) => update("status", event.target.value as SubscriptionViewFilters["status"])}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="all">Todos</option>
                <option value="active">Activa</option>
                <option value="suspended">Suspendida</option>
                <option value="cancelled">Cancelada</option>
                <option value="onboarding">Onboarding</option>
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
              Producto
              <select
                value={filters.product}
                onChange={(event) => update("product", event.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="">Todos los productos</option>
                {productOptions.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
              Suspendidas
              <select
                value={filters.suspended}
                onChange={(event) => update("suspended", event.target.value as SubscriptionViewFilters["suspended"])}
                className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
              >
                <option value="all">Todas</option>
                <option value="yes">Si</option>
                <option value="no">No</option>
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Inicio desde
                <input
                  type="date"
                  value={filters.startDateFrom}
                  onChange={(event) => update("startDateFrom", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Inicio hasta
                <input
                  type="date"
                  value={filters.startDateTo}
                  onChange={(event) => update("startDateTo", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Proxima factura desde
                <input
                  type="date"
                  value={filters.nextBillingFrom}
                  onChange={(event) => update("nextBillingFrom", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>

              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">
                Proxima factura hasta
                <input
                  type="date"
                  value={filters.nextBillingTo}
                  onChange={(event) => update("nextBillingTo", event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] text-[var(--tazki-slate-900)] outline-none"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  status: "all",
                  customerId: "",
                  product: "",
                  startDateFrom: "",
                  startDateTo: "",
                  nextBillingFrom: "",
                  nextBillingTo: "",
                  suspended: "all",
                })
              }
            >
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

