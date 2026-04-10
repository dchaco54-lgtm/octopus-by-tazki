import {
  COLUMN_DEFINITIONS,
  type BillingColumnKey,
  type BillingColumnWidthMap,
  type BillingGroupBy,
  type BillingListRowClient,
  type BillingViewConfig,
  type BillingViewFilters,
  type BillingViewPreferences,
  DEFAULT_COLUMNS,
  DEFAULT_FILTERS,
  SYSTEM_DEFAULT_VIEW,
  type SavedBillingFavoriteView,
} from "@/modules/billing/list-view/types";

export function formatDate(value: string | null | undefined) {
  if (!value) return "\u2014";
  const source = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = source.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUf(value: number) {
  return `${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} UF`;
}

export function getClientName(row: BillingListRowClient) {
  return row.company?.trade_name ?? row.company?.legal_name ?? "Cliente sin nombre";
}

export function getInvoiceStatusMeta(status: BillingListRowClient["invoice_status"]) {
  if (status === "pending_payment") {
    return {
      label: "Pendiente de pago",
      className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    };
  }

  if (status === "paid") {
    return {
      label: "Pagada",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Anulada",
      className: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    };
  }

  if (status === "issued") {
    return {
      label: "Emitida",
      className: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    };
  }

  return {
    label: "Borrador",
    className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  };
}

export function getPaymentStatusMeta(status: BillingListRowClient["payment_status"]) {
  if (status === "paid") {
    return {
      label: "Pagada",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    };
  }

  return {
    label: "Pendiente",
    className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  };
}

export function matchesBillingFilters(row: BillingListRowClient, search: string, filters: BillingViewFilters) {
  const normalizedSearch = search.trim().toLowerCase();

  if (normalizedSearch) {
    const haystack = [
      row.number,
      row.service_period,
      getClientName(row),
      row.company?.rut,
      row.company?.internal_code,
      row.subscription?.subscription_code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(normalizedSearch)) {
      return false;
    }
  }

  if (filters.invoiceStatus !== "all" && row.invoice_status !== filters.invoiceStatus) {
    return false;
  }

  if (filters.paymentStatus !== "all" && row.payment_status !== filters.paymentStatus) {
    return false;
  }

  if (filters.customerId && row.company?.id !== filters.customerId) {
    return false;
  }

  if (filters.invoiceDateFrom && (!row.invoice_date || row.invoice_date < filters.invoiceDateFrom)) {
    return false;
  }

  if (filters.invoiceDateTo && (!row.invoice_date || row.invoice_date > filters.invoiceDateTo)) {
    return false;
  }

  if (filters.dueDateFrom && (!row.due_date || row.due_date < filters.dueDateFrom)) {
    return false;
  }

  if (filters.dueDateTo && (!row.due_date || row.due_date > filters.dueDateTo)) {
    return false;
  }

  if (filters.draftOnly === "yes" && row.invoice_status !== "draft") {
    return false;
  }

  if (filters.draftOnly === "no" && row.invoice_status === "draft") {
    return false;
  }

  return true;
}

export function buildBillingGroups(rows: BillingListRowClient[], groupBy: BillingGroupBy) {
  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "Todas las facturas",
        rows,
        totalClp: rows.reduce((sum, row) => sum + row.total_clp, 0),
        totalOutstanding: rows.reduce((sum, row) => sum + row.outstanding_amount, 0),
      },
    ];
  }

  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      rows: BillingListRowClient[];
      totalClp: number;
      totalOutstanding: number;
    }
  >();

  for (const row of rows) {
    let key = "sin-grupo";
    let label = "Sin grupo";

    if (groupBy === "client") {
      key = row.company?.id ?? "sin-cliente";
      label = getClientName(row);
    } else if (groupBy === "invoice_status") {
      key = row.invoice_status;
      label = getInvoiceStatusMeta(row.invoice_status).label;
    } else if (groupBy === "payment_status") {
      key = row.payment_status;
      label = getPaymentStatusMeta(row.payment_status).label;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.totalClp += row.total_clp;
      existing.totalOutstanding += row.outstanding_amount;
      continue;
    }

    groups.set(key, {
      key,
      label,
      rows: [row],
      totalClp: row.total_clp,
      totalOutstanding: row.outstanding_amount,
    });
  }

  return Array.from(groups.values());
}

export function uniqueCustomerOptions(rows: BillingListRowClient[]) {
  const seen = new Map<string, { id: string; label: string; meta: string }>();

  for (const row of rows) {
    if (!row.company?.id || seen.has(row.company.id)) continue;
    seen.set(row.company.id, {
      id: row.company.id,
      label: getClientName(row),
      meta: row.company.rut ?? row.company.internal_code ?? "\u2014",
    });
  }

  return Array.from(seen.values()).sort((left, right) => left.label.localeCompare(right.label, "es"));
}

export function getDefaultColumnWidths() {
  return COLUMN_DEFINITIONS.reduce<BillingColumnWidthMap>((accumulator, definition) => {
    accumulator[definition.key] = definition.defaultWidth;
    return accumulator;
  }, {});
}

export function getColumnDefinition(columnKey: BillingColumnKey) {
  return COLUMN_DEFINITIONS.find((definition) => definition.key === columnKey);
}

export function getColumnWidth(columnKey: BillingColumnKey, widths: BillingColumnWidthMap) {
  return widths[columnKey] ?? getColumnDefinition(columnKey)?.defaultWidth ?? 10;
}

export function clampColumnWidth(columnKey: BillingColumnKey, width: number) {
  const definition = getColumnDefinition(columnKey);
  const minWidth = definition?.minWidth ?? 6;
  return Math.max(minWidth, Number(width.toFixed(2)));
}

export function moveColumn(columns: BillingColumnKey[], column: BillingColumnKey, direction: "up" | "down") {
  const currentIndex = columns.indexOf(column);
  if (currentIndex === -1) return columns;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= columns.length) return columns;

  const next = [...columns];
  const [item] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

export function orderColumnOptions(columns: BillingColumnKey[]) {
  const visible = columns;
  const hidden = COLUMN_DEFINITIONS.map((item) => item.key).filter((key) => !visible.includes(key));
  return [...visible, ...hidden];
}

export function countActiveFilters(filters: BillingViewFilters) {
  return [
    filters.invoiceStatus !== "all",
    filters.paymentStatus !== "all",
    Boolean(filters.customerId),
    Boolean(filters.invoiceDateFrom),
    Boolean(filters.invoiceDateTo),
    Boolean(filters.dueDateFrom),
    Boolean(filters.dueDateTo),
    filters.draftOnly !== "all",
  ].filter(Boolean).length;
}

export function sanitizeViewConfig(raw: unknown): BillingViewConfig {
  const input = typeof raw === "object" && raw !== null ? (raw as Partial<BillingViewConfig>) : {};
  const filters = typeof input.filters === "object" && input.filters !== null ? (input.filters as Partial<BillingViewFilters>) : {};

  const columns = Array.isArray(input.columns)
    ? input.columns.filter((column): column is BillingColumnKey => COLUMN_DEFINITIONS.some((item) => item.key === column))
    : DEFAULT_COLUMNS;

  const rawWidths = typeof input.columnWidths === "object" && input.columnWidths !== null ? (input.columnWidths as Record<string, unknown>) : {};
  const widths = Object.fromEntries(
    Object.entries(rawWidths).flatMap(([key, value]) => {
      if (!COLUMN_DEFINITIONS.some((item) => item.key === key)) return [];
      if (typeof value !== "number" || Number.isNaN(value)) return [];
      return [[key, clampColumnWidth(key as BillingColumnKey, value)]];
    })
  ) as BillingColumnWidthMap;

  return {
    search: typeof input.search === "string" ? input.search : SYSTEM_DEFAULT_VIEW.search,
    filters: {
      invoiceStatus:
        filters.invoiceStatus === "all" ||
        filters.invoiceStatus === "draft" ||
        filters.invoiceStatus === "issued" ||
        filters.invoiceStatus === "pending_payment" ||
        filters.invoiceStatus === "paid" ||
        filters.invoiceStatus === "cancelled"
          ? filters.invoiceStatus
          : DEFAULT_FILTERS.invoiceStatus,
      paymentStatus:
        filters.paymentStatus === "all" || filters.paymentStatus === "pending" || filters.paymentStatus === "paid"
          ? filters.paymentStatus
          : DEFAULT_FILTERS.paymentStatus,
      customerId: typeof filters.customerId === "string" ? filters.customerId : DEFAULT_FILTERS.customerId,
      invoiceDateFrom: typeof filters.invoiceDateFrom === "string" ? filters.invoiceDateFrom : DEFAULT_FILTERS.invoiceDateFrom,
      invoiceDateTo: typeof filters.invoiceDateTo === "string" ? filters.invoiceDateTo : DEFAULT_FILTERS.invoiceDateTo,
      dueDateFrom: typeof filters.dueDateFrom === "string" ? filters.dueDateFrom : DEFAULT_FILTERS.dueDateFrom,
      dueDateTo: typeof filters.dueDateTo === "string" ? filters.dueDateTo : DEFAULT_FILTERS.dueDateTo,
      draftOnly:
        filters.draftOnly === "all" || filters.draftOnly === "yes" || filters.draftOnly === "no"
          ? filters.draftOnly
          : DEFAULT_FILTERS.draftOnly,
    },
    groupBy:
      input.groupBy === "client" || input.groupBy === "invoice_status" || input.groupBy === "payment_status"
        ? input.groupBy
        : "none",
    columns: columns.length > 0 ? columns : DEFAULT_COLUMNS,
    columnWidths: { ...getDefaultColumnWidths(), ...widths },
  };
}

export function sanitizePreferences(raw: unknown): BillingViewPreferences {
  const input =
    typeof raw === "object" && raw !== null ? (raw as Partial<BillingViewPreferences> & { favorites?: unknown[] }) : {};

  const favorites = Array.isArray(input.favorites)
    ? input.favorites.flatMap((favorite) => {
        if (typeof favorite !== "object" || favorite === null) return [];
        const typed = favorite as Partial<SavedBillingFavoriteView>;
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

export function createPreferencesPayload(currentView: BillingViewConfig, defaultView: BillingViewConfig, favorites: SavedBillingFavoriteView[]) {
  return sanitizePreferences({
    currentView,
    defaultView,
    favorites,
  });
}

export function createFavoriteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `favorite-${Date.now()}`;
}
