import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCompanies } from "@/services/companies-service";

interface CompaniesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const companies = await listCompanies(params);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-[var(--tazki-slate-500)]">Gestion de empresas y datos legales para billing ops.</p>
        </div>
        <Link href="/companies/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva empresa
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nombre o RUT" />
            <select
              name="status"
              defaultValue={params.status ?? "all"}
              className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <Input type="date" name="from" defaultValue={params.from ?? ""} />
            <Input type="date" name="to" defaultValue={params.to ?? ""} />
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        rows={companies}
        columns={[
          {
            key: "trade_name",
            header: "Cliente",
            render: (company) => (
              <div>
                <p className="font-semibold text-[var(--tazki-slate-950)]">{company.trade_name}</p>
                <p className="text-xs text-[var(--tazki-slate-500)]">{company.legal_name}</p>
              </div>
            ),
          },
          { key: "rut", header: "RUT", render: (company) => company.rut },
          { key: "billing_email", header: "Billing Email", render: (company) => company.billing_email },
          { key: "status", header: "Estado", render: (company) => <StatusBadge status={company.status} /> },
          {
            key: "actions",
            header: "Acciones",
            render: (company) => (
              <div className="flex items-center gap-4 text-sm font-medium text-[var(--tazki-blue-700)]">
                <Link href={`/companies/${company.id}`}>Ver</Link>
                <Link href={`/companies/${company.id}/edit`}>Editar</Link>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
