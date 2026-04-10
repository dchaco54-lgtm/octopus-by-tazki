import { ClientsTable } from "@/components/shared/clients-table";
import { ClientsToolbar } from "@/components/shared/clients-toolbar";
import { listClients } from "@/services/clients-service";

interface ClientsPageProps {
  searchParams: Promise<{
    q?: string;
    search_by?: string;
    name?: string;
    company?: string;
    company_id?: string;
    email?: string;
    phone?: string;
    purchase_order?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const clients = await listClients(params);

  const exportParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) exportParams.set(key, value);
  });
  const exportHref = `/clients/export?${exportParams.toString()}`;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        </div>
      </div>

      <ClientsToolbar initialQuery={params.q} initialSearchBy={params.search_by} exportHref={exportHref} />
      <ClientsTable clients={clients} />
    </section>
  );
}
