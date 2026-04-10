import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCompanyOptions, listContacts } from "@/services/contacts-service";

interface ContactsPageProps {
  searchParams: Promise<{
    q?: string;
    company_id?: string;
    active?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const [contacts, companies] = await Promise.all([listContacts(params), listCompanyOptions()]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
          <p className="mt-1 text-[var(--tazki-slate-500)]">Contactos comerciales y operativos por cliente.</p>
        </div>
        <Link href="/contacts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo contacto
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-4">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por Cliente ID, cliente, RUT, nombre, correo o telefono" />
            <select
              name="company_id"
              defaultValue={params.company_id ?? "all"}
              className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
            >
              <option value="all">Todos los clientes</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {(company.trade_name || company.legal_name || "Cliente sin nombre") +
                    (company.internal_code ? ` · ${company.internal_code}` : "")}
                </option>
              ))}
            </select>
            <select
              name="active"
              defaultValue={params.active ?? "all"}
              className="h-10 rounded-lg border border-[var(--tazki-slate-200)] bg-white px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        rows={contacts}
        columns={[
          {
            key: "name",
            header: "Contacto",
            render: (contact) => (
              <div>
                <p className="font-semibold text-[var(--tazki-slate-950)]">
                  <Link href={`/contacts/${contact.id}`} className="hover:underline">
                    {contact.first_name} {contact.last_name}
                  </Link>
                </p>
                <p className="text-xs text-[var(--tazki-slate-500)]">{contact.email}</p>
              </div>
            ),
          },
          {
            key: "company",
            header: "Cliente",
            render: (contact) => (
              <div className="space-y-0.5">
                <p className="font-medium text-[var(--tazki-slate-950)]">
                  {contact.companies?.trade_name ?? contact.companies?.legal_name ?? "-"}
                </p>
                <p className="text-xs text-[var(--tazki-slate-500)]">
                  {contact.companies?.internal_code ? `Cliente ID ${contact.companies.internal_code}` : "Cliente ID -"}
                  {contact.companies?.rut ? ` · ${contact.companies.rut}` : ""}
                </p>
              </div>
            ),
          },
          { key: "role", header: "Rol", render: (contact) => contact.role ?? "-" },
          { key: "area", header: "Area", render: (contact) => contact.area ?? "-" },
          {
            key: "state",
            header: "Estado",
            render: (contact) => (contact.is_active ? "Activo" : "Inactivo"),
          },
          {
            key: "actions",
            header: "Acciones",
            render: (contact) => (
              <div className="flex items-center gap-4 text-sm font-medium text-[var(--tazki-blue-700)]">
                <Link href={`/contacts/${contact.id}`}>Ver</Link>
                <Link href={`/contacts/${contact.id}/edit`}>Editar</Link>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
