import {
  COLUMN_DEFINITIONS,
  type ColumnKey,
  type ColumnWidthMap,
  DEFAULT_COLUMNS,
  DEFAULT_FILTERS,
  type DerivedSubscriptionStatus,
  SYSTEM_DEFAULT_VIEW,
  type GroupBy,
  type SavedFavoriteView,
  type SubscriptionListRowClient,
  type SubscriptionViewConfig,
  type SubscriptionViewFilters,
  type SubscriptionViewPreferences,
} from "@/modules/subscriptions/list-view/types";

export function formatDate(value: string | null | undefined) {
  if (!value) return "\u2014";
  const source = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = source.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

export function formatUf(value: number) {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} UF`;
}

export function getCustomerName(row: SubscriptionListRowClient) {
  return row.customer?.trade_name ?? row.customer?.legal_name ?? "Cliente sin nombre";
}

export function getProductName(row: SubscriptionListRowClient) {
  return row.contracted_plan ?? row.pricing_strategy?.name ?? "\u2014";
}

export function getExecutiveName(row: SubscriptionListRowClient) {
  return row.sales_executive?.full_name ?? row.sales_owner_name ?? "\u2014";
}

export function deriveSubscriptionStatus(row: SubscriptionListRowClient): DerivedSubscriptionStatus {
  if (row.status === "closed") return "cancelled";
  if (row.suspension_date) return "suspended";
  if (row.status === "demo") return "onboarding";
  return "active";
}

export function getStatusMeta(status: DerivedSubscriptionStatus) {
  if (status === "active") {
    return {
      label: "Activa",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    };
  }

  if (status === "suspended") {
    return {
      label: "Suspendida",
      className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    };
  }

  if (status === "onboarding") {
    return {
      label: "Onboarding",
      className: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    };
  }

  return {
    label: "Cancelada",
    className: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  };
}

export function normalizeLegacyStatus(value?: string) {
  if (value === "closed") return "cancelled";
  if (value === "demo") return "onboarding";
  if (value === "active" || value === "suspended" || value === "cancelled" || value === "onboarding") return value;
  return "all";
}

export function matchesSubscriptionFilters(row: SubscriptionListRowClient, search: string, filters: SubscriptionViewFilters) {
  const normalizedSearch = search.trim().toLowerCase();

  if (normalizedSearch) {
    const haystack = [
      row.subscription_code,
      getCustomerName(row),
      row.customer?.rut,
      row.customer?.internal_code,
      getProductName(row),
      row.pricing_strategy?.code,
      getExecutiveName(row),
      row.sales_owner_name,
      row.hubspot_deal_id,
      row.close_reason,
      row.channel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(normalizedSearch)) {
      return false;
    }
  }

  if (filters.status !== "all" && deriveSubscriptionStatus(row) !== filters.status) {
    return false;
  }

  if (filters.customerId && row.customer?.id !== filters.customerId) {
    return false;
  }

  if (filters.product && getProductName(row) !== filters.product) {
    return false;
  }

  if (filters.startDateFrom && (!row.start_date || row.start_date < filters.startDateFrom)) {
    return false;
  }

  if (filters.startDateTo && (!row.start_date || row.start_date > filters.startDateTo)) {
    return false;
  }

  if (filters.nextBillingFrom && (!row.next_billing_date || row.next_billing_date < filters.nextBillingFrom)) {
    return false;
  }

  if (filters.nextBillingTo && (!row.next_billing_date || row.next_billing_date > filters.nextBillingTo)) {
    return false;
  }

  if (filters.suspended === "yes" && !row.suspension_date) {
    return false;
  }

  if (filters.suspended === "no" && row.suspension_date) {
    return false;
  }

  return true;
}

export function buildSubscriptionGroups(rows: SubscriptionListRowClient[], groupBy: GroupBy) {
  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "Todas las suscripciones",
        rows,
        totalUf: rows.reduce((sum, row) => sum + row.total_mrr_uf, 0),
      },
    ];
  }

  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      rows: SubscriptionListRowClient[];
      totalUf: number;
    }
  >();

  for (const row of rows) {
    let key = "sin-grupo";
    let label = "Sin grupo";

    if (groupBy === "customer") {
      key = row.customer?.id ?? "sin-cliente";
      label = getCustomerName(row);
    } else if (groupBy === "status") {
      const status = deriveSubscriptionStatus(row);
      key = status;
      label = getStatusMeta(status).label;
    } else if (groupBy === "product") {
      key = getProductName(row);
      label = getProductName(row);
    } else if (groupBy === "sales_executive") {
      key = getExecutiveName(row);
      label = getExecutiveName(row);
    }

    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.totalUf += row.total_mrr_uf;
      continue;
    }

    groups.set(key, {
      key,
      label,
      rows: [row],
      totalUf: row.total_mrr_uf,
    });
  }

  return Array.from(groups.values());
}

export function getDefaultColumnWidths() {
  return COLUMN_DEFINITIONS.reduce<ColumnWidthMap>((accumulator, definition) => {
    accumulator[definition.key] = definition.defaultWidth;
    return accumulator;
  }, {});
}

export function getColumnDefinition(columnKey: ColumnKey) {
  return COLUMN_DEFINITIONS.find((definition) => definition.key === columnKey);
}

export function getColumnWidth(columnKey: ColumnKey, widths: ColumnWidthMap) {
  return widths[columnKey] ?? getColumnDefinition(columnKey)?.defaultWidth ?? 10;
}

export function clampColumnWidth(columnKey: ColumnKey, width: number) {
  const definition = getColumnDefinition(columnKey);
  const minWidth = definition?.minWidth ?? 6;
  return Math.max(minWidth, Number(width.toFixed(2)));
}

export function sanitizeViewConfig(raw: unknown): SubscriptionViewConfig {
  const input = typeof raw === "object" && raw !== null ? (raw as Partial<SubscriptionViewConfig>) : {};
  const filters = typeof input.filters === "object" && input.filters !== null ? (input.filters as Partial<SubscriptionViewFilters>) : {};

  const columns = Array.isArray(input.columns)
    ? input.columns.filter((column): column is ColumnKey => COLUMN_DEFINITIONS.some((item) => item.key === column))
    : DEFAULT_COLUMNS;

  const rawWidths = typeof input.columnWidths === "object" && input.columnWidths !== null ? (input.columnWidths as Record<string, unknown>) : {};
  const widths = Object.fromEntries(
    Object.entries(rawWidths).flatMap(([key, value]) => {
      if (!COLUMN_DEFINITIONS.some((item) => item.key === key)) return [];
      if (typeof value !== "number" || Number.isNaN(value)) return [];
      return [[key, clampColumnWidth(key as ColumnKey, value)]];
    })
  ) as ColumnWidthMap;

  return {
    search: typeof input.search === "string" ? input.search : SYSTEM_DEFAULT_VIEW.search,
    filters: {
      status:
        filters.status === "active" ||
        filters.status === "suspended" ||
        filters.status === "cancelled" ||
        filters.status === "onboarding" ||
        filters.status === "all"
          ? filters.status
          : DEFAULT_FILTERS.status,
      customerId: typeof filters.customerId === "string" ? filters.customerId : DEFAULT_FILTERS.customerId,
      product: typeof filters.product === "string" ? filters.product : DEFAULT_FILTERS.product,
      startDateFrom: typeof filters.startDateFrom === "string" ? filters.startDateFrom : DEFAULT_FILTERS.startDateFrom,
      startDateTo: typeof filters.startDateTo === "string" ? filters.startDateTo : DEFAULT_FILTERS.startDateTo,
      nextBillingFrom: typeof filters.nextBillingFrom === "string" ? filters.nextBillingFrom : DEFAULT_FILTERS.nextBillingFrom,
      nextBillingTo: typeof filters.nextBillingTo === "string" ? filters.nextBillingTo : DEFAULT_FILTERS.nextBillingTo,
      suspended:
        filters.suspended === "yes" || filters.suspended === "no" || filters.suspended === "all"
          ? filters.suspended
          : DEFAULT_FILTERS.suspended,
    },
    groupBy:
      input.groupBy === "customer" || input.groupBy === "status" || input.groupBy === "product" || input.groupBy === "sales_executive"
        ? input.groupBy
        : "none",
    columns: columns.length > 0 ? columns : DEFAULT_COLUMNS,
    columnWidths: { ...getDefaultColumnWidths(), ...widths },
  };
}

export function sanitizePreferences(raw: unknown): SubscriptionViewPreferences {
  const input =
    typeof raw === "object" && raw !== null ? (raw as Partial<SubscriptionViewPreferences> & { favorites?: unknown[] }) : {};

  const favorites = Array.isArray(input.favorites)
    ? input.favorites.flatMap((favorite) => {
        if (typeof favorite !== "object" || favorite === null) return [];
        const typed = favorite as Partial<SavedFavoriteView>;
        if (typeof typed.id !== "string" || typeof typed.name !== "string") return [];
        return [
          {
            id: typed.id,
            name: typed.name,
            config: sanitizeViewConfig(typed.config),
          },
        ];
      })
    : [];

  return {
    currentView: sanitizeViewConfig(input.currentView),
    defaultView: sanitizeViewConfig(input.defaultView),
    favorites,
  };
}

export function createPreferencesPayload(currentView: SubscriptionViewConfig, defaultView: SubscriptionViewConfig, favorites: SavedFavoriteView[]) {
  return sanitizePreferences({
    currentView,
    defaultView,
    favorites,
  });
}

export function uniqueCustomerOptions(rows: SubscriptionListRowClient[]) {
  const seen = new Map<string, { id: string; label: string; meta: string }>();

  for (const row of rows) {
    if (!row.customer?.id || seen.has(row.customer.id)) continue;
    seen.set(row.customer.id, {
      id: row.customer.id,
      label: getCustomerName(row),
      meta: row.customer.rut ?? "\u2014",
    });
  }

  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function uniqueProductOptions(rows: SubscriptionListRowClient[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => getProductName(row))
        .filter((value): value is string => Boolean(value) && value !== "\u2014")
    )
  ).sort((a, b) => a.localeCompare(b, "es"));
}

export function countActiveFilters(filters: SubscriptionViewFilters) {
  return [
    filters.status !== "all",
    Boolean(filters.customerId),
    Boolean(filters.product),
    Boolean(filters.startDateFrom),
    Boolean(filters.startDateTo),
    Boolean(filters.nextBillingFrom),
    Boolean(filters.nextBillingTo),
    filters.suspended !== "all",
  ].filter(Boolean).length;
}

export function orderColumnOptions(columns: ColumnKey[]) {
  const hidden = COLUMN_DEFINITIONS.map((column) => column.key).filter((column) => !columns.includes(column));
  return [...columns, ...hidden];
}

export function moveColumn(columns: ColumnKey[], column: ColumnKey, direction: "up" | "down") {
  const currentIndex = columns.indexOf(column);
  if (currentIndex === -1) return columns;

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= columns.length) return columns;

  const nextColumns = [...columns];
  [nextColumns[currentIndex], nextColumns[nextIndex]] = [nextColumns[nextIndex], nextColumns[currentIndex]];
  return nextColumns;
}

export function createFavoriteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `favorite-${Date.now()}`;
}

export function humanizeMovementType(value: SubscriptionListRowClient["movement_type"]) {
  if (value === "new") return "Nuevo";
  if (value === "expansion") return "Expansion";
  if (value === "contraction") return "Contraccion";
  if (value === "churn") return "Churn";
  return "Plano";
}
