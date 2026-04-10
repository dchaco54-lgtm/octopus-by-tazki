"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileDown, FileText, Plus, Trash2 } from "lucide-react";
import { DetailPageHeader } from "@/components/detail/detail-page-header";
import { DetailSidePanelSection } from "@/components/detail/detail-side-panel-section";
import { DetailTabs } from "@/components/detail/detail-tabs";
import { ERP_ASIDE_PANEL_CLASSNAME, ERP_SHEET_CLASSNAME, ERP_SHEET_WRAPPER_CLASSNAME } from "@/components/layout/erp-layout-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitBillingInvoiceAction, generateBillingOutputAction, saveBillingDraftAction, saveExternalBillingAction } from "@/modules/billing/actions";
import type { BillingExternalStatusMode, BillingPersistPayload, BillingRecordOrigin, BillingRecordStatus, BillingSecondaryReferenceType } from "@/modules/billing/create-types";
import { BillingStatusBadge } from "@/modules/billing/list-view/billing-status-badge";
import { formatCurrency, formatUf } from "@/modules/billing/list-view/helpers";

type BillingTab = "detail" | "other" | "integrations" | "notes" | "logs";

type CompanyOption = {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
  rut: string | null;
  internal_code: string | null;
  payer_client_id: string | null;
  currency: string | null;
  dte_email: string | null;
  billing_email: string | null;
};

type SubscriptionOption = {
  id: string;
  company_id: string;
  subscription_code: string | null;
  payment_terms_days: number | null;
};

type ProductOption = {
  id: string;
  code: string;
  name: string;
  base_price_uf: number;
};

type ExecutiveOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type CurrencyRateOption = {
  id: string;
  currency_code: "UF" | "CLP";
  period_year: number;
  period_month: number;
  reference_date: string;
  rate_value: number;
  source_type: "manual" | "api";
  is_active: boolean;
};

type PurchaseOrderOption = {
  id: string;
  client_id: string;
  purchase_order_number: string;
  valid_from: string | null;
  valid_to: string | null;
  status: string | null;
  notes: string | null;
};

type InvoiceLine = {
  id: string;
  productId: string;
  accountCode: string;
  quantity: number;
  price: number;
  taxRate: number;
};

type NoteItem = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

type LogItem = {
  id: string;
  action: string;
  user: string;
  createdAt: string;
};

const TABS: Array<{ key: BillingTab; label: string }> = [
  { key: "detail", label: "Detalle factura" },
  { key: "other", label: "Otra informacion" },
  { key: "integrations", label: "Integraciones" },
  { key: "notes", label: "Notas" },
  { key: "logs", label: "Logs" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "33", label: "33 · Factura afecta" },
  { value: "34", label: "34 · Factura exenta" },
  { value: "61", label: "61 · Nota de credito" },
];

const DTE_STATUS_OPTIONS = ["Pendiente", "Preparado", "Enviado", "Aceptado", "Rechazado"];
const ORIGIN_OPTIONS: Array<{ value: BillingRecordOrigin; label: string }> = [
  { value: "tazki", label: "Tazki" },
  { value: "externo", label: "Externo" },
];
const EXTERNAL_STATUS_OPTIONS: Array<{ value: BillingExternalStatusMode; label: string }> = [
  { value: "automatic", label: "Automatico segun deuda" },
  { value: "pending_payment", label: "Pendiente de pago" },
  { value: "paid", label: "Pagada" },
];
const TAX_OPTIONS = [
  { value: 0, label: "Exento" },
  { value: 19, label: "IVA 19%" },
];
const SECONDARY_REFERENCE_OPTIONS: Array<{ value: BillingSecondaryReferenceType; label: string }> = [
  { value: "HES", label: "HES" },
  { value: "MIGO", label: "MIGO" },
  { value: "EDP", label: "EDP" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number) {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getActivePurchaseOrder(orders: PurchaseOrderOption[], today: string) {
  return (
    orders
      .filter((order) => order.status === "vigente" && order.valid_from && order.valid_to && order.valid_from <= today && today <= order.valid_to)
      .sort((left, right) => (right.valid_from ?? "").localeCompare(left.valid_from ?? ""))[0] ?? null
  );
}

function formatPaymentCondition(days: number) {
  return `Credito ${days} dias`;
}

function encodeSecondaryReference(type: BillingSecondaryReferenceType, value: string) {
  const trimmed = value.trim();
  return trimmed ? `${type}|${trimmed}` : "";
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPeriodFromDate(value: string) {
  const [yearRaw, monthRaw] = value.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function getCompanyLabel(company: CompanyOption | undefined) {
  if (!company) return "-";
  return company.trade_name ?? company.legal_name ?? "Cliente sin nombre";
}

function getHeaderStatusMeta(status: BillingRecordStatus) {
  if (status === "paid") return { label: "Pagada", variant: "success" as const };
  if (status === "pending_payment") return { label: "Pendiente de pago", variant: "warning" as const };
  if (status === "issued") return { label: "Emitida", variant: "success" as const };
  if (status === "cancelled") return { label: "Anulada", variant: "default" as const };
  return { label: "Borrador", variant: "warning" as const };
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[170px_minmax(0,1fr)] items-center gap-3 py-1.5 text-sm">
      <span className="text-[11px] font-semibold text-[var(--tazki-slate-500)]">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

export function BillingCreateScreen({
  companies,
  subscriptions,
  products,
  executives,
  purchaseOrders,
  currencyRates,
  currentUserName,
  initialOrigin,
}: {
  companies: CompanyOption[];
  subscriptions: SubscriptionOption[];
  products: ProductOption[];
  executives: ExecutiveOption[];
  purchaseOrders: PurchaseOrderOption[];
  currencyRates: CurrencyRateOption[];
  currentUserName: string;
  initialOrigin: BillingRecordOrigin;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BillingTab>("detail");
  const [billingRecordId, setBillingRecordId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<BillingRecordOrigin>(initialOrigin);
  const [externalStatusMode, setExternalStatusMode] = useState<BillingExternalStatusMode>("automatic");
  const [invoiceStatus, setInvoiceStatus] = useState<BillingRecordStatus>(initialOrigin === "externo" ? "pending_payment" : "draft");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id ?? "");
  const [selectedPayerId, setSelectedPayerId] = useState(companies[0]?.payer_client_id ?? companies[0]?.id ?? "");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(subscriptions.find((subscription) => subscription.company_id === companies[0]?.id)?.id ?? "");
  const [currency, setCurrency] = useState<"UF" | "CLP">(((companies[0]?.currency as "UF" | "CLP" | null) ?? "CLP") === "UF" ? "UF" : "CLP");
  const [documentType, setDocumentType] = useState("33");
  const [documentNumber, setDocumentNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDays(todayIso(), 30));
  const [dteStatus, setDteStatus] = useState("Pendiente");
  const [paymentCondition, setPaymentCondition] = useState(formatPaymentCondition(30));
  const [referenceText, setReferenceText] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [servicePeriod, setServicePeriod] = useState("");
  const [secondaryReferenceType, setSecondaryReferenceType] = useState<BillingSecondaryReferenceType>("HES");
  const [hesReference, setHesReference] = useState("");
  const [executiveId, setExecutiveId] = useState(executives[0]?.id ?? "");
  const [costCenter, setCostCenter] = useState("");
  const [hubspotId, setHubspotId] = useState("");
  const [observations, setObservations] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: createId("log"),
      action: "Factura creada en modo borrador",
      user: currentUserName,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: createId("line"),
      productId: products[0]?.id ?? "",
      accountCode: "",
      quantity: 1,
      price: products[0]?.base_price_uf ?? 0,
      taxRate: 19,
    },
  ]);
  const [isPending, startTransition] = useTransition();

  const companiesById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const selectedCompany = selectedCompanyId ? companiesById.get(selectedCompanyId) : undefined;
  const selectedPayer = selectedPayerId ? companiesById.get(selectedPayerId) : undefined;
  const filteredSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.company_id === selectedCompanyId),
    [subscriptions, selectedCompanyId]
  );
  const selectedSubscription = useMemo(
    () => filteredSubscriptions.find((item) => item.id === selectedSubscriptionId) ?? filteredSubscriptions[0] ?? null,
    [filteredSubscriptions, selectedSubscriptionId]
  );
  const companyPurchaseOrders = useMemo(
    () => purchaseOrders.filter((order) => order.client_id === selectedCompanyId),
    [purchaseOrders, selectedCompanyId]
  );
  const activePurchaseOrder = useMemo(() => getActivePurchaseOrder(companyPurchaseOrders, invoiceDate), [companyPurchaseOrders, invoiceDate]);

  const lineItems = useMemo(
    () =>
      lines.map((line) => {
        const subtotal = line.quantity * line.price;
        const taxAmount = subtotal * (line.taxRate / 100);
        return {
          ...line,
          subtotal,
          taxAmount,
        };
      }),
    [lines]
  );

  const totals = useMemo(() => {
    const net = lineItems.reduce((sum, line) => sum + line.subtotal, 0);
    const iva = lineItems.reduce((sum, line) => sum + line.taxAmount, 0);
    return {
      net,
      iva,
      total: net + iva,
    };
  }, [lineItems]);
  const isExternal = origin === "externo";
  const resolvedCurrencyRate = useMemo(() => {
    const period = getPeriodFromDate(invoiceDate);
    if (!period) return null;

    return (
      currencyRates.find(
        (rate) =>
          rate.currency_code === "UF" &&
          rate.is_active &&
          rate.period_year === period.year &&
          rate.period_month === period.month
      ) ?? null
    );
  }, [currencyRates, invoiceDate]);
  const parsedUfValue = resolvedCurrencyRate?.rate_value ?? null;
  const displayInvoiceStatus = useMemo<BillingRecordStatus>(() => {
    if (!isExternal) return invoiceStatus;
    if (externalStatusMode === "pending_payment" || externalStatusMode === "paid") return externalStatusMode;
    const amountDueForStatus = parsedUfValue ? (currency === "UF" ? totals.total * parsedUfValue : totals.total) : totals.total;
    return amountDueForStatus > 500 ? "pending_payment" : "paid";
  }, [currency, externalStatusMode, invoiceStatus, isExternal, parsedUfValue, totals.total]);
  const paymentStatusAmount = parsedUfValue ? (currency === "UF" ? totals.total * parsedUfValue : totals.total) : totals.total;
  const paymentStatus = displayInvoiceStatus === "paid" || paymentStatusAmount <= 500 ? "paid" : "pending";
  const headerStatus = getHeaderStatusMeta(displayInvoiceStatus);
  const previewTotals = useMemo(() => {
    if (!parsedUfValue) return null;
    const factor = currency === "UF" ? parsedUfValue : 1 / parsedUfValue;
    const clpFactor = currency === "UF" ? parsedUfValue : 1;
    const ufFactor = currency === "UF" ? 1 : 1 / parsedUfValue;
    return {
      netUf: totals.net * ufFactor,
      ivaUf: totals.iva * ufFactor,
      totalUf: totals.total * ufFactor,
      netClp: totals.net * clpFactor,
      ivaClp: totals.iva * clpFactor,
      totalClp: totals.total * clpFactor,
      factor,
    };
  }, [currency, parsedUfValue, totals.iva, totals.net, totals.total]);

  function appendLog(action: string) {
    setLogs((current) => [
      {
        id: createId("log"),
        action,
        user: currentUserName,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  function updateLine(lineId: string, patch: Partial<InvoiceLine>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function handleCompanyChange(companyId: string) {
    const nextCompany = companiesById.get(companyId);
    const nextSubscriptions = subscriptions.filter((subscription) => subscription.company_id === companyId);
    const nextSubscription = nextSubscriptions[0] ?? null;

    setSelectedCompanyId(companyId);
    setSelectedPayerId(nextCompany?.payer_client_id ?? nextCompany?.id ?? "");
    setSelectedSubscriptionId(nextSubscription?.id ?? "");
    setCurrency(((nextCompany?.currency as "UF" | "CLP" | null) ?? "CLP") === "UF" ? "UF" : "CLP");
    const paymentDays = nextSubscription?.payment_terms_days ?? 30;
    setDueDate(addDays(invoiceDate, paymentDays));
    setPaymentCondition(formatPaymentCondition(paymentDays));
    setBillingRecordId(null);
  }

  function handleInvoiceDateChange(nextInvoiceDate: string) {
    setInvoiceDate(nextInvoiceDate);
    setDueDate(addDays(nextInvoiceDate, selectedSubscription?.payment_terms_days ?? 30));
  }

  function handleSubscriptionChange(subscriptionId: string) {
    const nextSubscription = filteredSubscriptions.find((item) => item.id === subscriptionId) ?? null;
    const paymentDays = nextSubscription?.payment_terms_days ?? 30;
    setSelectedSubscriptionId(subscriptionId);
    setDueDate(addDays(invoiceDate, paymentDays));
    setPaymentCondition(formatPaymentCondition(paymentDays));
  }

  function addLine() {
    const defaultProduct = products[0];
    setLines((current) => [
      ...current,
      {
        id: createId("line"),
        productId: defaultProduct?.id ?? "",
        accountCode: "",
        quantity: 1,
        price: defaultProduct?.base_price_uf ?? 0,
        taxRate: 19,
      },
    ]);
    appendLog("Linea de factura agregada");
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
    appendLog("Linea de factura eliminada");
  }

  function handleProductChange(lineId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLine(lineId, {
      productId,
      price: product?.base_price_uf ?? 0,
    });
  }

  function buildPayload(): BillingPersistPayload {
    return {
      billingRecordId,
      origin,
      sourceSystem: "octopus_ui",
      externalStatusMode,
      ufValue: parsedUfValue,
      companyId: selectedCompanyId,
      payerCompanyId: selectedPayerId || selectedCompanyId,
      subscriptionId: selectedSubscription?.id ?? selectedSubscriptionId,
      currency,
      documentType,
      documentNumber,
      invoiceDate,
      dueDate,
      dteStatus,
      paymentCondition,
      referenceText,
      paymentLink,
      servicePeriod,
      purchaseOrderReference: activePurchaseOrder?.purchase_order_number ?? "",
      secondaryReferenceType,
      hesReference: encodeSecondaryReference(secondaryReferenceType, hesReference),
      executiveId,
      costCenter,
      hubspotId,
      dteEmail: selectedPayer?.dte_email ?? selectedCompany?.dte_email ?? "",
      observations,
      lines,
      notes: notes.map((note) => ({
        id: note.id,
        body: note.body,
        author: note.author,
        createdAt: note.createdAt,
      })),
    };
  }

  function handleActionResult(message: string, nextRecordId: string, nextStatus: BillingRecordStatus, downloadPath?: string | null) {
    setBillingRecordId(nextRecordId);
    setInvoiceStatus(nextStatus);
    setStatusMessage(message);
    setStatusError(null);
    if (downloadPath) {
      window.open(downloadPath, "_blank", "noopener,noreferrer");
    }
    router.refresh();
  }

  function runPersistAction(
    action: (payload: BillingPersistPayload) => Promise<{ ok: boolean; error?: string; recordId?: string; message?: string; invoiceStatus?: BillingRecordStatus; downloadPath?: string | null }>
  ) {
    setStatusMessage(null);
    setStatusError(null);

    startTransition(async () => {
      const result = await action(buildPayload());

      if (!result.ok || !result.recordId || !result.message || !result.invoiceStatus) {
        setStatusError(result.error ?? "No fue posible completar la accion.");
        return;
      }

      handleActionResult(result.message, result.recordId, result.invoiceStatus, result.downloadPath);
    });
  }

  function saveDraft() {
    runPersistAction(isExternal ? saveExternalBillingAction : saveBillingDraftAction);
  }

  function emitInvoice() {
    runPersistAction(emitBillingInvoiceAction);
  }

  function generateXml() {
    runPersistAction((payload) => generateBillingOutputAction(payload, "xml"));
  }

  function generatePdf() {
    runPersistAction((payload) => generateBillingOutputAction(payload, "pdf"));
  }

  async function copyPaymentLink() {
    if (!paymentLink.trim()) return;
    try {
      await navigator.clipboard.writeText(paymentLink.trim());
      appendLog("Link de pago copiado");
      setStatusMessage("Link de pago copiado al portapapeles.");
      setStatusError(null);
    } catch {
      appendLog("No se pudo copiar el link de pago");
      setStatusError("No se pudo copiar el link de pago.");
    }
  }

  function saveNote() {
    if (!notesDraft.trim()) return;
    setNotes((current) => [
      {
        id: createId("note"),
        body: notesDraft.trim(),
        author: currentUserName,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setNotesDraft("");
    appendLog("Nota agregada a la factura");
  }

  return (
    <section className={`${ERP_SHEET_WRAPPER_CLASSNAME} p-3 lg:p-4`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className={`${ERP_SHEET_CLASSNAME} px-5 py-4`}>
          <DetailPageHeader
            moduleLabel="Facturacion"
            title={isExternal ? "Cargar factura externa" : "Nueva factura"}
            subtitle={[selectedCompany ? getCompanyLabel(selectedCompany) : null, selectedCompany?.internal_code ? `Cliente ID ${selectedCompany.internal_code}` : null].filter(Boolean).join(" · ")}
            statusLabel={headerStatus.label}
            statusVariant={headerStatus.variant}
            actions={
              <>
                <Button type="button" size="sm" variant="outline" onClick={saveDraft} disabled={isPending || !parsedUfValue}>
                  {isExternal ? "Cargar factura externa" : "Guardar"}
                </Button>
                {!isExternal ? (
                  <Button type="button" size="sm" onClick={emitInvoice} disabled={isPending || !parsedUfValue}>
                    Emitir / Confirmar
                  </Button>
                ) : null}
                {!isExternal ? (
                  <Button type="button" size="sm" variant="outline" onClick={generateXml} disabled={isPending || !parsedUfValue}>
                    Generar XML
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" onClick={generatePdf} disabled={isPending || !parsedUfValue}>
                  Generar PDF
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={copyPaymentLink} disabled={isPending}>
                  Copiar link
                </Button>
                <Link href="/billing" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-[13px] font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
                  Volver
                </Link>
              </>
            }
          />

          {statusMessage ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</div>
          ) : null}
          {statusError ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{statusError}</div>
          ) : null}
          {!parsedUfValue ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No hay UF activa configurada para {new Date(`${invoiceDate}T00:00:00`).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}. Cargala en{" "}
              <Link href="/settings/currencies" className="font-semibold underline">
                Configuracion &gt; Monedas
              </Link>
              .
            </div>
          ) : null}

          <div className="grid gap-x-10 gap-y-0.5 pt-3 md:grid-cols-2">
            <div>
              <FormField label="Cliente">
                <select
                  value={selectedCompanyId}
                  onChange={(event) => handleCompanyChange(event.target.value)}
                  className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {getCompanyLabel(company)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Origen factura">
                <select
                  value={origin}
                  onChange={(event) => {
                    const nextOrigin = event.target.value as BillingRecordOrigin;
                    setOrigin(nextOrigin);
                    setInvoiceStatus(nextOrigin === "externo" ? (totals.total > 500 ? "pending_payment" : "paid") : "draft");
                  }}
                  className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                >
                  {ORIGIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Cliente pagador">
                <select
                  value={selectedPayerId}
                  onChange={(event) => setSelectedPayerId(event.target.value)}
                  className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {getCompanyLabel(company)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="RUT">
                <Input value={selectedPayer?.rut ?? selectedCompany?.rut ?? ""} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
              <FormField label="Moneda">
                <select value={currency} onChange={(event) => setCurrency(event.target.value as "UF" | "CLP")} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                  <option value="UF">UF</option>
                  <option value="CLP">CLP</option>
                </select>
              </FormField>
              <FormField label="Tipo documento">
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Numero documento">
                <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder="Puede quedar vacio en borrador" className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
            </div>

            <div>
              <FormField label="Fecha factura">
                <Input type="date" value={invoiceDate} onChange={(event) => handleInvoiceDateChange(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
              <FormField label="Fecha vencimiento">
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
              <FormField label="Suscripcion">
                <select value={selectedSubscription?.id ?? selectedSubscriptionId} onChange={(event) => handleSubscriptionChange(event.target.value)} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                  {filteredSubscriptions.map((subscription) => (
                    <option key={subscription.id} value={subscription.id}>
                      {subscription.subscription_code ?? subscription.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="UF del periodo">
                <Input
                  value={parsedUfValue ? formatUf(parsedUfValue) : "Sin configurar"}
                  readOnly
                  className="h-8 border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-2 py-1 text-[13px] shadow-none"
                />
              </FormField>
              {!isExternal ? (
                <FormField label="Estado DTE">
                  <select value={dteStatus} onChange={(event) => setDteStatus(event.target.value)} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                    {DTE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <FormField label="Estado externo">
                  <select
                    value={externalStatusMode}
                    onChange={(event) => setExternalStatusMode(event.target.value as BillingExternalStatusMode)}
                    className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                  >
                    {EXTERNAL_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              <FormField label="Condicion pago">
                <Input value={paymentCondition} readOnly className="h-8 border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
              <FormField label="Referencia / glosa">
                <Input value={referenceText} onChange={(event) => setReferenceText(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
              <FormField label="Link de pago">
                <Input value={paymentLink} onChange={(event) => setPaymentLink(event.target.value)} placeholder="https://..." className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
              </FormField>
            </div>
          </div>

          <div className="mt-3.5">
            <DetailTabs tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

            <div className="pt-3">
              {activeTab === "detail" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tazki-slate-400)]">Detalle factura</p>
                      <h2 className="mt-1 text-base font-semibold text-[var(--tazki-slate-950)]">Lineas del documento</h2>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addLine}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Agregar linea
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[var(--tazki-slate-200)]">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-[var(--tazki-slate-50)]">
                        <tr className="border-b border-[var(--tazki-slate-200)]">
                          <th className="w-[24%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Producto</th>
                          <th className="w-[18%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Cuenta contable</th>
                          <th className="w-[10%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Cantidad</th>
                          <th className="w-[14%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Precio</th>
                          <th className="w-[14%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Impuestos</th>
                          <th className="w-[14%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Subtotal</th>
                          <th className="w-[6%] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tazki-slate-500)]">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((line) => (
                          <tr key={line.id} className="border-b border-[var(--tazki-slate-200)] last:border-b-0">
                            <td className="px-3 py-2">
                              <select
                                value={line.productId}
                                onChange={(event) => handleProductChange(line.id, event.target.value)}
                                className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                              >
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.code} · {product.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <Input value={line.accountCode} onChange={(event) => updateLine(line.id, { accountCode: event.target.value })} placeholder="Pendiente" className="h-9 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) || 0 })} className="h-9 border-[var(--tazki-slate-200)] px-2 py-1 text-right text-[13px] shadow-none" />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min="0" step="0.01" value={line.price} onChange={(event) => updateLine(line.id, { price: Number(event.target.value) || 0 })} className="h-9 border-[var(--tazki-slate-200)] px-2 py-1 text-right text-[13px] shadow-none" />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={line.taxRate}
                                onChange={(event) => updateLine(line.id, { taxRate: Number(event.target.value) })}
                                className="h-9 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]"
                              >
                                {TAX_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-[var(--tazki-slate-900)]">
                              {currency === "UF" ? formatUf(line.subtotal) : formatCurrency(line.subtotal)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--tazki-slate-500)] hover:bg-[var(--tazki-slate-100)] hover:text-[var(--tazki-slate-950)]"
                                aria-label="Eliminar linea"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-full max-w-[320px] space-y-2 rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--tazki-slate-500)]">Neto</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{currency === "UF" ? formatUf(totals.net) : formatCurrency(totals.net)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--tazki-slate-500)]">IVA</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{currency === "UF" ? formatUf(totals.iva) : formatCurrency(totals.iva)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--tazki-slate-200)] pt-2 text-sm">
                        <span className="font-semibold text-[var(--tazki-slate-900)]">Total</span>
                        <span className="text-base font-semibold text-[var(--tazki-slate-950)]">{currency === "UF" ? formatUf(totals.total) : formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "other" ? (
                <div className="grid gap-x-10 gap-y-0.5 md:grid-cols-2">
                  <div>
                    <FormField label="Observaciones internas">
                      <textarea value={observations} onChange={(event) => setObservations(event.target.value)} className="min-h-[88px] w-full rounded-md border border-[var(--tazki-slate-200)] px-3 py-2 text-[13px] outline-none" />
                    </FormField>
                    <FormField label="Centro de costo">
                      <Input value={costCenter} onChange={(event) => setCostCenter(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Ejecutivo comercial">
                      <select value={executiveId} onChange={(event) => setExecutiveId(event.target.value)} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                        {executives.map((executive) => (
                          <option key={executive.id} value={executive.id}>
                            {executive.full_name ?? executive.email ?? "Sin nombre"}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Cliente ID">
                      <Input value={selectedCompany?.internal_code ?? ""} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="ID HubSpot">
                      <Input value={hubspotId} onChange={(event) => setHubspotId(event.target.value)} placeholder="Pendiente de integracion" className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                  </div>
                  <div>
                    <FormField label="Periodo servicio">
                      <Input value={servicePeriod} onChange={(event) => setServicePeriod(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Referencia 1 · OC">
                      <Input value={activePurchaseOrder?.purchase_order_number ?? "Sin referencia"} readOnly className="h-8 border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Referencia 2 tipo">
                      <select value={secondaryReferenceType} onChange={(event) => setSecondaryReferenceType(event.target.value as BillingSecondaryReferenceType)} className="h-8 w-full rounded-md border border-[var(--tazki-slate-200)] bg-white px-2 text-[13px]">
                        {SECONDARY_REFERENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Referencia 2 valor">
                      <Input value={hesReference} onChange={(event) => setHesReference(event.target.value)} placeholder={`${secondaryReferenceType} / numero`} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Correo DTE">
                      <Input value={selectedPayer?.dte_email ?? selectedCompany?.dte_email ?? ""} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Condicion pago">
                      <Input value={paymentCondition} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                  </div>
                </div>
              ) : null}

              {activeTab === "integrations" ? (
                <div className="grid gap-x-10 gap-y-0.5 md:grid-cols-2">
                  {!isExternal ? (
                    <div>
                      <FormField label="Estado integracion SII">
                        <Input value={dteStatus} onChange={(event) => setDteStatus(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                      </FormField>
                      <FormField label="Fecha envio XML">
                        <Input value={invoiceStatus === "issued" ? todayIso() : ""} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                      </FormField>
                      <FormField label="Fecha generacion PDF">
                        <Input value={invoiceStatus === "issued" ? todayIso() : ""} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                      </FormField>
                      <FormField label="URL XML">
                        <Input placeholder="https://..." className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                      </FormField>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-4 text-sm text-[var(--tazki-slate-600)]">
                      La factura externa no usa emision interna, XML ni validaciones SII. Solo mantiene referencias operativas y PDF.
                    </div>
                  )}
                  <div>
                    <FormField label="URL PDF">
                      <Input placeholder="https://..." className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="URL link de pago">
                      <Input value={paymentLink} onChange={(event) => setPaymentLink(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label={isExternal ? "Folio documento" : "Folio SII"}>
                      <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                    <FormField label="Estado sincronizacion">
                      <Input value={isExternal ? "Manual" : invoiceStatus === "issued" ? "Sincronizado" : "Pendiente"} readOnly className="h-8 border-[var(--tazki-slate-200)] px-2 py-1 text-[13px] shadow-none" />
                    </FormField>
                  </div>
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <textarea
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      placeholder="Escribe una nota interna..."
                      className="min-h-[120px] w-full rounded-xl border border-[var(--tazki-slate-200)] px-4 py-3 text-sm outline-none"
                    />
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={saveNote}>
                        Guardar nota
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <p className="text-sm text-[var(--tazki-slate-500)]">Aun no hay notas registradas.</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="rounded-xl border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-4 py-3">
                          <p className="text-sm text-[var(--tazki-slate-800)]">{note.body}</p>
                          <p className="mt-2 text-xs text-[var(--tazki-slate-500)]">
                            {note.author} · {new Date(note.createdAt).toLocaleString("es-CL")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "logs" ? (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="grid grid-cols-[160px_180px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--tazki-slate-200)] px-4 py-3 text-sm">
                      <span className="text-[var(--tazki-slate-500)]">{new Date(log.createdAt).toLocaleString("es-CL")}</span>
                      <span className="font-medium text-[var(--tazki-slate-900)]">{log.user}</span>
                      <span className="text-[var(--tazki-slate-700)]">{log.action}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-[88px] xl:self-start">
          <div className={ERP_ASIDE_PANEL_CLASSNAME}>
            <div className="space-y-4 px-4 py-3">
              <DetailSidePanelSection eyebrow="Documento" title="Estado">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <BillingStatusBadge kind="invoice" status={displayInvoiceStatus} />
                    <BillingStatusBadge kind="payment" status={paymentStatus} />
                  </div>
                  <p className="text-sm text-[var(--tazki-slate-600)]">Origen: {isExternal ? "Externo" : "Tazki"}</p>
                  {!isExternal ? <p className="text-sm text-[var(--tazki-slate-600)]">DTE: {dteStatus}</p> : null}
                  <p className="text-sm text-[var(--tazki-slate-600)]">Tipo documento: {documentType}</p>
                </div>
              </DetailSidePanelSection>

              <DetailSidePanelSection eyebrow="Resumen" title="Totales">
                <div className="space-y-2 text-sm">
                  {parsedUfValue ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--tazki-slate-500)]">UF usada</span>
                      <span className="font-medium text-[var(--tazki-slate-900)]">{formatUf(parsedUfValue)}</span>
                    </div>
                  ) : null}
                  {resolvedCurrencyRate ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--tazki-slate-500)]">Referencia</span>
                      <span className="font-medium text-[var(--tazki-slate-900)]">{new Date(`${resolvedCurrencyRate.reference_date}T00:00:00`).toLocaleDateString("es-CL")}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tazki-slate-500)]">Neto</span>
                    <span className="font-medium text-[var(--tazki-slate-900)]">{currency === "UF" ? formatUf(totals.net) : formatCurrency(totals.net)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tazki-slate-500)]">IVA</span>
                    <span className="font-medium text-[var(--tazki-slate-900)]">{currency === "UF" ? formatUf(totals.iva) : formatCurrency(totals.iva)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--tazki-slate-500)]">Total</span>
                    <span className="text-base font-semibold text-[var(--tazki-slate-950)]">{currency === "UF" ? formatUf(totals.total) : formatCurrency(totals.total)}</span>
                  </div>
                  {previewTotals ? (
                    <div className="rounded-lg border border-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tazki-slate-400)]">Vista dual UF / CLP</p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-[var(--tazki-slate-500)]">Total UF</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatUf(previewTotals.totalUf)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-[var(--tazki-slate-500)]">Total CLP</span>
                        <span className="font-medium text-[var(--tazki-slate-900)]">{formatCurrency(previewTotals.totalClp)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--tazki-slate-500)]">Configura la UF del periodo para guardar la factura con snapshot monetario y generar PDF.</p>
                  )}
                </div>
              </DetailSidePanelSection>

              <DetailSidePanelSection eyebrow="Outputs" title="Generacion">
                <div className="space-y-2">
                  {!isExternal ? (
                    <Button type="button" size="sm" variant="outline" className="w-full justify-start" onClick={generateXml}>
                      <FileText className="mr-2 h-4 w-4" />
                      Generar XML
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="outline" className="w-full justify-start" onClick={generatePdf} disabled={isPending || !parsedUfValue}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Generar PDF
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="w-full justify-start" onClick={copyPaymentLink} disabled={isPending}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar link de pago
                  </Button>
                </div>
              </DetailSidePanelSection>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
