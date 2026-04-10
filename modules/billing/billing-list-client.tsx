"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FolderTree, KanbanSquare, List } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BillingPageHeader } from "@/modules/billing/list-view/billing-page-header";
import { BillingSearchBar } from "@/modules/billing/list-view/billing-search-bar";
import { BillingFilterMenu } from "@/modules/billing/list-view/billing-filter-menu";
import { BillingToolbar } from "@/modules/billing/list-view/billing-toolbar";
import { BillingDataGrid } from "@/modules/billing/list-view/billing-data-grid";
import { ColumnVisibilityMenu } from "@/modules/billing/list-view/column-visibility-menu";
import { SavedViewsMenu } from "@/modules/billing/list-view/saved-views-menu";
import {
  buildBillingGroups,
  createFavoriteId,
  createPreferencesPayload,
  getDefaultColumnWidths,
  matchesBillingFilters,
  sanitizePreferences,
  uniqueCustomerOptions,
} from "@/modules/billing/list-view/helpers";
import {
  DEFAULT_FILTERS,
  SYSTEM_DEFAULT_VIEW,
  type BillingColumnKey,
  type BillingColumnWidthMap,
  type BillingGroupBy,
  type BillingListRowClient,
  type BillingViewConfig,
  type BillingViewFilters,
  type SavedBillingFavoriteView,
} from "@/modules/billing/list-view/types";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";

const VIEW_OPTIONS = [
  { key: "list", label: "Lista", icon: List, active: true },
  { key: "kanban", label: "Kanban", icon: KanbanSquare, active: false },
] as const;

const LOCAL_STORAGE_KEY = "octopus.billing.grid.preferences";
const VIEW_PREFERENCE_KEY = "billing.grid.preferences";

function cloneViewConfig(config: BillingViewConfig): BillingViewConfig {
  return {
    search: config.search,
    groupBy: config.groupBy,
    columns: [...config.columns],
    columnWidths: { ...config.columnWidths },
    filters: { ...config.filters },
  };
}

export function BillingListClient({ rows, error }: { rows: BillingListRowClient[]; error?: string | null }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<BillingViewFilters>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<BillingGroupBy>("none");
  const [columns, setColumns] = useState<BillingColumnKey[]>(SYSTEM_DEFAULT_VIEW.columns);
  const [columnWidths, setColumnWidths] = useState<BillingColumnWidthMap>(getDefaultColumnWidths());
  const [favorites, setFavorites] = useState<SavedBillingFavoriteView[]>([]);
  const [defaultView, setDefaultView] = useState<BillingViewConfig>({
    ...SYSTEM_DEFAULT_VIEW,
    columnWidths: getDefaultColumnWidths(),
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const persistTimer = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const currentView = useMemo<BillingViewConfig>(
    () => ({
      search,
      filters,
      groupBy,
      columns,
      columnWidths,
    }),
    [search, filters, groupBy, columns, columnWidths]
  );

  useEffect(() => {
    let cancelled = false;

    const localValue = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (localValue) {
      const parsed = sanitizePreferences(JSON.parse(localValue));
      if (!cancelled) {
        setSearch(parsed.currentView.search);
        setFilters(parsed.currentView.filters);
        setGroupBy(parsed.currentView.groupBy);
        setColumns(parsed.currentView.columns);
        setColumnWidths(parsed.currentView.columnWidths);
        setFavorites(parsed.favorites);
        setDefaultView(parsed.defaultView);
      }
    }

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;
        setUserId(user?.id ?? null);

        if (!user) {
          return;
        }

        const { data: preferenceRow } = await supabase
          .from("user_view_preferences")
          .select("value")
          .eq("auth_user_id", user.id)
          .eq("view_key", VIEW_PREFERENCE_KEY)
          .maybeSingle();

        if (cancelled || !preferenceRow?.value) return;

        const parsed = sanitizePreferences(preferenceRow.value);
        setSearch(parsed.currentView.search);
        setFilters(parsed.currentView.filters);
        setGroupBy(parsed.currentView.groupBy);
        setColumns(parsed.currentView.columns);
        setColumnWidths(parsed.currentView.columnWidths);
        setFavorites(parsed.favorites);
        setDefaultView(parsed.defaultView);
      } catch {
        // Fallback to local preferences if Supabase preferences are unavailable.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload = createPreferencesPayload(currentView, defaultView, favorites);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

    if (persistTimer.current) {
      window.clearTimeout(persistTimer.current);
    }

    if (!userId) {
      return;
    }

    persistTimer.current = window.setTimeout(async () => {
      try {
        await supabase.from("user_view_preferences").upsert(
          {
            auth_user_id: userId,
            view_key: VIEW_PREFERENCE_KEY,
            value: payload,
          },
          { onConflict: "auth_user_id,view_key" }
        );
      } catch {
        // Keep the grid functional even if preference persistence fails.
      }
    }, 250);
  }, [currentView, defaultView, favorites, hydrated, userId]);

  useEffect(() => {
    setSelectedIds([]);
  }, [deferredSearch, filters, groupBy]);

  const customerOptions = useMemo(() => uniqueCustomerOptions(rows), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => matchesBillingFilters(row, deferredSearch, filters)), [rows, deferredSearch, filters]);
  const groups = useMemo(() => buildBillingGroups(filteredRows, groupBy), [filteredRows, groupBy]);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (deferredSearch) params.set("q", deferredSearch);
    return params.toString() ? `/billing/export?${params.toString()}` : "/billing/export";
  }, [deferredSearch]);

  function applyView(config: BillingViewConfig) {
    const next = cloneViewConfig(config);
    setSearch(next.search);
    setFilters(next.filters);
    setGroupBy(next.groupBy);
    setColumns(next.columns);
    setColumnWidths(next.columnWidths);
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((item) => item !== id);
    });
  }

  function toggleAllVisible(checked: boolean) {
    const visibleIds = filteredRows.map((row) => row.id);
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleIds]));
      }

      return current.filter((id) => !visibleIds.includes(id));
    });
  }

  function saveCurrentAsFavorite() {
    const name = window.prompt("Nombre de la vista");
    if (!name?.trim()) return;

    const nextFavorite: SavedBillingFavoriteView = {
      id: createFavoriteId(),
      name: name.trim(),
      config: cloneViewConfig(currentView),
    };

    setFavorites((current) => [...current, nextFavorite]);
  }

  function deleteFavorite(id: string) {
    setFavorites((current) => current.filter((favorite) => favorite.id !== id));
  }

  return (
    <section className="bg-white">
      <BillingPageHeader
        tools={
          <>
            <Link
              href="/billing/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tazki-blue-900)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--tazki-blue-700)]"
            >
              Nueva factura
            </Link>
            <Link
              href="/billing/new?origin=externo"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]"
            >
              Cargar factura externa
            </Link>
            <BillingSearchBar value={search} onChange={setSearch} />
            <BillingFilterMenu filters={filters} customerOptions={customerOptions} onChange={setFilters} />
            <ToolbarDropdown label="Agrupar por" icon={<FolderTree className="h-4 w-4" />}>
              {({ close }) => (
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Agrupacion</p>
                    <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Cliente, estado factura o estado pago.</p>
                  </div>

                  {[
                    { key: "none", label: "Sin agrupar" },
                    { key: "client", label: "Cliente" },
                    { key: "invoice_status", label: "Estado factura" },
                    { key: "payment_status", label: "Estado pago" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px]",
                        groupBy === option.key ? "bg-[var(--tazki-slate-100)] font-medium text-[var(--tazki-slate-950)]" : "text-[var(--tazki-slate-700)] hover:bg-[var(--tazki-slate-50)]"
                      )}
                      onClick={() => {
                        setGroupBy(option.key as BillingGroupBy);
                        close();
                      }}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </ToolbarDropdown>
            <SavedViewsMenu
              favorites={favorites}
              defaultView={defaultView}
              currentView={currentView}
              onApplyView={applyView}
              onSaveCurrent={saveCurrentAsFavorite}
              onDeleteFavorite={deleteFavorite}
              onMakeDefault={() => setDefaultView(cloneViewConfig(currentView))}
              onResetDefault={() => {
                setDefaultView({
                  ...SYSTEM_DEFAULT_VIEW,
                  columnWidths: getDefaultColumnWidths(),
                });
                applyView({
                  ...SYSTEM_DEFAULT_VIEW,
                  columnWidths: getDefaultColumnWidths(),
                });
              }}
            />
            <div className="flex items-center rounded-md border border-[var(--tazki-slate-200)] bg-white p-0.5">
              {VIEW_OPTIONS.map(({ key, label, icon: Icon, active }) => (
                <button
                  key={key}
                  type="button"
                  disabled={!active}
                  aria-label={label}
                  title={active ? label : `${label} disponible proximamente`}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--tazki-slate-500)] transition",
                    key === "list" ? "bg-[var(--tazki-slate-100)] text-[var(--tazki-slate-900)]" : "hover:bg-[var(--tazki-slate-50)]",
                    !active && "cursor-not-allowed opacity-40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </>
        }
      />

      <BillingToolbar
        resultCount={filteredRows.length}
        selectedCount={selectedIds.length}
        exportHref={exportHref}
        tools={<ColumnVisibilityMenu columns={columns} onChange={setColumns} onResetWidths={() => setColumnWidths(getDefaultColumnWidths())} />}
      />

      {error ? (
        <div className="mx-5 my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">
          No pudimos cargar facturacion: {error}
        </div>
      ) : null}

      <BillingDataGrid
        groups={groups}
        columns={columns}
        columnWidths={columnWidths}
        onColumnWidthsChange={setColumnWidths}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAllVisible={toggleAllVisible}
        groupBy={groupBy}
        isLoading={!hydrated}
      />
    </section>
  );
}
