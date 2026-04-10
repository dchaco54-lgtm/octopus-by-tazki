const templateHeaders = [
  "trade_name",
  "legal_name",
  "rut",
  "address",
  "commune",
  "city",
  "country",
  "phone",
  "company_email",
  "dte_email",
  "billing_email",
  "industry",
  "status",
  "customer_type",
  "taxpayer_type",
  "company_category",
  "currency",
  "billing_model",
  "billing_document_requirement",
  "oc_usage_type",
  "is_recurring_billing",
];

const exampleRow = [
  "Tazki Servicios",
  "Tazki Servicios SpA",
  "76.111.111-1",
  "Apoquindo 3000",
  "Las Condes",
  "Santiago",
  "Chile",
  "+56 2 1234 5678",
  "contacto@tazki.cl",
  "dte@tazki.cl, cobranzas@tazki.cl",
  "facturacion@tazki.cl",
  "Servicios TI",
  "active",
  "Empresa",
  "Primera Categoria",
  "Enterprise",
  "CLP",
  "recurring_with_oc_validation",
  "MIGO",
  "annual_oc",
  "true",
];

function toCsv(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
}

export async function GET() {
  const csv = [toCsv(templateHeaders), toCsv(exampleRow)].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clientes-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
