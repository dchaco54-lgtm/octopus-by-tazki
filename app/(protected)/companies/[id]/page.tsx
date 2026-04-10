import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { getCompanyDetail } from "@/services/companies-service";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;
  const { company, contacts, subscriptions } = await getCompanyDetail(id);

  if (!company) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.trade_name}</h1>
          <p className="mt-1 text-[var(--tazki-slate-500)]">{company.legal_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={company.status} />
          <Link href={`/companies/${id}/edit`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
            Editar empresa
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--tazki-slate-700)]">
            <p><span className="font-semibold">RUT:</span> {company.rut}</p>
            <p><span className="font-semibold">Billing email:</span> {company.billing_email}</p>
            <p><span className="font-semibold">Admin email:</span> {company.admin_email}</p>
            <p><span className="font-semibold">Telefono:</span> {company.phone || "-"}</p>
            <p><span className="font-semibold">Direccion:</span> {company.address || "-"}</p>
            <p><span className="font-semibold">Comuna/Ciudad:</span> {company.commune || "-"} / {company.city || "-"}</p>
            <p><span className="font-semibold">Pais:</span> {company.country}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Representacion legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--tazki-slate-700)]">
            <p><span className="font-semibold">Representante:</span> {company.legal_representative_name || "-"}</p>
            <p><span className="font-semibold">RUT representante:</span> {company.legal_representative_rut || "-"}</p>
            <p><span className="font-semibold">Notas:</span> {company.notes || "Sin notas"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Contactos</h2>
        <DataTable
          rows={contacts}
          columns={[
            {
              key: "name",
              header: "Nombre",
              render: (contact) => `${contact.first_name} ${contact.last_name}`,
            },
            { key: "email", header: "Email", render: (contact) => contact.email },
            { key: "role", header: "Rol", render: (contact) => contact.role || "-" },
            {
              key: "primary",
              header: "Primario",
              render: (contact) => (contact.is_primary ? "Si" : "No"),
            },
            {
              key: "active",
              header: "Activo",
              render: (contact) => (contact.is_active ? "Si" : "No"),
            },
          ]}
          emptyMessage="Este cliente aun no tiene contactos registrados."
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Suscripciones</h2>
        <DataTable
          rows={subscriptions}
          columns={[
            {
              key: "subscription_code",
              header: "Suscripcion",
              render: (subscription) => subscription.subscription_code ?? subscription.id,
            },
            { key: "recurrence", header: "Periodo", render: (subscription) => subscription.recurrence ?? "-" },
            {
              key: "total_mrr_uf",
              header: "MRR",
              render: (subscription) =>
                `${Number(subscription.total_mrr_uf ?? 0).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF`,
            },
            {
              key: "next_billing_date",
              header: "Proxima facturacion",
              render: (subscription) =>
                subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString("es-CL") : "-",
            },
            {
              key: "status",
              header: "Estado",
              render: (subscription) => <StatusBadge status={subscription.status} />,
            },
          ]}
          emptyMessage="Este cliente no tiene suscripciones registradas."
        />
      </div>
    </section>
  );
}
