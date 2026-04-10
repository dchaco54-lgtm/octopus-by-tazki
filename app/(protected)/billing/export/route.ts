import { NextResponse } from "next/server";
import { listBillingRecords } from "@/services/billing-service";

function sanitizeCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

export async function GET() {
  const { rows } = await listBillingRecords();

  const header = [
    "numero",
    "cliente",
    "cliente_id",
    "rut",
    "fecha_factura",
    "fecha_vencimiento",
    "total_clp",
    "total_uf",
    "adeudado",
    "estado_factura",
    "estado_pago",
  ].join(",");

  const lines = rows.map((row) =>
    [
      sanitizeCsvValue(row.number),
      sanitizeCsvValue(row.company?.trade_name || row.company?.legal_name),
      sanitizeCsvValue(row.company?.internal_code),
      sanitizeCsvValue(row.company?.rut),
      sanitizeCsvValue(row.invoice_date),
      sanitizeCsvValue(row.due_date),
      sanitizeCsvValue(row.total_clp),
      sanitizeCsvValue(row.total_uf),
      sanitizeCsvValue(row.outstanding_amount),
      sanitizeCsvValue(row.invoice_status),
      sanitizeCsvValue(row.payment_status),
    ].join(",")
  );

  return new NextResponse([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="billing-export.csv"',
    },
  });
}
