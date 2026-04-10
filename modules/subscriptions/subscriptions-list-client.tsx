"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FolderTree, KanbanSquare, List } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  buildSubscriptionGroups,
  createFavoriteId,
  createPreferencesPayload,
  getDefaultColumnWidths,
  normalizeLegacyStatus,
  sanitizePreferences,
  uniqueCustomerOptions,
  uniqueProductOptions,
  matchesSubscriptionFilters,
} from "@/modules/subscriptions/list-view/helpers";
import { ColumnVisibilityMenu } from "@/modules/subscriptions/list-view/column-visibility-menu";
import { SavedViewsMenu } from "@/modules/subscriptions/list-view/saved-views-menu";
import { SubscriptionFilterMenu } from "@/modules/subscriptions/list-view/subscription-filter-menu";
import { SubscriptionSearchBar } from "@/modules/subscriptions/list-view/subscription-search-bar";
import { SubscriptionsDataGrid } from "@/modules/subscriptions/list-view/subscriptions-data-grid";
import { SubscriptionsPageHeader } from "@/modules/subscriptions/list-view/subscriptions-page-header";
import { SubscriptionsToolbar } from "@/modules/subscriptions/list-view/subscriptions-toolbar";
import { ToolbarDropdown } from "@/modules/subscriptions/list-view/toolbar-dropdown";
import {
  DEFAULT_FILTERS,
  SYSTEM_DEFAULT_VIEW,
  type ColumnKey,
  type ColumnWidthMap,
  type GroupBy,
  type SubscriptionViewFilters,
  type SavedFavoriteView,
  type SubscriptionListRowClient,
  type SubscriptionViewConfig,
} from "@/modules/subscriptions/list-view/types";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS = [
  { key: "list", label: "Lista", icon: List, active: true },
  { key: "kanban", label: "Kanban", icon: KanbanSquare, active: false },
] as const;

const LOCAL_STORAGE_KEY = "octopus.subscriptions.grid.preferences";
const VIEW_PREFERENCE_KEY = "subscriptions.grid.preferences";

function cloneViewConfig(config: SubscriptionViewConfig): SubscriptionViewConfig {
  return {
    search: config.search,
    groupBy: config.groupBy,
    columns: [...config.columns],
    columnWidths: { ...config.columnWidths },
    filters: { ...config.filters },
  };
}

export function SubscriptionsListClient({
  rows,
  error,
  initialSearch,
  initialStatus,
}: {
  rows: SubscriptionListRowClient[];
  error?: string | null;
  initialSearch?: string;
  initialStatus?: string;
}) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const [filters, setFilters] = useState<SubscriptionViewFilters>({
    ...DEFAULT_FILTERS,
    status: normalizeLegacyStatus(initialStatus),
  });
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [columns, setColumns] = useState<ColumnKey[]>(SYSTEM_DEFAULT_VIEW.columns);
  const [columnWidths, setColumnWidths] = useState<ColumnWidthMap>(getDefaultColumnWidths());
  const [favorites, setFavorites] = useState<SavedFavoriteView[]>([]);
  const [defaultView, setDefaultView] = useState<SubscriptionViewConfig>({
    ...SYSTEM_DEFAULT_VIEW,
    columnWidths: getDefaultColumnWidths(),
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const persistTimer = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const currentView = useMemo<SubscriptionViewConfig>(
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
  const productOptions = useMemo(() => uniqueProductOptions(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesSubscriptionFilters(row, deferredSearch, filters)),
    [rows, deferredSearch, filters]
  );
  const groups = useMemo(() => buildSubscriptionGroups(filteredRows, groupBy), [filteredRows, groupBy]);

  function applyView(config: SubscriptionViewConfig) {
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

    const nextFavorite: SavedFavoriteView = {
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
      <SubscriptionsPageHeader
        tools={
          <>
            <SubscriptionSearchBar value={search} onChange={setSearch} />
            <SubscriptionFilterMenu filters={filters} customerOptions={customerOptions} productOptions={productOptions} onChange={setFilters} />
            <ToolbarDropdown label="Agrupar por" icon={<FolderTree className="h-4 w-4" />}>
              {({ close }) => (
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tazki-slate-400)]">Agrupacion</p>
                    <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">Cliente, estado, producto o ejecutivo comercial.</p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { value: "none", label: "Sin agrupar" },
                      { value: "customer", label: "Cliente" },
                      { value: "status", label: "Estado" },
                      { value: "product", label: "Producto" },
                      { value: "sales_executive", label: "Ejecutivo comercial" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] transition",
                          groupBy === option.value
                            ? "bg-[var(--tazki-slate-100)] font-medium text-[var(--tazki-slate-950)]"
                            : "text-[var(--tazki-slate-700)] hover:bg-[var(--tazki-slate-50)]"
                        )}
                        onClick={() => {
                          setGroupBy(option.value as GroupBy);
                          close();
                        }}
                      >
                        <span>{option.label}</span>
                        {groupBy === option.value ? <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Activo</span> : null}
                      </button>
                    ))}
                  </div>
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
                const reset = { ...SYSTEM_DEFAULT_VIEW, columnWidths: getDefaultColumnWidths() };
                setDefaultView(reset);
                applyView(reset);
              }}
            />
            <div className="ml-1 inline-flex items-center rounded-md border border-[var(--tazki-slate-200)] bg-white p-0.5">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-label={option.label}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded text-[var(--tazki-slate-500)] transition",
                      option.active
                        ? "bg-[var(--tazki-slate-100)] text-[var(--tazki-slate-900)]"
                        : "hover:bg-[var(--tazki-slate-50)] hover:text-[var(--tazki-slate-700)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </>
        }
      />

      <SubscriptionsToolbar
        resultCount={filteredRows.length}
        selectedCount={selectedIds.length}
        tools={<ColumnVisibilityMenu columns={columns} onChange={setColumns} onResetWidths={() => setColumnWidths(getDefaultColumnWidths())} />}
      />

      {error ? (
        <div className="mx-5 my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">
          No pudimos cargar suscripciones: {error}
        </div>
      ) : null}

      <SubscriptionsDataGrid
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
