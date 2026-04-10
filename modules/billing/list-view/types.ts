import type { BillingInvoiceStatus, BillingListRow, BillingPaymentStatus } from "@/services/billing-service";

export type BillingListRowClient = BillingListRow;
export type { BillingInvoiceStatus, BillingPaymentStatus };

export const COLUMN_DEFINITIONS = [
  { key: "number", label: "Numero", defaultWidth: 12, minWidth: 8, align: "left", required: true },
  { key: "client", label: "Cliente", defaultWidth: 24, minWidth: 16, align: "left", required: true },
  { key: "invoice_date", label: "Fecha factura", defaultWidth: 12, minWidth: 9, align: "left", required: true },
  { key: "due_date", label: "Fecha venc.", defaultWidth: 12, minWidth: 9, align: "left", required: true },
  { key: "total_clp", label: "Total CLP", defaultWidth: 10, minWidth: 8, align: "right", required: true },
  { key: "total_uf", label: "Total UF", defaultWidth: 10, minWidth: 8, align: "right", required: true },
  { key: "outstanding_amount", label: "Adeudado", defaultWidth: 10, minWidth: 8, align: "right", required: true },
  { key: "invoice_status", label: "Estado factura", defaultWidth: 10, minWidth: 8, align: "left", required: true },
  { key: "payment_status", label: "Estado pago", defaultWidth: 10, minWidth: 8, align: "left", required: true },
  { key: "service_period", label: "Periodo", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "subscription", label: "Suscripcion", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "client_rut", label: "RUT cliente", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "client_id", label: "Cliente ID", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "docs_block", label: "Bloqueos", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "created_at", label: "Fecha creacion", defaultWidth: 10, minWidth: 7, align: "left", required: false },
  { key: "updated_at", label: "Ult. actualizacion", defaultWidth: 10, minWidth: 7, align: "left", required: false },
] as const;

export type BillingColumnKey = (typeof COLUMN_DEFINITIONS)[number]["key"];
export type BillingGroupBy = "none" | "client" | "invoice_status" | "payment_status";
export type BillingColumnWidthMap = Partial<Record<BillingColumnKey, number>>;

export type BillingViewFilters = {
  invoiceStatus: "all" | BillingInvoiceStatus;
  paymentStatus: "all" | BillingPaymentStatus;
  customerId: string;
  invoiceDateFrom: string;
  invoiceDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  draftOnly: "all" | "yes" | "no";
};

export type BillingViewConfig = {
  search: string;
  filters: BillingViewFilters;
  groupBy: BillingGroupBy;
  columns: BillingColumnKey[];
  columnWidths: BillingColumnWidthMap;
};

export type SavedBillingFavoriteView = {
  id: string;
  name: string;
  config: BillingViewConfig;
};

export type BillingViewPreferences = {
  currentView: BillingViewConfig;
  defaultView: BillingViewConfig;
  favorites: SavedBillingFavoriteView[];
};

export const DEFAULT_FILTERS: BillingViewFilters = {
  invoiceStatus: "all",
  paymentStatus: "all",
  customerId: "",
  invoiceDateFrom: "",
  invoiceDateTo: "",
  dueDateFrom: "",
  dueDateTo: "",
  draftOnly: "all",
};

export const DEFAULT_COLUMNS: BillingColumnKey[] = [
  "number",
  "client",
  "invoice_date",
  "due_date",
  "total_clp",
  "total_uf",
  "outstanding_amount",
  "invoice_status",
  "payment_status",
];

export const SYSTEM_DEFAULT_VIEW: BillingViewConfig = {
  search: "",
  filters: DEFAULT_FILTERS,
  groupBy: "none",
  columns: DEFAULT_COLUMNS,
  columnWidths: {},
};
