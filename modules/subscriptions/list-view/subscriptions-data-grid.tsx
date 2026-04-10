"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deriveSubscriptionStatus,
  formatDate,
  formatUf,
  getColumnDefinition,
  getColumnWidth,
  getCustomerName,
  getExecutiveName,
  getProductName,
  humanizeMovementType,
} from "@/modules/subscriptions/list-view/helpers";
import { ResizableColumnHeader } from "@/modules/subscriptions/list-view/resizable-column-header";
import { SubscriptionStatusBadge } from "@/modules/subscriptions/list-view/subscription-status-badge";
import { type ColumnKey, type ColumnWidthMap, type GroupBy, type SubscriptionListRowClient } from "@/modules/subscriptions/list-view/types";

interface SubscriptionsDataGridProps {
  groups: Array<{
    key: string;
    label: string;
    rows: SubscriptionListRowClient[];
    totalUf: number;
  }>;
  columns: ColumnKey[];
  columnWidths: ColumnWidthMap;
  onColumnWidthsChange: (widths: ColumnWidthMap) => void;
  selectedIds: string[];
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAllVisible: (checked: boolean) => void;
  groupBy: GroupBy;
  isLoading?: boolean;
}

export function SubscriptionsDataGrid({
  groups,
  columns,
  columnWidths,
  onColumnWidthsChange,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
  groupBy,
  isLoading = false,
}: SubscriptionsDataGridProps) {
  const router = useRouter();
  const [activeResize, setActiveResize] = useState<ColumnKey | null>(null);
  void activeResize;
  void onColumnWidthsChange;
  void columnWidths;

  const visibleIds = groups.flatMap((group) => group.rows.map((row) => row.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const detailHref = (id: string) => `/subscriptions/${id}`;
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
                aria-label="Seleccionar todas las suscripciones visibles"
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
                  <ResizableColumnHeader
                    label={definition.label}
                    align={definition.align}
                    width="100%"
                    onResizeStart={() => setActiveResize(column)}
                  />
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
                          <span className="text-[var(--tazki-slate-500)]">{group.rows.length} suscripciones</span>
                        </div>
                        <span className="font-medium text-[var(--tazki-slate-700)]">{formatUf(group.totalUf)}</span>
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
                        aria-label={`Seleccionar ${row.subscription_code}`}
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

function GridCell({ row, column, href }: { row: SubscriptionListRowClient; column: ColumnKey; href: string }) {
  if (column === "subscription_code") {
    return (
      <Link
        href={href}
        prefetch={false}
        className="block truncate font-medium text-[var(--tazki-slate-950)] decoration-transparent underline-offset-2 transition hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {row.subscription_code}
      </Link>
    );
  }

  if (column === "customer") {
    return (
      <div className="min-w-0 leading-tight">
        <Link
          href={href}
          prefetch={false}
          className="block truncate font-semibold text-[var(--tazki-slate-950)] decoration-transparent underline-offset-2 transition hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {getCustomerName(row)}
        </Link>
        <p className="mt-1 truncate text-xs text-[var(--tazki-slate-500)]">{row.customer?.rut ?? "—"}</p>
      </div>
    );
  }

  if (column === "start_date") return <span className="block truncate">{formatDate(row.start_date)}</span>;
  if (column === "next_billing_date") return <span className="block truncate">{formatDate(row.next_billing_date)}</span>;
  if (column === "product") return <span className="block truncate text-[var(--tazki-slate-800)]">{getProductName(row)}</span>;
  if (column === "net_uf") return <span className="block truncate font-medium text-[var(--tazki-slate-950)]">{formatUf(row.total_mrr_uf)}</span>;
  if (column === "suspension_date") return <span className="block truncate">{formatDate(row.suspension_date)}</span>;
  if (column === "status") return <SubscriptionStatusBadge status={deriveSubscriptionStatus(row)} />;
  if (column === "customer_rut") return <span className="block truncate">{row.customer?.rut ?? "—"}</span>;
  if (column === "sales_executive") return <span className="block truncate">{getExecutiveName(row)}</span>;
  if (column === "channel") return <span className="block truncate">{row.channel ?? "—"}</span>;
  if (column === "pricing_strategy") return <span className="block truncate">{row.pricing_strategy?.name ?? "—"}</span>;
  if (column === "recurrence") return <span className="block truncate">{row.recurrence ?? "—"}</span>;
  if (column === "hubspot_deal_id") return <span className="block truncate">{row.hubspot_deal_id ?? "—"}</span>;
  if (column === "end_date") return <span className="block truncate">{formatDate(row.end_date)}</span>;
  if (column === "close_reason") return <span className="block truncate">{row.close_reason ?? "—"}</span>;
  if (column === "movement_type") return <span className="block truncate">{humanizeMovementType(row.movement_type)}</span>;
  if (column === "billing_type") return <span className="block truncate">{row.billing_type ?? "—"}</span>;
  if (column === "payer_name") return <span className="block truncate">{row.payer_name ?? "—"}</span>;
  if (column === "created_at") return <span className="block truncate">{formatDate(row.created_at)}</span>;
  if (column === "updated_at") return <span className="block truncate">{formatDate(row.updated_at)}</span>;

  return <span>—</span>;
}

function EmptyState({ columnsCount }: { columnsCount: number }) {
  return (
    <tr>
      <td colSpan={columnsCount} className="px-4 py-12 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--tazki-slate-950)]">No hay suscripciones</h2>
            <p className="mt-1 text-sm text-[var(--tazki-slate-500)]">Crea tu primera suscripcion para comenzar</p>
          </div>
          <Link href="/subscriptions/new" className="inline-flex">
            <Button size="sm">Crear suscripcion</Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

function SkeletonRows({ columns }: { columns: ColumnKey[] }) {
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
                  column === "customer" ? "w-[80%]" : column === "status" ? "w-20" : "w-[65%]"
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
