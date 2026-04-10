import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BillingDocumentMode, BillingLineInput, BillingOutputKind, BillingPersistPayload, BillingPersistResult, BillingRecordStatus, BillingSecondaryReferenceType, BillingSourceSystem } from "@/modules/billing/create-types";
import { BILLING_PDF_BRANDING } from "@/modules/billing/pdf-branding";

type BillingSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type BillingActor = {
  userName: string;
  userEmail: string;
};

type BillingProductRow = {
  id: string;
  code: string | null;
  name: string | null;
};

type BillingCompanyRow = {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
  rut: string | null;
  internal_code: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  country: string | null;
  company_email: string | null;
  billing_email: string | null;
  dte_email: string | null;
  industry: string | null;
  customer_type: string | null;
};

type BillingSubscriptionRow = {
  id: string;
  subscription_code: string | null;
};

type StoredBillingRecordRow = {
  id: string;
  origin: string | null;
  company_id: string | null;
  payer_company_id: string | null;
  subscription_id: string | null;
  currency: "UF" | "CLP" | null;
  document_type: string | null;
  invoice_number: string | null;
  expected_invoice_date: string | null;
  actual_invoice_date: string | null;
  due_date: string | null;
  dte_status: string | null;
  payment_condition: string | null;
  reference_text: string | null;
  payment_link: string | null;
  service_period: string | null;
  purchase_order_reference: string | null;
  hes_reference: string | null;
  executive_id: string | null;
  cost_center: string | null;
  hubspot_id: string | null;
  dte_email: string | null;
  notes: string | null;
  status: string | null;
  source_system: string | null;
  currency_rate_id: string | null;
  uf_value: number | string | null;
  uf_value_used: number | string | null;
};

type CurrencyRateRow = {
  id: string;
  currency_code: "UF" | "CLP";
  period_year: number;
  period_month: number;
  reference_date: string;
  rate_value: number | string;
  source_type: "manual" | "api";
  is_active: boolean;
};

type StoredBillingLineRow = {
  id: string;
  product_id: string | null;
  account_code: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  tax_rate: number | string | null;
};

type StoredBillingNoteRow = {
  id: string;
  body: string | null;
  author_name: string | null;
  created_at: string | null;
};

function roundToTwo(value: number) {
  return Number(value.toFixed(2));
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function encodePdfTextHex(value: string) {
  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022]/g, "-");

  const bytes = Array.from(normalized, (char) => {
    const code = char.charCodeAt(0);
    return code <= 0xff ? code : 0x20;
  });

  return Buffer.from(bytes).toString("hex").toUpperCase();
}

function escapePdfUrl(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "%28").replaceAll(")", "%29");
}

function isoDateTime(value: string | undefined) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeServicePeriod(value: string, invoiceDate: string) {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return invoiceDate ? invoiceDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function buildServicePeriodRange(servicePeriod: string, invoiceDate: string) {
  const source = /^(\d{4})-(\d{2})$/.exec(servicePeriod.trim()) ? servicePeriod.trim() : invoiceDate.slice(0, 7);
  const [yearRaw, monthRaw] = source.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return {
      start: invoiceDate,
      end: invoiceDate,
    };
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getDocumentTypeLabel(type: string) {
  if (type === "34") return "Factura exenta";
  if (type === "61") return "Nota de credito";
  return "Factura electronica";
}

function formatPdfInteger(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function formatPdfDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

function formatPdfLongDate(value: string) {
  if (!value) return "-";
  const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeUfValue(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Number(value.toFixed(6)) : null;
}

function formatPdfServicePeriod(value: string, invoiceDate: string) {
  const normalized = normalizeServicePeriod(value, invoiceDate);
  const [year, month] = normalized.split("-");
  if (!year || !month) return normalized;
  return `${month}/${year}`;
}

function decodeSecondaryReference(rawValue: string | null | undefined): { type: BillingSecondaryReferenceType; value: string } | null {
  const trimmed = rawValue?.trim();
  if (!trimmed) return null;

  const pipeIndex = trimmed.indexOf("|");
  if (pipeIndex <= 0) {
    return { type: "HES", value: trimmed };
  }

  const type = trimmed.slice(0, pipeIndex).trim().toUpperCase();
  const value = trimmed.slice(pipeIndex + 1).trim();
  if (!value) return null;

  if (type === "MIGO" || type === "EDP") {
    return { type, value };
  }

  return { type: "HES", value };
}

function getPeriodFromInvoiceDate(value: string) {
  const [yearRaw, monthRaw] = value.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function hasSamePeriod(left: string | null | undefined, right: string) {
  if (!left) return false;
  return left.slice(0, 7) === right.slice(0, 7);
}

function toNullableNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeStoredOrigin(origin: string | null | undefined): BillingPersistPayload["origin"] {
  return origin === "tazki" ? "tazki" : "externo";
}

function normalizeSourceSystem(value: string | null | undefined, origin: BillingPersistPayload["origin"]): BillingSourceSystem {
  if (value === "historical_migration" || value === "api" || value === "hubspot" || value === "external_upload" || value === "octopus_ui") {
    return value;
  }

  if (origin === "externo") {
    return "external_upload";
  }

  return "octopus_ui";
}

function buildDualCurrencyTotals(args: {
  currency: "UF" | "CLP";
  totals: { net: number; tax: number; total: number };
  ufValue: number;
}) {
  if (args.currency === "UF") {
    return {
      netUf: args.totals.net,
      taxUf: args.totals.tax,
      totalUf: args.totals.total,
      netClp: roundToTwo(args.totals.net * args.ufValue),
      taxClp: roundToTwo(args.totals.tax * args.ufValue),
      totalClp: roundToTwo(args.totals.total * args.ufValue),
    };
  }

  return {
    netUf: roundToTwo(args.totals.net / args.ufValue),
    taxUf: roundToTwo(args.totals.tax / args.ufValue),
    totalUf: roundToTwo(args.totals.total / args.ufValue),
    netClp: args.totals.net,
    taxClp: args.totals.tax,
    totalClp: args.totals.total,
  };
}

function readBillingLogoJpeg() {
  try {
    const assetPath = path.join(process.cwd(), "public", BILLING_PDF_BRANDING.logoAssetPath.replace(/^\//, ""));
    return fs.readFileSync(assetPath);
  } catch {
    return null;
  }
}

function buildPaymentConditionLabel(rawValue: string, invoiceDate: string, dueDate: string) {
  const trimmed = rawValue.trim();
  if (trimmed) return trimmed;

  const invoice = new Date(`${invoiceDate}T00:00:00`);
  const due = new Date(`${dueDate}T00:00:00`);
  const diff = Number.isNaN(invoice.getTime()) || Number.isNaN(due.getTime()) ? null : Math.round((due.getTime() - invoice.getTime()) / 86400000);
  if (diff === null) return "Condicion por definir";
  return `${diff} dias`;
}

function normalizeDteStatus(value: string, origin: BillingPersistPayload["origin"]) {
  const normalized = value.trim().toLowerCase();

  if (origin === "externo") {
    if (normalized === "accepted" || normalized === "aceptado") return "accepted";
    if (normalized === "rejected" || normalized === "rechazado") return "rejected";
    if (normalized === "pending" || normalized === "pendiente" || normalized === "preparado" || normalized === "enviado") return "external";
    if (normalized === "external") return "external";
    return "external";
  }

  if (normalized === "accepted" || normalized === "aceptado") return "accepted";
  if (normalized === "rejected" || normalized === "rechazado") return "rejected";
  if (normalized === "pending" || normalized === "pendiente" || normalized === "preparado" || normalized === "enviado") return "pending";
  if (normalized === "not_sent" || normalized === "no_enviado" || normalized === "not sent") return "not_sent";
  if (normalized === "external") return "external";

  return "pending";
}

function deriveOutstandingAmount(currency: "UF" | "CLP", totals: { total: number }, ufValue: number | null) {
  if (currency === "UF" && ufValue) {
    return roundToTwo(totals.total * ufValue);
  }

  return totals.total;
}

function deriveBillingStatus(args: {
  origin: BillingPersistPayload["origin"];
  externalStatusMode: BillingPersistPayload["externalStatusMode"];
  mode: BillingDocumentMode;
  outstandingAmount: number;
}): BillingRecordStatus {
  if (args.origin === "externo") {
    if (args.externalStatusMode === "pending_payment") return "pending_payment";
    if (args.externalStatusMode === "paid") return "paid";
    return args.outstandingAmount > 500 ? "pending_payment" : "paid";
  }

  if (args.mode === "draft") {
    return "draft";
  }

  return "issued";
}

type PdfColor = [number, number, number];
type PdfAnnotation = { x: number; y: number; width: number; height: number; url: string };

function colorToPdf(color: PdfColor) {
  return color.map((channel) => (channel / 255).toFixed(3)).join(" ");
}

function measureTextWidth(text: string, size: number, font: "F1" | "F2" | "F3" = "F1") {
  const factor = font === "F2" ? 0.56 : 0.51;
  return text.length * size * factor;
}

function wrapPdfText(text: string, width: number, size: number, font: "F1" | "F2" | "F3" = "F1") {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidth(candidate, size, font) <= width) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    lines.push(word);
  }

  if (current) lines.push(current);
  return lines;
}

function measureWrappedTextHeight(text: string, width: number, size: number, options?: { font?: "F1" | "F2" | "F3"; lineGap?: number }) {
  const font = options?.font ?? "F1";
  const lineGap = options?.lineGap ?? 4;
  const lines = wrapPdfText(text, width, size, font);
  return lines.length * size + Math.max(lines.length - 1, 0) * lineGap;
}

function fitPdfText(text: string, width: number, size: number, options?: { font?: "F1" | "F2" | "F3"; maxLines?: number }) {
  const font = options?.font ?? "F1";
  const maxLines = options?.maxLines ?? 1;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  const lines = wrapPdfText(trimmed, width, size, font);
  if (lines.length <= maxLines) return trimmed;

  const selected = lines.slice(0, maxLines);
  let last = selected[selected.length - 1].trim();

  while (last.length > 1 && measureTextWidth(`${last}...`, size, font) > width) {
    last = last.slice(0, -1).trimEnd();
  }

  selected[selected.length - 1] = `${last}...`;
  return selected.join(" ");
}

function createStampSeed(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function drawElectronicStamp(args: {
  canvas: PdfCanvas;
  x: number;
  top: number;
  width: number;
  height: number;
  seedText: string;
  accentColor: PdfColor;
  textColor: PdfColor;
}) {
  const { canvas, x, top, width, height, seedText, accentColor, textColor } = args;
  const seed = createStampSeed(seedText);
  let cursorX = x;

  while (cursorX < x + width) {
    const noise = (seed + Math.floor((cursorX - x) * 13)) % 11;
    const barWidth = 1 + (noise % 3);
    const barHeight = height - ((noise * 7) % 18);
    const barTop = top + ((noise * 11) % Math.max(8, height - barHeight + 1));
    canvas.fillRect(cursorX, barTop, barWidth, Math.max(8, barHeight), textColor);
    cursorX += barWidth + ((noise % 2) === 0 ? 1 : 0.6);
  }

  const matrixSize = Math.min(46, height - 12);
  const matrixX = x + 8;
  const matrixY = top + 8;
  const cell = matrixSize / 16;

  for (let row = 0; row < 16; row += 1) {
    for (let column = 0; column < 16; column += 1) {
      const bit = ((seed >> ((row + column) % 16)) ^ (row * 31 + column * 17)) & 1;
      if (bit === 0) continue;
      canvas.fillRect(matrixX + column * cell, matrixY + row * cell, cell - 0.5, cell - 0.5, textColor);
    }
  }

  canvas.text("Timbre Electronico SII", x + width / 2 - measureTextWidth("Timbre Electronico SII", 7.5, "F1") / 2, top + height + 16, 7.5, {
    color: accentColor,
  });
}

class PdfCanvas {
  private commands: string[] = [];

  constructor(private readonly pageWidth: number, private readonly pageHeight: number) {}

  private toPdfY(top: number) {
    return this.pageHeight - top;
  }

  fillRect(x: number, top: number, width: number, height: number, color: PdfColor) {
    const y = this.pageHeight - top - height;
    this.commands.push(`${colorToPdf(color)} rg`);
    this.commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  }

  strokeRect(x: number, top: number, width: number, height: number, color: PdfColor, lineWidth = 1) {
    const y = this.pageHeight - top - height;
    this.commands.push(`${lineWidth.toFixed(2)} w`);
    this.commands.push(`${colorToPdf(color)} RG`);
    this.commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  }

  line(x1: number, top1: number, x2: number, top2: number, color: PdfColor, lineWidth = 1) {
    this.commands.push(`${lineWidth.toFixed(2)} w`);
    this.commands.push(`${colorToPdf(color)} RG`);
    this.commands.push(`${x1.toFixed(2)} ${(this.pageHeight - top1).toFixed(2)} m ${x2.toFixed(2)} ${(this.pageHeight - top2).toFixed(2)} l S`);
  }

  text(text: string, x: number, top: number, size: number, options?: { font?: "F1" | "F2" | "F3"; color?: PdfColor }) {
    const font = options?.font ?? "F1";
    const color = options?.color ?? [15, 23, 42];
    this.commands.push("BT");
    this.commands.push(`/${font} ${size} Tf`);
    this.commands.push(`${colorToPdf(color)} rg`);
    this.commands.push(`1 0 0 1 ${x.toFixed(2)} ${(this.toPdfY(top)).toFixed(2)} Tm`);
    this.commands.push(`<${encodePdfTextHex(text)}> Tj`);
    this.commands.push("ET");
  }

  wrappedText(text: string, x: number, top: number, width: number, size: number, options?: { font?: "F1" | "F2" | "F3"; color?: PdfColor; lineGap?: number }) {
    const font = options?.font ?? "F1";
    const color = options?.color ?? [51, 65, 85];
    const lineGap = options?.lineGap ?? 4;
    const lines = wrapPdfText(text, width, size, font);

    lines.forEach((line, index) => {
      this.text(line, x, top + index * (size + lineGap), size, { font, color });
    });

    return lines.length * size + Math.max(lines.length - 1, 0) * lineGap;
  }

  drawImage(name: string, x: number, top: number, width: number, height: number) {
    this.commands.push("q");
    this.commands.push(`${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${(this.pageHeight - top - height).toFixed(2)} cm`);
    this.commands.push(`/${name} Do`);
    this.commands.push("Q");
  }

  content() {
    return this.commands.join("\n");
  }
}

function buildLineTotals(lines: BillingLineInput[]) {
  const normalized = lines.map((line, index) => {
    const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
    const price = Number.isFinite(line.price) && line.price >= 0 ? line.price : 0;
    const taxRate = Number.isFinite(line.taxRate) && line.taxRate >= 0 ? line.taxRate : 0;
    const subtotal = roundToTwo(quantity * price);
    const taxAmount = roundToTwo(subtotal * (taxRate / 100));
    return {
      ...line,
      id: line.id ?? `line-${index + 1}`,
      quantity,
      price,
      taxRate,
      subtotal,
      taxAmount,
      total: roundToTwo(subtotal + taxAmount),
    };
  });

  return {
    lines: normalized,
    totals: normalized.reduce(
      (acc, line) => ({
        net: roundToTwo(acc.net + line.subtotal),
        tax: roundToTwo(acc.tax + line.taxAmount),
        total: roundToTwo(acc.total + line.total),
      }),
      { net: 0, tax: 0, total: 0 }
    ),
  };
}

function mapSchemaError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("does not exist") || lower.includes("could not find") || lower.includes("relation") || lower.includes("column")) {
    return `Faltan tablas o columnas del nuevo modulo Billing. Ejecuta primero la migracion SQL de billing y vuelve a intentar. Detalle: ${message}`;
  }

  return message;
}

function isMissingBillingColumnError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("service_period_start") || lower.includes("service_period_end") || lower.includes("uf_value") || lower.includes("could not find");
}

async function persistBillingRecord(
  supabase: BillingSupabase,
  recordId: string | null,
  primaryPayload: Record<string, unknown>,
  fallbackPayload: Record<string, unknown>
) {
  if (recordId) {
    const primaryResponse = await supabase.from("billing_records").update(primaryPayload).eq("id", recordId);
    if (!primaryResponse.error) return { recordId };
    if (!isMissingBillingColumnError(primaryResponse.error.message)) throw new Error(primaryResponse.error.message);

    const fallbackResponse = await supabase.from("billing_records").update(fallbackPayload).eq("id", recordId);
    if (fallbackResponse.error) throw new Error(fallbackResponse.error.message);
    return { recordId };
  }

  const primaryResponse = await supabase.from("billing_records").insert(primaryPayload).select("id").single();
  if (!primaryResponse.error && primaryResponse.data) {
    return { recordId: primaryResponse.data.id };
  }

  if (!primaryResponse.error || !isMissingBillingColumnError(primaryResponse.error.message)) {
    throw new Error(primaryResponse.error?.message ?? "No fue posible crear la factura.");
  }

  const fallbackResponse = await supabase.from("billing_records").insert(fallbackPayload).select("id").single();
  if (fallbackResponse.error || !fallbackResponse.data) {
    throw new Error(fallbackResponse.error?.message ?? "No fue posible crear la factura.");
  }

  return { recordId: fallbackResponse.data.id };
}

function buildInvoiceXml(args: {
  recordId: string;
  invoiceNumber: string;
  payload: BillingPersistPayload;
  company: BillingCompanyRow | null;
  payerCompany: BillingCompanyRow | null;
  subscription: BillingSubscriptionRow | null;
  lines: Array<ReturnType<typeof buildLineTotals>["lines"][number] & { productName: string }>;
  totals: { net: number; tax: number; total: number };
  invoiceStatus: BillingRecordStatus;
}) {
  const { recordId, invoiceNumber, payload, company, payerCompany, subscription, lines, totals, invoiceStatus } = args;

  return `<?xml version="1.0" encoding="UTF-8"?>
<billingDocument id="${escapeXml(recordId)}">
  <header>
    <number>${escapeXml(invoiceNumber)}</number>
    <status>${escapeXml(invoiceStatus)}</status>
    <documentType>${escapeXml(payload.documentType)}</documentType>
    <currency>${escapeXml(payload.currency)}</currency>
    <invoiceDate>${escapeXml(payload.invoiceDate)}</invoiceDate>
    <dueDate>${escapeXml(payload.dueDate)}</dueDate>
    <servicePeriod>${escapeXml(payload.servicePeriod)}</servicePeriod>
    <dteStatus>${escapeXml(payload.dteStatus)}</dteStatus>
    <paymentCondition>${escapeXml(payload.paymentCondition)}</paymentCondition>
    <reference>${escapeXml(payload.referenceText)}</reference>
    <paymentLink>${escapeXml(payload.paymentLink)}</paymentLink>
  </header>
  <customer>
    <name>${escapeXml(company?.trade_name ?? company?.legal_name ?? "-")}</name>
    <rut>${escapeXml(company?.rut ?? "-")}</rut>
    <clientId>${escapeXml(company?.internal_code ?? "-")}</clientId>
  </customer>
  <payer>
    <name>${escapeXml(payerCompany?.trade_name ?? payerCompany?.legal_name ?? "-")}</name>
    <rut>${escapeXml(payerCompany?.rut ?? "-")}</rut>
  </payer>
  <subscription>
    <code>${escapeXml(subscription?.subscription_code ?? "-")}</code>
  </subscription>
  <lines>
${lines
  .map(
    (line) => `    <line>
      <product>${escapeXml(line.productName)}</product>
      <account>${escapeXml(line.accountCode)}</account>
      <quantity>${line.quantity}</quantity>
      <price>${line.price}</price>
      <taxRate>${line.taxRate}</taxRate>
      <subtotal>${line.subtotal}</subtotal>
    </line>`
  )
  .join("\n")}
  </lines>
  <totals>
    <net>${totals.net}</net>
    <tax>${totals.tax}</tax>
    <total>${totals.total}</total>
  </totals>
</billingDocument>`;
}

function buildPdfBase64(args: {
  invoiceNumber: string;
  payload: BillingPersistPayload;
  company: BillingCompanyRow | null;
  payerCompany: BillingCompanyRow | null;
  subscription: BillingSubscriptionRow | null;
  lines: Array<ReturnType<typeof buildLineTotals>["lines"][number] & { productName: string }>;
  totals: { net: number; tax: number; total: number };
}) {
  const { invoiceNumber, payload, company, lines, totals } = args;
  const ufValue = normalizeUfValue(payload.ufValue);
  if (payload.currency === "UF" && !ufValue) {
    throw new Error("Debes ingresar el valor UF del mes para generar el PDF.");
  }

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 30;
  const blockWidth = pageWidth - margin * 2;
  const logoBytes = readBillingLogoJpeg();

  const black: PdfColor = [17, 17, 17];
  const darkBlue: PdfColor = [35, 83, 137];
  const muted: PdfColor = [90, 90, 90];
  const lightGray: PdfColor = [215, 215, 215];
  const white: PdfColor = [255, 255, 255];
  const invoiceRed: PdfColor = [225, 25, 18];

  const dualTotals = buildDualCurrencyTotals({
    currency: payload.currency,
    totals,
    ufValue: ufValue ?? 1,
  });
  const clientName = company?.trade_name ?? company?.legal_name ?? "-";
  const clientRut = company?.rut ?? "-";
  const clientAddress = [company?.address, [company?.commune, company?.city].filter(Boolean).join(", "), company?.country].filter(Boolean).join(", ") || "-";
  const clientBusinessLine = (company?.industry ?? company?.customer_type ?? "-").toUpperCase();
  const documentTypeLabel = getDocumentTypeLabel(payload.documentType).toUpperCase();
  const paymentTermLabel = buildPaymentConditionLabel(payload.paymentCondition, payload.invoiceDate, payload.dueDate);
  const generatedAt = new Date().toLocaleString("es-CL");
  const servicePeriodLabel = formatPdfServicePeriod(payload.servicePeriod, payload.invoiceDate);
  const rightDateLabel = formatPdfLongDate(payload.invoiceDate);
  const decodedSecondaryReference = decodeSecondaryReference(payload.hesReference);
  const referenceRows = [
    payload.purchaseOrderReference.trim() ? `1 - ORDEN DE COMPRA N° ${payload.purchaseOrderReference.trim()}` : "",
    decodedSecondaryReference ? `2 - ${decodedSecondaryReference.type} N° ${decodedSecondaryReference.value}` : "",
  ].filter(Boolean);
  const detailRows = lines.map((line) => {
    const description = fitPdfText(line.productName?.trim() || "Servicio", 392, 8.2, { maxLines: 1 });
    const secondary = fitPdfText([payload.referenceText.trim(), `Periodo ${servicePeriodLabel}`].filter(Boolean).join(" · "), 392, 6.3, { maxLines: 1 });
    const unitClp = payload.currency === "UF" ? roundToTwo(line.price * (ufValue ?? 1)) : roundToTwo(line.price);
    const amountClp = payload.currency === "UF" ? roundToTwo(line.subtotal * (ufValue ?? 1)) : roundToTwo(line.subtotal);

    return {
      description,
      secondary,
      quantity: line.quantity,
      unitClp,
      amountClp,
    };
  });

  const headerTop = 34;
  const logoX = margin;
  const logoY = headerTop;
  const logoWidth = 132;
  const logoHeight = 43;
  const issuerTextTop = headerTop + (logoBytes ? logoHeight + 8 : 0);
  const taxBoxX = 368;
  const taxBoxWidth = pageWidth - margin - taxBoxX;
  const taxBoxHeight = 76;
  const issuerTextLines = [
    BILLING_PDF_BRANDING.issuerLegalName.toUpperCase(),
    BILLING_PDF_BRANDING.issuerBusinessLine,
    BILLING_PDF_BRANDING.issuerAddress,
  ];
  const issuerTextHeight = issuerTextLines.reduce((sum, line, index) => {
    const lineHeight = measureWrappedTextHeight(line, 312, index === 0 ? 10.2 : 6.8, { font: index === 0 ? "F2" : "F1", lineGap: 1 });
    return sum + lineHeight + (index < issuerTextLines.length - 1 ? 4 : 0);
  }, 0);
  const headerBottom = Math.max(issuerTextTop + issuerTextHeight, headerTop + taxBoxHeight + 10);

  const clientTop = headerBottom + 24;
  const clientLabelX = margin;
  const clientValueX = margin + 88;
  const clientValueWidth = 292;
  const customerRows = [
    ["R.U.T.", clientRut],
    ["Razón social", clientName],
    ["Giro", clientBusinessLine],
    ["Dirección", clientAddress],
    ...(referenceRows.length > 0 ? referenceRows.map((value) => ["Referencia", value] as const) : ([["Referencia", "Sin referencia"]] as const)),
  ];

  let clientBlockBottom = clientTop;
  customerRows.forEach(([, value]) => {
    const height = measureWrappedTextHeight(value, clientValueWidth, 7.2, { lineGap: 1 });
    clientBlockBottom += Math.max(10, height) + 2;
  });
  clientBlockBottom += 22;

  const tableTop = clientBlockBottom;
  const tableColumns = [
    { label: "Item", x: margin, width: 410 },
    { label: "Cant.", x: margin + 410, width: 46 },
    { label: "Valor U", x: margin + 456, width: 60 },
    { label: "Total", x: margin + 516, width: 66 },
  ];
  const headerHeight = 22;
  const tableRows = detailRows.map((line) => {
    const titleHeight = measureWrappedTextHeight(line.description, tableColumns[0].width - 8, 8.2, { font: "F1", lineGap: 1 });
    const secondaryHeight = line.secondary ? measureWrappedTextHeight(line.secondary, tableColumns[0].width - 8, 6.3, { lineGap: 1 }) : 0;
    const rowHeight = Math.max(24, titleHeight + secondaryHeight + 8);
    return {
      ...line,
      rowHeight,
    };
  });
  const tableHeight = headerHeight + tableRows.reduce((sum, row) => sum + row.rowHeight, 0) + 1;
  const tableBottom = tableTop + tableHeight;
  const totalsTop = tableBottom + 30;
  const totalsLabelX = 448;
  const totalsValueX = pageWidth - margin - 18;
  const totalsRows = [
    ["Neto $ :", formatPdfInteger(dualTotals.netClp)],
    ["IVA (19%) $ :", formatPdfInteger(dualTotals.taxClp)],
    ["Total $ :", formatPdfInteger(dualTotals.totalClp)],
  ];
  const totalsRowGap = 15;
  const totalsBlockHeight = totalsRows.length * totalsRowGap + 8;
  const paymentTextTop = totalsTop + totalsBlockHeight + 16;
  const stampTop = Math.max(paymentTextTop + (payload.paymentLink.trim() ? 24 : 0), tableBottom + 12);
  const stampHeight = 92;
  const stampWidth = 184;
  const stampX = margin + 6;
  const stampTextTop = stampTop + stampHeight + 14;
  const paymentLabel = "Pago:";
  const paymentLinkX = margin + measureTextWidth(paymentLabel, 7.1, "F2") + 6;
  const paymentLinkWidth = 270;
  const saleCondition = `Venta crédito: ${paymentTermLabel}`;
  const dueLabel = `Vencimiento: ${formatPdfDate(payload.dueDate)}`;
  const footerLineTop = 744;
  const footerTextTop = 758;
  const canvas = new PdfCanvas(pageWidth, pageHeight);
  const annotations: PdfAnnotation[] = [];

  canvas.fillRect(0, 0, pageWidth, pageHeight, white);

  let issuerCursorY = issuerTextTop;
  issuerTextLines.forEach((line, index) => {
    const font = index === 0 ? "F2" : "F1";
    const size = index === 0 ? 10.4 : 6.8;
    const color = index === 0 ? darkBlue : black;
    const usedHeight = canvas.wrappedText(line, margin, issuerCursorY, 312, size, { font, color, lineGap: 1 });
    issuerCursorY += usedHeight + 4;
  });

  canvas.strokeRect(taxBoxX, headerTop, taxBoxWidth, taxBoxHeight, invoiceRed, 1.1);
  const taxBoxCenterX = taxBoxX + taxBoxWidth / 2;
  const rightMetaCenterX = taxBoxCenterX;
  const rutLabel = `R.U.T.: ${BILLING_PDF_BRANDING.issuerRut}`;
  canvas.text(rutLabel, taxBoxCenterX - measureTextWidth(rutLabel, 10.6, "F2") / 2, headerTop + 18, 10.6, { font: "F2", color: invoiceRed });
  canvas.text(documentTypeLabel, taxBoxCenterX - measureTextWidth(documentTypeLabel, 8.8, "F2") / 2, headerTop + 35, 8.8, { font: "F2", color: invoiceRed });
  const folioLabel = `N° ${invoiceNumber || "-"}`;
  canvas.text(folioLabel, taxBoxCenterX - measureTextWidth(folioLabel, 9.8, "F2") / 2, headerTop + 52, 9.8, { font: "F2", color: invoiceRed });
  canvas.text(BILLING_PDF_BRANDING.siiOfficeLabel.toUpperCase().replace("S.I.I.", "S.I.I. -"), taxBoxCenterX - measureTextWidth(BILLING_PDF_BRANDING.siiOfficeLabel.toUpperCase().replace("S.I.I.", "S.I.I. -"), 7.2, "F2") / 2, headerTop + 88, 7.2, {
    font: "F2",
    color: invoiceRed,
  });

  const formattedRightDateLabel = rightDateLabel.charAt(0).toUpperCase() + rightDateLabel.slice(1);
  canvas.text(formattedRightDateLabel, rightMetaCenterX - measureTextWidth(formattedRightDateLabel, 8.1, "F2") / 2, clientTop - 2, 8.1, {
    font: "F2",
    color: black,
  });
  canvas.text(saleCondition, rightMetaCenterX - measureTextWidth(saleCondition, 7.6, "F1") / 2, clientTop + 14, 7.6, { color: black });
  canvas.text(dueLabel, rightMetaCenterX - measureTextWidth(dueLabel, 7.6, "F1") / 2, clientTop + 28, 7.6, { color: black });

  let customerCursorY = clientTop + 22;
  customerRows.forEach(([label, value]) => {
    canvas.text(`${label}`, clientLabelX, customerCursorY, 7.2, { font: "F2", color: black });
    canvas.text(":", clientValueX - 8, customerCursorY, 7.2, { font: "F2", color: black });
    const usedHeight = canvas.wrappedText(value, clientValueX, customerCursorY, clientValueWidth, 7.2, { color: black, lineGap: 1 });
    customerCursorY += Math.max(10, usedHeight) + 2;
  });

  canvas.strokeRect(margin, tableTop, blockWidth, tableHeight, black, 0.8);
  canvas.line(margin, tableTop + headerHeight, margin + blockWidth, tableTop + headerHeight, black, 0.7);
  canvas.line(tableColumns[1].x, tableTop, tableColumns[1].x, tableTop + tableHeight, black, 0.6);
  canvas.line(tableColumns[2].x, tableTop, tableColumns[2].x, tableTop + tableHeight, black, 0.6);
  canvas.line(tableColumns[3].x, tableTop, tableColumns[3].x, tableTop + tableHeight, black, 0.6);
  tableColumns.forEach((column) => {
    const alignCenter = column.label === "Cant.";
    const alignRight = false;
    const textX = alignRight
      ? column.x + column.width - 6 - measureTextWidth(column.label, 7.5, "F2")
      : alignCenter
        ? column.x + column.width / 2 - measureTextWidth(column.label, 7.5, "F2") / 2
        : column.label === "Valor U" || column.label === "Total"
          ? column.x + column.width / 2 - measureTextWidth(column.label, 7.5, "F2") / 2
          : column.x + 4;
    canvas.text(column.label, textX, tableTop + 14, 7.5, { font: "F2", color: black });
  });

  let rowTop = tableTop + headerHeight;
  tableRows.forEach((line) => {
    const titleTop = rowTop + 10;
    canvas.wrappedText(line.description, tableColumns[0].x + 4, titleTop, tableColumns[0].width - 8, 8.2, {
      color: black,
      lineGap: 1,
    });
    if (line.secondary) {
      canvas.wrappedText(line.secondary, tableColumns[0].x + 4, titleTop + 13, tableColumns[0].width - 8, 6.3, {
        color: muted,
        lineGap: 1,
      });
    }
    const valueTop = rowTop + 12;
    const quantityText = String(line.quantity);
    const quantityX = tableColumns[1].x + (tableColumns[1].width / 2) - measureTextWidth(quantityText, 7.6, "F1") / 2;
    const unitText = formatPdfInteger(line.unitClp);
    const unitX = tableColumns[2].x + tableColumns[2].width / 2 - measureTextWidth(unitText, 7.6, "F1") / 2;
    const amountText = formatPdfInteger(line.amountClp);
    const amountX = tableColumns[3].x + tableColumns[3].width / 2 - measureTextWidth(amountText, 7.6, "F1") / 2;
    canvas.text(quantityText, quantityX, valueTop, 7.6, { color: black });
    canvas.text(unitText, unitX, valueTop, 7.6, { color: black });
    canvas.text(amountText, amountX, valueTop, 7.6, { color: black });
    rowTop += line.rowHeight;
  });

  totalsRows.forEach(([label, value], index) => {
    const rowY = totalsTop + index * totalsRowGap;
    canvas.text(label, totalsLabelX - measureTextWidth(label, 8.8, "F2"), rowY, 8.8, { font: "F2", color: black });
    canvas.text(value, totalsValueX - measureTextWidth(value, 8.8, "F2"), rowY, 8.8, { font: "F2", color: black });
  });

  if (payload.origin === "tazki") {
    drawElectronicStamp({
      canvas,
      x: stampX,
      top: stampTop,
      width: stampWidth,
      height: stampHeight,
      seedText: `${invoiceNumber}|${clientRut}|${payload.invoiceDate}|${dualTotals.totalClp}`,
      accentColor: black,
      textColor: black,
    });
    canvas.text("Timbre Electronico SII", stampX + stampWidth / 2 - measureTextWidth("Timbre Electronico SII", 7.6, "F2") / 2, stampTextTop, 7.6, {
      font: "F2",
      color: black,
    });
    canvas.text("Resolución 80 de 2014", stampX + stampWidth / 2 - measureTextWidth("Resolución 80 de 2014", 7.2, "F2") / 2, stampTextTop + 12, 7.2, {
      font: "F2",
      color: black,
    });
    canvas.text("Verifique documento: www.sii.cl", stampX + stampWidth / 2 - measureTextWidth("Verifique documento: www.sii.cl", 7.2, "F2") / 2, stampTextTop + 24, 7.2, {
      font: "F2",
      color: black,
    });
  }

  if (payload.paymentLink.trim()) {
    canvas.text(paymentLabel, margin, paymentTextTop, 7.1, { font: "F2", color: muted });
    canvas.wrappedText(payload.paymentLink.trim(), paymentLinkX, paymentTextTop, paymentLinkWidth, 7.1, { color: muted, lineGap: 2 });
    annotations.push({
      x: paymentLinkX,
      y: pageHeight - (paymentTextTop + 6),
      width: Math.min(measureTextWidth(payload.paymentLink.trim(), 7.1, "F1"), paymentLinkWidth),
      height: 10,
      url: payload.paymentLink.trim(),
    });
  }
  canvas.line(margin, footerLineTop, pageWidth - margin, footerLineTop, black, 0.8);
  canvas.text("Documento generado desde Octopus by Tazki", margin + 10, footerTextTop, 6.4, { font: "F2", color: black });
  const footerRight = "www.tazki.cl";
  canvas.text(footerRight, pageWidth - margin - measureTextWidth(footerRight, 6.4, "F2"), footerTextTop, 6.4, { font: "F2", color: black });
  const generatedLabel = `Generado ${generatedAt}`;
  canvas.text(generatedLabel, pageWidth - margin - measureTextWidth(generatedLabel, 6.1, "F1"), pageHeight - 14, 6.1, { color: lightGray });

  if (logoBytes) {
    canvas.drawImage("Im1", logoX, logoY, logoWidth, logoHeight);
  } else {
    canvas.text(BILLING_PDF_BRANDING.brandLabel.toUpperCase(), logoX, logoY + 18, 12, { font: "F2", color: darkBlue });
  }

  const content = canvas.content();
  const hasImage = Boolean(logoBytes);
  const imageObjectNumber = hasImage ? 8 : null;
  const annotationStartNumber = hasImage ? 9 : 8;
  const annotationRefs = annotations.map((_, index) => `${annotationStartNumber + index} 0 R`).join(" ");
  const pageObject = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >>${hasImage ? ` /XObject << /Im1 ${imageObjectNumber} 0 R >>` : ""} >> /Contents 7 0 R${annotationRefs ? ` /Annots [${annotationRefs}]` : ""} >>`;

  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "utf8"),
    Buffer.from(pageObject, "utf8"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "utf8"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "utf8"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>", "utf8"),
    Buffer.from(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`, "utf8"),
  ];

  if (logoBytes) {
    objects.push(
      Buffer.concat([
        Buffer.from("<< /Type /XObject /Subtype /Image /Width 600 /Height 208 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ", "utf8"),
        Buffer.from(String(logoBytes.length), "utf8"),
        Buffer.from(" >>\nstream\n", "utf8"),
        logoBytes,
        Buffer.from("\nendstream", "utf8"),
      ])
    );
  }

  annotations.forEach((annotation) => {
    objects.push(
      Buffer.from(
        `<< /Type /Annot /Subtype /Link /Rect [${annotation.x.toFixed(2)} ${annotation.y.toFixed(2)} ${(annotation.x + annotation.width).toFixed(2)} ${(annotation.y + annotation.height).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfUrl(annotation.url)}) >> >>`,
        "utf8"
      )
    );
  });

  const pdfChunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    const currentLength = pdfChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    offsets.push(currentLength);
    pdfChunks.push(Buffer.from(`${index + 1} 0 obj\n`, "utf8"));
    pdfChunks.push(object);
    pdfChunks.push(Buffer.from("\nendobj\n", "utf8"));
  });

  const xrefStart = pdfChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pdfChunks.push(Buffer.from(xref, "utf8"));

  return Buffer.concat(pdfChunks).toString("base64");
}

async function getBillingActor(supabase: BillingSupabase): Promise<{ ok: true; actor: BillingActor } | { ok: false; error: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false, error: userError.message };
  }

  if (!user) {
    return { ok: false, error: "No autenticado" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "basic";
  if (role !== "admin" && role !== "editor") {
    return { ok: false, error: "Sin permisos para gestionar facturacion" };
  }

  return {
    ok: true,
    actor: {
      userName: profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Sistema",
      userEmail: profile?.email ?? user.email ?? "sistema@tazki.cl",
    },
  };
}

async function fetchInvoiceDependencies(supabase: BillingSupabase, payload: BillingPersistPayload) {
  const productIds = payload.lines.map((line) => line.productId).filter(Boolean);
  const productsPromise =
    productIds.length > 0
      ? supabase.from("products").select("id, code, name").in("id", productIds)
      : Promise.resolve({ data: [], error: null });

  const [productsResponse, companiesResponse, subscriptionResponse] = await Promise.all([
    productsPromise,
    supabase
      .from("companies")
      .select("id, trade_name, legal_name, rut, internal_code, address, commune, city, country, company_email, billing_email, dte_email, industry, customer_type")
      .in("id", [payload.companyId, payload.payerCompanyId]),
    supabase
      .from("subscriptions")
      .select("id, subscription_code")
      .eq("id", payload.subscriptionId)
      .maybeSingle(),
  ]);

  if (productsResponse.error) {
    return { ok: false as const, error: productsResponse.error.message };
  }
  if (companiesResponse.error) {
    return { ok: false as const, error: companiesResponse.error.message };
  }
  if (subscriptionResponse.error) {
    return { ok: false as const, error: subscriptionResponse.error.message };
  }

  const productsById = new Map((productsResponse.data ?? []).map((product) => [product.id, product as BillingProductRow]));
  const companiesById = new Map((companiesResponse.data ?? []).map((company) => [company.id, company as BillingCompanyRow]));

  return {
    ok: true as const,
    productsById,
    company: companiesById.get(payload.companyId) ?? null,
    payerCompany: companiesById.get(payload.payerCompanyId) ?? companiesById.get(payload.companyId) ?? null,
    subscription: (subscriptionResponse.data as BillingSubscriptionRow | null) ?? null,
  };
}

async function resolveBillingCurrencyContext(
  supabase: BillingSupabase,
  payload: BillingPersistPayload
): Promise<
  | {
      ok: true;
      currencyRateId: string | null;
      ufValue: number;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const invoicePeriod = getPeriodFromInvoiceDate(payload.invoiceDate);
  if (!invoicePeriod) {
    return { ok: false, error: "La fecha de factura no tiene un periodo valido para resolver la UF." };
  }

  if (payload.billingRecordId) {
    const { data: existingRecord } = await supabase
      .from("billing_records")
      .select("expected_invoice_date, actual_invoice_date, currency, currency_rate_id, uf_value_used, uf_value")
      .eq("id", payload.billingRecordId)
      .maybeSingle<{
        expected_invoice_date: string | null;
        actual_invoice_date: string | null;
        currency: "UF" | "CLP" | null;
        currency_rate_id: string | null;
        uf_value_used: number | string | null;
        uf_value: number | string | null;
      }>();

    const existingUfValue = normalizeUfValue(toNullableNumber(existingRecord?.uf_value_used ?? existingRecord?.uf_value));
    const existingInvoiceDate = existingRecord?.actual_invoice_date ?? existingRecord?.expected_invoice_date ?? null;
    const sameCurrency = (existingRecord?.currency ?? payload.currency) === payload.currency;

    if (existingUfValue && sameCurrency && hasSamePeriod(existingInvoiceDate, payload.invoiceDate)) {
      return {
        ok: true,
        currencyRateId: existingRecord?.currency_rate_id ?? null,
        ufValue: existingUfValue,
      };
    }
  }

  const { data: rateRow, error: rateError } = await supabase
    .from("currency_rates")
    .select("id, currency_code, period_year, period_month, reference_date, rate_value, source_type, is_active")
    .eq("currency_code", "UF")
    .eq("period_year", invoicePeriod.year)
    .eq("period_month", invoicePeriod.month)
    .maybeSingle<CurrencyRateRow>();

  if (rateError) {
    return { ok: false, error: rateError.message };
  }

  if (!rateRow || !rateRow.is_active) {
    return {
      ok: false,
      error: `Debes configurar la UF de ${invoicePeriod.month}/${invoicePeriod.year} en Configuracion > Monedas antes de guardar o emitir la factura.`,
    };
  }

  const ufValue = normalizeUfValue(toNullableNumber(rateRow.rate_value));
  if (!ufValue) {
    return { ok: false, error: "El valor UF configurado para el periodo no es valido." };
  }

  return {
    ok: true,
    currencyRateId: rateRow.id,
    ufValue,
  };
}

async function replaceChildRows(
  supabase: BillingSupabase,
  table: string,
  recordId: string,
  rows: Record<string, unknown>[]
) {
  const { error: deleteError } = await supabase.from(table).delete().eq("billing_record_id", recordId);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw new Error(insertError.message);
}

async function upsertOutput(
  supabase: BillingSupabase,
  recordId: string,
  kind: BillingOutputKind,
  filename: string,
  mimeType: string,
  contentText: string,
  actor: BillingActor
) {
  const { error } = await supabase.from("billing_record_outputs").upsert(
    {
      billing_record_id: recordId,
      output_type: kind,
      file_name: filename,
      mime_type: mimeType,
      content_text: contentText,
      generated_at: new Date().toISOString(),
      generated_by_name: actor.userName,
      generated_by_email: actor.userEmail,
    },
    { onConflict: "billing_record_id,output_type" }
  );

  if (error) throw new Error(error.message);
}

async function loadPersistPayloadFromRecord(supabase: BillingSupabase, recordId: string) {
  const { data: record, error } = await supabase
    .from("billing_records")
    .select(
      `
        id,
        origin,
        company_id,
        payer_company_id,
        subscription_id,
        currency,
        document_type,
        invoice_number,
        expected_invoice_date,
        actual_invoice_date,
        due_date,
        dte_status,
        payment_condition,
        reference_text,
        payment_link,
        service_period,
        purchase_order_reference,
        hes_reference,
        executive_id,
        cost_center,
        hubspot_id,
        dte_email,
        notes,
        status,
        source_system,
        currency_rate_id,
        uf_value,
        uf_value_used
      `
    )
    .eq("id", recordId)
    .maybeSingle<StoredBillingRecordRow>();

  if (error || !record) {
    throw new Error("No se encontro la factura para regenerar sus documentos.");
  }

  if (!record.company_id || !record.subscription_id) {
    throw new Error("La factura no tiene cliente o suscripcion suficiente para regenerar documentos.");
  }

  const { data: lineRows, error: linesError } = await supabase
    .from("billing_record_lines")
    .select("id, product_id, account_code, quantity, unit_price, tax_rate")
    .eq("billing_record_id", recordId)
    .order("sort_order", { ascending: true });

  if (linesError) {
    throw new Error(linesError.message);
  }

  let noteRows: StoredBillingNoteRow[] = [];
  try {
    const { data } = await supabase
      .from("billing_record_notes")
      .select("id, body, author_name, created_at")
      .eq("billing_record_id", recordId)
      .order("sort_order", { ascending: true });
    noteRows = (data ?? []) as StoredBillingNoteRow[];
  } catch {
    noteRows = [];
  }

  const invoiceDate = record.actual_invoice_date ?? record.expected_invoice_date ?? new Date().toISOString().slice(0, 10);
  const origin = normalizeStoredOrigin(record.origin);
  const payload: BillingPersistPayload = {
    billingRecordId: record.id,
    origin,
    externalStatusMode: record.status === "paid" ? "paid" : record.status === "pending_payment" ? "pending_payment" : "automatic",
    sourceSystem: normalizeSourceSystem(record.source_system, origin),
    ufValue: normalizeUfValue(toNullableNumber(record.uf_value_used ?? record.uf_value)),
    companyId: record.company_id,
    payerCompanyId: record.payer_company_id ?? record.company_id,
    subscriptionId: record.subscription_id,
    currency: record.currency === "CLP" ? "CLP" : "UF",
    documentType: record.document_type?.trim() || "33",
    documentNumber: record.invoice_number?.trim() || "",
    invoiceDate,
    dueDate: record.due_date ?? invoiceDate,
    dteStatus: record.dte_status?.trim() || (origin === "externo" ? "external" : "pending"),
    paymentCondition: record.payment_condition?.trim() || "",
    referenceText: record.reference_text?.trim() || "",
    paymentLink: record.payment_link?.trim() || "",
    servicePeriod: record.service_period?.trim() || invoiceDate.slice(0, 7),
    purchaseOrderReference: record.purchase_order_reference?.trim() || "",
    secondaryReferenceType: decodeSecondaryReference(record.hes_reference)?.type ?? "HES",
    hesReference: record.hes_reference?.trim() || "",
    executiveId: record.executive_id?.trim() || "",
    costCenter: record.cost_center?.trim() || "",
    hubspotId: record.hubspot_id?.trim() || "",
    dteEmail: record.dte_email?.trim() || "",
    observations: record.notes?.trim() || "",
    lines: ((lineRows ?? []) as StoredBillingLineRow[]).map((line) => ({
      id: line.id,
      productId: line.product_id ?? "",
      accountCode: line.account_code ?? "",
      quantity: toNullableNumber(line.quantity) ?? 0,
      price: toNullableNumber(line.unit_price) ?? 0,
      taxRate: toNullableNumber(line.tax_rate) ?? 0,
    })),
    notes: noteRows
      .filter((note) => note.body?.trim())
      .map((note) => ({
        id: note.id,
        body: note.body!.trim(),
        author: note.author_name?.trim() || undefined,
        createdAt: note.created_at ?? undefined,
      })),
  };

  const mode: BillingDocumentMode = origin === "externo" || record.status === "draft" ? "draft" : "issued";

  return { payload, mode };
}

export async function persistBillingDocument(
  payload: BillingPersistPayload,
  options: {
    mode: BillingDocumentMode;
    generateOutput?: BillingOutputKind | null;
    supabase?: BillingSupabase;
  }
): Promise<BillingPersistResult> {
  if (payload.origin === "externo" && options.mode === "issued") {
    return { ok: false, error: "No puedes emitir o confirmar una factura externa. Debes cargarla manualmente." };
  }
  if (payload.origin === "externo" && options.generateOutput === "xml") {
    return { ok: false, error: "Las facturas externas no requieren XML ni flujo SII." };
  }
  if (!payload.companyId) return { ok: false, error: "Debes seleccionar un cliente." };
  if (!payload.payerCompanyId) return { ok: false, error: "Debes seleccionar un cliente pagador." };
  if (!payload.subscriptionId) return { ok: false, error: "Debes seleccionar una suscripcion activa para poder facturar." };
  if (!payload.invoiceDate) return { ok: false, error: "La fecha de factura es obligatoria." };
  if (!payload.dueDate) return { ok: false, error: "La fecha de vencimiento es obligatoria." };
  if (payload.lines.length === 0) return { ok: false, error: "Debes agregar al menos una linea de detalle." };

  const supabase = options.supabase ?? (await createServerSupabaseClient());
  const actorResult = await getBillingActor(supabase);
  if (!actorResult.ok) return { ok: false, error: actorResult.error };
  const { actor } = actorResult;

  const dependencyResult = await fetchInvoiceDependencies(supabase, payload);
  if (!dependencyResult.ok) {
    return { ok: false, error: dependencyResult.error };
  }
  const currencyContext = await resolveBillingCurrencyContext(supabase, payload);
  if (!currencyContext.ok) {
    return { ok: false, error: currencyContext.error };
  }

  const { lines, totals } = buildLineTotals(payload.lines);
  const servicePeriod = normalizeServicePeriod(payload.servicePeriod, payload.invoiceDate);
  const servicePeriodRange = buildServicePeriodRange(servicePeriod, payload.invoiceDate);
  const dteStatus = normalizeDteStatus(payload.dteStatus, payload.origin);
  const normalizedUfValue = currencyContext.ufValue;
  const dualTotals = buildDualCurrencyTotals({
    currency: payload.currency,
    totals,
    ufValue: normalizedUfValue,
  });
  const outstandingAmount = deriveOutstandingAmount(payload.currency, totals, normalizedUfValue);
  const invoiceStatus = deriveBillingStatus({
    origin: payload.origin,
    externalStatusMode: payload.externalStatusMode,
    mode: options.mode,
    outstandingAmount,
  });
  const persistedOutstandingAmount = invoiceStatus === "paid" || invoiceStatus === "cancelled" ? 0 : outstandingAmount;
  const isIssued = invoiceStatus !== "draft";
  const issuedDate = isIssued ? payload.invoiceDate : null;
  const invoicePrefix = payload.origin === "externo" ? "EXT" : isIssued ? "FAC" : "BOR";
  const invoiceNumber = payload.documentNumber.trim() || `${invoicePrefix}-${servicePeriod.replaceAll("-", "")}-${payload.subscriptionId.slice(0, 4).toUpperCase()}`;
  const billingRecordPayload = {
    origin: payload.origin,
    company_id: payload.companyId,
    payer_company_id: payload.payerCompanyId,
    subscription_id: payload.subscriptionId,
    source_system: payload.sourceSystem ?? (payload.origin === "externo" ? "external_upload" : "octopus_ui"),
    currency_rate_id: currencyContext.currencyRateId,
    service_period: servicePeriod,
    service_period_start: servicePeriodRange.start,
    service_period_end: servicePeriodRange.end,
    expected_invoice_date: payload.invoiceDate,
    actual_invoice_date: issuedDate,
    due_date: payload.dueDate,
    amount: dualTotals.totalClp,
    subtotal_amount: dualTotals.netClp,
    tax_amount: dualTotals.taxClp,
    total_amount: dualTotals.totalClp,
    net_clp: dualTotals.netClp,
    tax_clp: dualTotals.taxClp,
    total_clp: dualTotals.totalClp,
    total_uf: dualTotals.totalUf,
    subtotal_uf: dualTotals.netUf,
    tax_uf: dualTotals.taxUf,
    uf_value: normalizedUfValue,
    uf_value_used: normalizedUfValue,
    outstanding_amount: persistedOutstandingAmount,
    currency: payload.currency,
    document_type: payload.documentType,
    invoice_number: invoiceNumber,
    dte_status: dteStatus,
    payment_condition: payload.paymentCondition,
    reference_text: payload.referenceText || null,
    payment_link: payload.paymentLink || null,
    purchase_order_reference: payload.purchaseOrderReference || null,
    hes_reference: payload.hesReference || null,
    executive_id: payload.executiveId || null,
    cost_center: payload.costCenter || null,
    hubspot_id: payload.hubspotId || null,
    dte_email: payload.dteEmail || null,
    notes: payload.observations || null,
    status: invoiceStatus,
    blocked_by_oc: false,
    blocked_by_hes: false,
    integration_status: payload.origin === "externo" ? "manual" : options.generateOutput ? "generated" : "pending",
    xml_generated_at: payload.origin === "externo" ? null : options.generateOutput === "xml" ? new Date().toISOString() : null,
    pdf_generated_at: options.generateOutput === "pdf" ? new Date().toISOString() : null,
  };
  const legacyBillingRecordPayload = {
    company_id: billingRecordPayload.company_id,
    payer_company_id: billingRecordPayload.payer_company_id,
    subscription_id: billingRecordPayload.subscription_id,
    origin: billingRecordPayload.origin,
    currency: billingRecordPayload.currency,
    document_type: billingRecordPayload.document_type,
    invoice_number: billingRecordPayload.invoice_number,
    expected_invoice_date: billingRecordPayload.expected_invoice_date,
    actual_invoice_date: billingRecordPayload.actual_invoice_date,
    due_date: billingRecordPayload.due_date,
    dte_status: billingRecordPayload.dte_status,
    payment_condition: billingRecordPayload.payment_condition,
    reference_text: billingRecordPayload.reference_text,
    payment_link: billingRecordPayload.payment_link,
    purchase_order_reference: billingRecordPayload.purchase_order_reference,
    hes_reference: billingRecordPayload.hes_reference,
    executive_id: billingRecordPayload.executive_id,
    cost_center: billingRecordPayload.cost_center,
    hubspot_id: billingRecordPayload.hubspot_id,
    dte_email: billingRecordPayload.dte_email,
    notes: billingRecordPayload.notes,
    status: billingRecordPayload.status,
    blocked_by_oc: billingRecordPayload.blocked_by_oc,
    blocked_by_hes: billingRecordPayload.blocked_by_hes,
    integration_status: billingRecordPayload.integration_status,
    xml_generated_at: billingRecordPayload.xml_generated_at,
    pdf_generated_at: billingRecordPayload.pdf_generated_at,
  };

  try {
    let recordId = payload.billingRecordId ?? null;
    const persistResult = await persistBillingRecord(supabase, recordId, billingRecordPayload, legacyBillingRecordPayload);
    recordId = persistResult.recordId;

    const resolvedRecordId = recordId!;
    const lineRows = lines.map((line, index) => ({
      billing_record_id: resolvedRecordId,
      product_id: line.productId || null,
      product_name:
        dependencyResult.productsById.get(line.productId)?.name ||
        dependencyResult.productsById.get(line.productId)?.code ||
        "Producto manual",
      account_code: line.accountCode || null,
      quantity: line.quantity,
      unit_price: line.price,
      tax_rate: line.taxRate,
      subtotal: line.subtotal,
      total: line.total,
      sort_order: index,
    }));

    await replaceChildRows(supabase, "billing_record_lines", resolvedRecordId, lineRows);

    const noteRows = payload.notes
      .filter((note) => note.body.trim().length > 0)
      .map((note, index) => ({
        billing_record_id: resolvedRecordId,
        body: note.body.trim(),
        author_name: note.author?.trim() || actor.userName,
        author_email: actor.userEmail,
        created_at: isoDateTime(note.createdAt),
        sort_order: index,
      }));

    await replaceChildRows(supabase, "billing_record_notes", resolvedRecordId, noteRows);

    const logRows = [
      {
        billing_record_id: resolvedRecordId,
        action_type:
          payload.origin === "externo"
            ? "external_invoice_loaded"
            : options.generateOutput
              ? `${options.generateOutput}_generated`
              : isIssued
                ? "invoice_issued"
                : "invoice_saved",
        description: options.generateOutput
          ? `Se genero ${options.generateOutput.toUpperCase()} del documento.`
          : payload.origin === "externo"
            ? "Factura externa cargada manualmente."
            : isIssued
            ? "Factura emitida / confirmada."
            : "Borrador guardado.",
        actor_name: actor.userName,
        actor_email: actor.userEmail,
      },
    ];

    const { error: logError } = await supabase.from("billing_record_logs").insert(logRows);
    if (logError) throw new Error(logError.message);

    if (options.generateOutput) {
      const enrichedLines = lineRows.map((line, index) => ({
        ...lines[index],
        productName: line.product_name as string,
      }));

      if (options.generateOutput === "xml" && payload.origin === "tazki") {
        const xml = buildInvoiceXml({
          recordId: resolvedRecordId,
          invoiceNumber,
          payload: { ...payload, servicePeriod, dteStatus },
          company: dependencyResult.company,
          payerCompany: dependencyResult.payerCompany,
          subscription: dependencyResult.subscription,
          lines: enrichedLines,
          totals,
          invoiceStatus,
        });

        await upsertOutput(
          supabase,
          resolvedRecordId,
          "xml",
          `${slugify(invoiceNumber || resolvedRecordId)}.xml`,
          "application/xml; charset=utf-8",
          xml,
          actor
        );
      }

      if (options.generateOutput === "pdf") {
        const pdfBase64 = buildPdfBase64({
          invoiceNumber,
          payload: { ...payload, servicePeriod, dteStatus },
          company: dependencyResult.company,
          payerCompany: dependencyResult.payerCompany,
          subscription: dependencyResult.subscription,
          lines: enrichedLines,
          totals,
        });

        await upsertOutput(
          supabase,
          resolvedRecordId,
          "pdf",
          `${slugify(invoiceNumber || resolvedRecordId)}.pdf`,
          "application/pdf",
          pdfBase64,
          actor
        );
      }
    }

    return {
      ok: true,
      recordId: resolvedRecordId,
      invoiceStatus,
      message: options.generateOutput
        ? `${options.generateOutput.toUpperCase()} generado correctamente.`
        : payload.origin === "externo"
          ? "Factura externa cargada correctamente."
          : isIssued
          ? "Factura emitida correctamente."
          : "Borrador guardado correctamente.",
      downloadPath: options.generateOutput ? `/billing/${resolvedRecordId}/outputs/${options.generateOutput}` : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible guardar la factura.";
    return { ok: false, error: mapSchemaError(message) };
  }
}

export async function createServerBillingClient() {
  return createServerSupabaseClient();
}

export async function deleteImportedBillingRecord(recordId: string) {
  const supabase = await createServerSupabaseClient();
  const actorResult = await getBillingActor(supabase);
  if (!actorResult.ok) {
    return { ok: false as const, error: actorResult.error };
  }

  const { data: record, error } = await supabase
    .from("billing_records")
    .select("id, source_system, origin, invoice_number")
    .eq("id", recordId)
    .maybeSingle<{ id: string; source_system: string | null; origin: string | null; invoice_number: string | null }>();

  if (error || !record) {
    return { ok: false as const, error: "No encontramos la factura a eliminar." };
  }

  const { error: deleteError } = await supabase.from("billing_records").delete().eq("id", recordId);
  if (deleteError) {
    return { ok: false as const, error: deleteError.message };
  }

  revalidatePath("/billing");
  revalidatePath(`/billing/${recordId}`);

  return {
    ok: true as const,
    message: `Factura ${record.invoice_number?.trim() || recordId.slice(0, 8)} eliminada.`,
  };
}

export async function emitStoredBillingDocument(recordId: string) {
  const supabase = await createServerSupabaseClient();
  const { payload } = await loadPersistPayloadFromRecord(supabase, recordId);

  if (payload.origin === "externo") {
    return { ok: false, error: "La factura externa no se emite desde Tazki." } satisfies BillingPersistResult;
  }

  return persistBillingDocument(payload, { mode: "issued", supabase });
}

export async function generateStoredBillingOutput(recordId: string, kind: BillingOutputKind) {
  const supabase = await createServerSupabaseClient();
  const { payload, mode } = await loadPersistPayloadFromRecord(supabase, recordId);
  return persistBillingDocument(payload, { mode, generateOutput: kind, supabase });
}
