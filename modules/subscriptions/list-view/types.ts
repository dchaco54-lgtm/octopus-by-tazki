export type SubscriptionListStatus = "active" | "demo" | "closed";
export type DerivedSubscriptionStatus = "active" | "suspended" | "cancelled" | "onboarding";

export type SubscriptionListRowClient = {
  id: string;
  subscription_code: string;
  status: SubscriptionListStatus;
  close_reason: string | null;
  start_date: string | null;
  end_date: string | null;
  next_billing_date: string | null;
  suspension_date: string | null;
  billing_type: string | null;
  recurrence: string | null;
  channel: string | null;
  hubspot_deal_id: string | null;
  payer_name: string | null;
  payer_rut: string | null;
  total_mrr_uf: number;
  delta_mrr_uf: number;
  movement_type: "new" | "expansion" | "contraction" | "churn" | "flat";
  sales_owner_name: string | null;
  middleware_sync_status: string | null;
  hubspot_sync_status: string | null;
  customer: {
    id: string;
    trade_name: string | null;
    legal_name: string | null;
    rut: string | null;
    internal_code: string | null;
  } | null;
  previous_subscription: {
    id: string;
    subscription_code: string | null;
    total_mrr_uf: number | string | null;
  } | null;
  pricing_strategy: { id: string; code: string | null; name: string | null } | null;
  sales_executive: { id: string; full_name: string | null; email: string | null } | null;
  contracted_plan: string | null;
  created_at?: string;
  updated_at?: string;
};

export const COLUMN_DEFINITIONS = [
  { key: "subscription_code", label: "ID Suscripcion", defaultWidth: 8, minWidth: 6, align: "left", required: true },
  { key: "customer", label: "Cliente", defaultWidth: 24, minWidth: 16, align: "left", required: true },
  { key: "start_date", label: "Fecha inicio", defaultWidth: 12, minWidth: 9, align: "left", required: true },
  { key: "next_billing_date", label: "Proxima facturacion", defaultWidth: 14, minWidth: 10, align: "left", required: true },
  { key: "product", label: "Plan / Producto", defaultWidth: 16, minWidth: 11, align: "left", required: true },
  { key: "net_uf", label: "Valor UF Neto", defaultWidth: 10, minWidth: 8, align: "right", required: true },
  { key: "suspension_date", label: "Fecha suspension", defaultWidth: 8, minWidth: 6, align: "left", required: true },
  { key: "status", label: "Estado", defaultWidth: 8, minWidth: 6, align: "left", required: true },
  { key: "customer_rut", label: "RUT cliente", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "sales_executive", label: "Ejecutivo comercial", defaultWidth: 14, minWidth: 9, align: "left", required: false },
  { key: "channel", label: "Canal de venta", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "pricing_strategy", label: "Estrategia de pricing", defaultWidth: 14, minWidth: 9, align: "left", required: false },
  { key: "recurrence", label: "Frecuencia de facturacion", defaultWidth: 12, minWidth: 8, align: "left", required: false },
  { key: "hubspot_deal_id", label: "ID HubSpot", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "end_date", label: "Fecha de termino", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "close_reason", label: "Motivo de suspension", defaultWidth: 12, minWidth: 8, align: "left", required: false },
  { key: "movement_type", label: "Tipo de ingreso", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "billing_type", label: "Tipo de facturacion", defaultWidth: 12, minWidth: 8, align: "left", required: false },
  { key: "payer_name", label: "Pagador", defaultWidth: 12, minWidth: 8, align: "left", required: false },
  { key: "created_at", label: "Fecha creacion", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "updated_at", label: "Ultima actualizacion", defaultWidth: 10, minWidth: 7, align: "left", required: false },
] as const;

export type ColumnKey = (typeof COLUMN_DEFINITIONS)[number]["key"];
export type GroupBy = "none" | "customer" | "status" | "product" | "sales_executive";
export type ColumnWidthMap = Partial<Record<ColumnKey, number>>;

export type SubscriptionViewFilters = {
  status: "all" | DerivedSubscriptionStatus;
  customerId: string;
  product: string;
  startDateFrom: string;
  startDateTo: string;
  nextBillingFrom: string;
  nextBillingTo: string;
  suspended: "all" | "yes" | "no";
};

export type SubscriptionViewConfig = {
  search: string;
  filters: SubscriptionViewFilters;
  groupBy: GroupBy;
  columns: ColumnKey[];
  columnWidths: ColumnWidthMap;
};

export type SavedFavoriteView = {
  id: string;
  name: string;
  config: SubscriptionViewConfig;
};

export type SubscriptionViewPreferences = {
  currentView: SubscriptionViewConfig;
  defaultView: SubscriptionViewConfig;
  favorites: SavedFavoriteView[];
};

export const DEFAULT_FILTERS: SubscriptionViewFilters = {
  status: "all",
  customerId: "",
  product: "",
  startDateFrom: "",
  startDateTo: "",
  nextBillingFrom: "",
  nextBillingTo: "",
  suspended: "all",
};

export const DEFAULT_COLUMNS: ColumnKey[] = [
  "subscription_code",
  "customer",
  "start_date",
  "next_billing_date",
  "product",
  "net_uf",
  "suspension_date",
  "status",
];

export const SYSTEM_DEFAULT_VIEW: SubscriptionViewConfig = {
  search: "",
  filters: DEFAULT_FILTERS,
  groupBy: "none",
  columns: DEFAULT_COLUMNS,
  columnWidths: {},
};
