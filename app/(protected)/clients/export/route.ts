import { NextRequest } from "next/server";
import { listClients } from "@/services/clients-service";

function sanitizeCsvValue(value: string | null | undefined) {
  if (!value) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clients = await listClients({
    name: params.get("name") ?? undefined,
    company: params.get("company") ?? undefined,
    company_id: params.get("company_id") ?? undefined,
    email: params.get("email") ?? undefined,
    phone: params.get("phone") ?? undefined,
    purchase_order: params.get("purchase_order") ?? undefined,
  });

  const header = [
    "Nombre cliente",
    "RUT",
    "Correo",
    "Telefono",
    "Cliente pagador",
    "Moneda",
    "Categoria empresa",
    "Estado",
    "ID empresa",
  ];

  const rows = clients.map((client) => [
    sanitizeCsvValue(client.trade_name || client.legal_name),
    sanitizeCsvValue(client.rut),
    sanitizeCsvValue(client.company_email || client.billing_email),
    sanitizeCsvValue(client.mobile_phone || client.phone),
    sanitizeCsvValue(client.payer_client_rut),
    sanitizeCsvValue(client.currency),
    sanitizeCsvValue(client.company_category),
    sanitizeCsvValue(client.status),
    sanitizeCsvValue(client.internal_code || client.id),
  ]);

  const csv = [header.map(sanitizeCsvValue).join(","), ...rows.map((line) => line.join(","))].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clientes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
