import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { getDashboardMetrics, getPendingBillingRows } from "@/services/dashboard-service";
import Link from "next/link";

function formatCLP(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const [metrics, billingRows] = await Promise.all([getDashboardMetrics(), getPendingBillingRows()]);

  const cards = [
    { label: "Clientes activos", value: metrics.activeClients.toString() },
    { label: "Suscripciones activas", value: metrics.activeSubscriptions.toString() },
    { label: "Suscripciones suspendidas", value: metrics.suspendedSubscriptions.toString() },
    { label: "Facturacion pendiente", value: formatCLP(metrics.pendingBilling) },
    { label: "Facturacion del mes", value: formatCLP(metrics.monthlyBilling) },
    { label: "Oportunidades abiertas", value: metrics.openOpportunities.toString() },
  ];

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-[var(--tazki-slate-500)]">Resumen ejecutivo de Finance Ops, Revenue Ops y Customer.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Detalles</h2>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/mrr" className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tazki-slate-200)] bg-white px-3 text-sm font-semibold text-[var(--tazki-slate-900)] hover:bg-[var(--tazki-slate-50)]">
            MRR
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--tazki-slate-500)]">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Resumen de Billing</h2>
        <DataTable
          rows={billingRows}
          columns={[
            { key: "period", header: "Periodo", render: (row) => row.service_period },
            {
              key: "expected_invoice_date",
              header: "Fecha esperada",
              render: (row) => (row.expected_invoice_date ? new Date(row.expected_invoice_date).toLocaleDateString("es-CL") : "-"),
            },
            {
              key: "amount",
              header: "Monto",
              render: (row) => formatCLP(Number(row.amount ?? 0)),
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
          emptyMessage="No hay registros de billing para mostrar."
        />
      </div>
    </section>
  );
}
