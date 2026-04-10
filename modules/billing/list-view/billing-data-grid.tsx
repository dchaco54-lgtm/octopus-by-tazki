"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatUf,
  getClientName,
  getColumnDefinition,
  getColumnWidth,
} from "@/modules/billing/list-view/helpers";
import { BillingStatusBadge } from "@/modules/billing/list-view/billing-status-badge";
import { ResizableColumnHeader } from "@/modules/subscriptions/list-view/resizable-column-header";
import type { BillingColumnKey, BillingColumnWidthMap, BillingGroupBy, BillingListRowClient } from "@/modules/billing/list-view/types";

interface BillingDataGridProps {
  groups: Array<{
    key: string;
    label: string;
    rows: BillingListRowClient[];
    totalClp: number;
    totalOutstanding: number;
  }>;
  columns: BillingColumnKey[];
  columnWidths: BillingColumnWidthMap;
  onColumnWidthsChange: (widths: BillingColumnWidthMap) => void;
  selectedIds: string[];
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAllVisible: (checked: boolean) => void;
  groupBy: BillingGroupBy;
  isLoading?: boolean;
}

export function BillingDataGrid({
  groups,
  columns,
  columnWidths,
  onColumnWidthsChange,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
  groupBy,
  isLoading = false,
}: BillingDataGridProps) {
  const router = useRouter();
  const [activeResize, setActiveResize] = useState<BillingColumnKey | null>(null);
  void activeResize;
  void onColumnWidthsChange;

  const visibleIds = groups.flatMap((group) => group.rows.map((row) => row.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const detailHref = (id: string) => `/billing/${id}`;
  const checkboxWidth = 2.5;
  const totalVisibleWeight = columns.reduce((sum, column) => sum + getColumnWidth(column, columnWidths), 0) || 1;

  return (
    <div className="overflow-y-visible">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: `${checkboxWidth}%` }} />
          {columns.map((column) => (
            <col
              key={column}
              style={{ width: `${(getColumnWidth(column, columnWidths) / totalVisibleWeight) * (100 - checkboxWidth)}%` }}
            />
          ))}
        </colgroup>

        <thead>
          <tr className="border-b border-[var(--tazki-slate-300)] bg-[#fafbfc]">
            <th className="sticky top-0 z-[6] border-r border-[var(--tazki-slate-200)] bg-[#fafbfc] px-3 py-2.5 text-left align-middle shadow-[0_1px_0_0_var(--tazki-slate-300)]">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => onToggleAllVisible(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--tazki-slate-300)] text-[var(--tazki-blue-700)]"
                aria-label="Seleccionar todas las facturas visibles"
              />
            </th>

            {columns.map((column) => {
              const definition = getColumnDefinition(column);
              if (!definition) return null;

              return (
                <th
                  key={column}
                  className={cn(
                    "sticky top-0 z-[6] border-r border-[var(--tazki-slate-200)] bg-[#fafbfc] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)] shadow-[0_1px_0_0_var(--tazki-slate-300)]",
                    definition.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <ResizableColumnHeader label={definition.label} align={definition.align} width="100%" onResizeStart={() => setActiveResize(column)} />
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <SkeletonRows columns={columns} />
          ) : visibleIds.length === 0 ? (
            <EmptyState columnsCount={columns.length + 1} />
          ) : (
            groups.map((group) => (
              <FragmentGroup key={group.key}>
                {groupBy !== "none" ? (
                  <tr className="border-b border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)]">
                    <td colSpan={columns.length + 1} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--tazki-slate-900)]">{group.label}</span>
                          <span className="text-[var(--tazki-slate-500)]">{group.rows.length} facturas</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-[var(--tazki-slate-700)]">{formatCurrency(group.totalClp)}</span>
                          <span className="font-medium text-[var(--tazki-slate-500)]">Adeudado {formatCurrency(group.totalOutstanding)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {group.rows.map((row) => (
                  <tr
                    key={row.id}
                    role="link"
                    tabIndex={0}
                    className="h-10 cursor-pointer border-b border-[var(--tazki-slate-200)] transition-colors hover:bg-[var(--tazki-slate-50)] focus-visible:bg-[var(--tazki-slate-50)] focus-visible:outline-none"
                    onClick={() => router.push(detailHref(row.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(detailHref(row.id));
                      }
                    }}
                  >
                    <td className="border-r border-[var(--tazki-slate-100)] px-3 py-2 align-middle" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(event) => onToggleRow(row.id, event.target.checked)}
                        className="h-4 w-4 rounded border-[var(--tazki-slate-300)] text-[var(--tazki-blue-700)]"
                        aria-label={`Seleccionar ${row.number}`}
                      />
                    </td>

                    {columns.map((column) => (
                      <td
                        key={`${row.id}-${column}`}
                        className={cn(
                          "border-r border-[var(--tazki-slate-100)] px-3 py-2 align-middle text-[13px] leading-tight text-[var(--tazki-slate-700)]",
                          getColumnDefinition(column)?.align === "right" && "text-right"
                        )}
                      >
                        <GridCell row={row} column={column} href={detailHref(row.id)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </FragmentGroup>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function GridCell({ row, column, href }: { row: BillingListRowClient; column: BillingColumnKey; href: string }) {
  if (column === "number") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="block truncate font-medium text-[var(--tazki-slate-950)] decoration-transparent underline-offset-2 transition hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.number}
      </Link>
    );
  }

  if (column === "client") {
    return (
      <div className="min-w-0 leading-tight">
        <Link
          href={href}
          prefetch={false}
          className="block truncate font-semibold text-[var(--tazki-slate-950)] decoration-transparent underline-offset-2 transition hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {getClientName(row)}
        </Link>
        <p className="mt-1 truncate text-xs text-[var(--tazki-slate-500)]">{row.company?.rut ?? row.company?.internal_code ?? "\u2014"}</p>
      </div>
    );
  }

  if (column === "invoice_date") return <span className="block truncate">{formatDate(row.invoice_date)}</span>;
  if (column === "due_date") return <span className="block truncate">{formatDate(row.due_date)}</span>;
  if (column === "total_clp") return <span className="block truncate font-medium text-[var(--tazki-slate-950)]">{formatCurrency(row.total_clp)}</span>;
  if (column === "total_uf") return <span className="block truncate">{formatUf(row.total_uf)}</span>;
  if (column === "outstanding_amount") return <span className="block truncate font-medium text-[var(--tazki-slate-950)]">{formatCurrency(row.outstanding_amount)}</span>;
  if (column === "invoice_status") return <BillingStatusBadge kind="invoice" status={row.invoice_status} />;
  if (column === "payment_status") return <BillingStatusBadge kind="payment" status={row.payment_status} />;
  if (column === "service_period") return <span className="block truncate">{row.service_period}</span>;
  if (column === "subscription") return <span className="block truncate">{row.subscription?.subscription_code ?? "\u2014"}</span>;
  if (column === "client_rut") return <span className="block truncate">{row.company?.rut ?? "\u2014"}</span>;
  if (column === "client_id") return <span className="block truncate">{row.company?.internal_code ?? "\u2014"}</span>;
  if (column === "docs_block") {
    const labels = [row.blocked_by_oc ? "OC" : null, row.blocked_by_hes ? "HES/MIGO" : null].filter(Boolean);
    return <span className="block truncate">{labels.length > 0 ? labels.join(" + ") : "\u2014"}</span>;
  }
  if (column === "created_at") return <span className="block truncate">{formatDate(row.created_at)}</span>;
  if (column === "updated_at") return <span className="block truncate">{formatDate(row.updated_at)}</span>;

  return <span>-</span>;
}

function EmptyState({ columnsCount }: { columnsCount: number }) {
  return (
    <tr>
      <td colSpan={columnsCount} className="px-4 py-12 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--tazki-slate-950)]">No hay facturas</h2>
            <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Crea tu primera factura para comenzar</p>
          </div>
          <Link href="/billing/new" className="inline-flex">
            <Button size="sm">Crear factura</Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

function SkeletonRows({ columns }: { columns: BillingColumnKey[] }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="h-10 border-b border-[var(--tazki-slate-200)]">
          <td className="border-r border-[var(--tazki-slate-100)] px-3 py-2">
            <div className="h-4 w-4 animate-pulse rounded bg-[var(--tazki-slate-200)]" />
          </td>
          {columns.map((column) => (
            <td key={`${column}-${index}`} className="border-r border-[var(--tazki-slate-100)] px-3 py-2">
              <div
                className={cn(
                  "h-4 animate-pulse rounded bg-[var(--tazki-slate-200)]",
                  column === "client" ? "w-[80%]" : column === "invoice_status" || column === "payment_status" ? "w-20" : "w-[65%]"
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function FragmentGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
