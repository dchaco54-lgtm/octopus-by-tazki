import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { BillingPersistPayload } from "@/modules/billing/create-types";
import { createServerBillingClient, persistBillingDocument } from "@/modules/billing/server";

type ImportRow = Record<string, string | number | null | undefined>;

type CompanyRow = {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
  rut: string | null;
  internal_code: string | null;
  payer_client_id: string | null;
  currency: string | null;
  dte_email: string | null;
};

type SubscriptionRow = {
  id: string;
  company_id: string;
  subscription_code: string | null;
};

type ProductRow = {
  id: string;
  code: string | null;
  name: string | null;
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function normalizeCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getValue(row: ImportRow, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases.map(normalizeHeader)) {
    const found = entries.find(([key]) => normalizeHeader(key) === alias);
    if (found) return normalizeCell(found[1]);
  }
  return "";
}

function getNumber(value: string, fallback = 0) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDate(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeImportedDteStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "accepted" || normalized === "aceptado") return "accepted";
  if (normalized === "rejected" || normalized === "rechazado") return "rejected";
  if (normalized === "pending" || normalized === "pendiente" || normalized === "preparado" || normalized === "enviado") return "pending";
  if (normalized === "external") return "external";
  if (normalized === "not_sent" || normalized === "not sent") return "not_sent";
  return "external";
}

function findCompany(row: ImportRow, companies: CompanyRow[]) {
  const clientId = getValue(row, ["clienteid", "cliente_id", "internal_code"]);
  if (clientId) {
    const byInternalCode = companies.find((company) => (company.internal_code ?? "").toLowerCase() === clientId.toLowerCase());
    if (byInternalCode) return byInternalCode;
  }

  const rut = getValue(row, ["rut"]);
  if (rut) {
    const byRut = companies.find((company) => (company.rut ?? "").toLowerCase() === rut.toLowerCase());
    if (byRut) return byRut;
  }

  const clientName = getValue(row, ["cliente", "razonsocial", "razon_social", "legal_name", "trade_name"]);
  if (clientName) {
    const normalizedName = normalizeHeader(clientName);
    return (
      companies.find((company) => normalizeHeader(company.trade_name ?? "") === normalizedName) ??
      companies.find((company) => normalizeHeader(company.legal_name ?? "") === normalizedName) ??
      null
    );
  }

  return null;
}

function findSubscription(row: ImportRow, companyId: string, subscriptions: SubscriptionRow[]) {
  const subscriptionCode = getValue(row, ["suscripcion", "subscription", "subscription_code"]);
  if (subscriptionCode) {
    const found = subscriptions.find((subscription) => (subscription.subscription_code ?? "").toLowerCase() === subscriptionCode.toLowerCase());
    if (found) return found;
  }

  const companySubscriptions = subscriptions.filter((subscription) => subscription.company_id === companyId);
  if (companySubscriptions.length === 1) return companySubscriptions[0];
  return null;
}

function findProduct(row: ImportRow, products: ProductRow[]) {
  const code = getValue(row, ["producto", "product_code", "codigo_producto"]);
  if (code) {
    const byCode = products.find((product) => (product.code ?? "").toLowerCase() === code.toLowerCase());
    if (byCode) return byCode;
  }

  const name = getValue(row, ["nombre_producto", "product_name", "plan", "producto_nombre"]);
  if (name) {
    const normalizedName = normalizeHeader(name);
    return products.find((product) => normalizeHeader(product.name ?? "") === normalizedName) ?? null;
  }

  return null;
}

function buildInvoiceKey(row: ImportRow, index: number) {
  const invoiceNumber = getValue(row, ["numero", "numero_documento", "invoice_number"]);
  if (invoiceNumber) return `invoice:${invoiceNumber.toLowerCase()}`;

  const servicePeriod = getValue(row, ["periodo_servicio", "periodoservicio", "service_period"]);
  const clientId = getValue(row, ["clienteid", "cliente_id", "rut", "cliente"]);
  return `draft:${clientId}:${servicePeriod}:${index}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Debes adjuntar un archivo .csv, .xlsx o .xls." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "El archivo no contiene filas para importar." }, { status: 400 });
  }

  const supabase = await createServerBillingClient();
  const [{ data: companies }, { data: subscriptions }, { data: products }] = await Promise.all([
    supabase.from("companies").select("id, trade_name, legal_name, rut, internal_code, payer_client_id, currency, dte_email"),
    supabase.from("subscriptions").select("id, company_id, subscription_code").in("status", ["active", "suspended"]),
    supabase.from("products").select("id, code, name"),
  ]);

  const grouped = new Map<string, ImportRow[]>();
  rows.forEach((row, index) => {
    const key = buildInvoiceKey(row, index);
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  });

  const createdIds: string[] = [];
  const errors: string[] = [];

  for (const [key, invoiceRows] of grouped.entries()) {
    const baseRow = invoiceRows[0];
    const company = findCompany(baseRow, companies ?? []);
    if (!company) {
      errors.push(`${key}: no pudimos resolver el cliente por Cliente ID, RUT o nombre.`);
      continue;
    }

    const subscription = findSubscription(baseRow, company.id, subscriptions ?? []);
    if (!subscription) {
      errors.push(`${key}: no pudimos resolver la suscripcion. Si el cliente tiene varias, incluye la columna Suscripcion.`);
      continue;
    }

    const payerCompany = (companies ?? []).find((item) => item.id === company.payer_client_id) ?? company;
    const currency = getValue(baseRow, ["moneda"]).toUpperCase() === "CLP" ? "CLP" : "UF";
    const invoiceDate = getDate(getValue(baseRow, ["fecha_factura", "fechafactura"])) || new Date().toISOString().slice(0, 10);
    const dueDate = getDate(getValue(baseRow, ["fecha_venc", "fechavenc", "fecha_vencimiento"])) || invoiceDate;
    const documentType = getValue(baseRow, ["tipo_documento", "tipodocumento"]) || "33";
    const documentNumber = getValue(baseRow, ["numero", "numero_documento", "invoice_number"]);
    const servicePeriod = getValue(baseRow, ["periodo_servicio", "periodoservicio", "service_period"]) || invoiceDate.slice(0, 7);
    const paymentCondition = getValue(baseRow, ["condicion_pago", "condicionpago"]) || "30 dias";
    const dteStatus = normalizeImportedDteStatus(getValue(baseRow, ["estado_dte", "estadodte"]) || "external");
    const ufValueRaw = getValue(baseRow, ["valor_uf", "uf_value", "uf_mes", "uf"]);
    const referenceText = getValue(baseRow, ["referencia", "glosa", "referencia_glosa"]);
    const paymentLink = getValue(baseRow, ["link_pago", "linkdepago", "payment_link"]);
    const notes = getValue(baseRow, ["nota", "nota_interna", "observacion"]);

    const lines = invoiceRows.map((row) => {
      const product = findProduct(row, products ?? []);
      const quantity = getNumber(getValue(row, ["cantidad"]), 1);
      const priceFromRow =
        currency === "CLP"
          ? getNumber(getValue(row, ["precio", "total_clp", "monto"]))
          : getNumber(getValue(row, ["precio", "total_uf", "monto"]));
      const taxRate = getNumber(getValue(row, ["impuesto", "impuestos", "iva"]), 19);

      return {
        productId: product?.id ?? "",
        accountCode: getValue(row, ["cuenta_contable", "cuentacontable"]),
        quantity,
        price: priceFromRow,
        taxRate,
      };
    });

    const payload: BillingPersistPayload = {
      billingRecordId: null,
      origin: "externo",
      sourceSystem: "historical_migration",
      externalStatusMode: "automatic",
      ufValue: ufValueRaw ? getNumber(ufValueRaw) : null,
      companyId: company.id,
      payerCompanyId: payerCompany.id,
      subscriptionId: subscription.id,
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
      purchaseOrderReference: getValue(baseRow, ["oc", "referencia_oc"]),
      secondaryReferenceType: getValue(baseRow, ["migo", "edp"]).toUpperCase() === "MIGO" ? "MIGO" : getValue(baseRow, ["migo", "edp"]).toUpperCase() === "EDP" ? "EDP" : "HES",
      hesReference: getValue(baseRow, ["hes", "migo", "edp", "hes_migo_edp"]),
      executiveId: "",
      costCenter: getValue(baseRow, ["centro_costo", "centrodecosto"]),
      hubspotId: getValue(baseRow, ["hubspot_id", "idhubspot"]),
      dteEmail: company.dte_email ?? "",
      observations: notes,
      lines,
      notes: notes ? [{ body: notes }] : [],
    };

    const mode = "draft";
    const result = await persistBillingDocument(payload, { mode, supabase });

    if (!result.ok) {
      errors.push(`${key}: ${result.error}`);
      continue;
    }

    createdIds.push(result.recordId);
  }

  return NextResponse.json({
    ok: createdIds.length > 0,
    created: createdIds.length,
    createdIds,
    errors,
    message:
      errors.length === 0
        ? `Importacion completada. Se crearon ${createdIds.length} facturas.`
        : `Importacion parcial. Se crearon ${createdIds.length} facturas y ${errors.length} filas/grupos quedaron con observaciones.`,
  });
}
