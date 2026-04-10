import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContactById } from "@/services/contacts-service";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {contact.first_name} {contact.last_name}
          </h1>
          <p className="mt-1 text-[var(--tazki-slate-500)]">{contact.email}</p>
          <p className="mt-1 text-xs text-[var(--tazki-slate-500)]">
            {contact.companies?.internal_code ? `Cliente ID ${contact.companies.internal_code}` : "Cliente ID -"}
            {contact.companies?.rut ? ` · RUT ${contact.companies.rut}` : ""}
          </p>
        </div>
        <Link href={`/contacts/${id}/edit`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Editar contacto
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacion general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--tazki-slate-700)]">
          <p>
            <span className="font-semibold">Cliente:</span>{" "}
            {contact.company_id ? (
              <Link href={`/clients/${contact.company_id}`} className="text-[var(--tazki-blue-700)] hover:underline">
                {contact.companies?.trade_name ?? contact.companies?.legal_name ?? "-"}
              </Link>
            ) : (
              contact.companies?.trade_name ?? contact.companies?.legal_name ?? "-"
            )}
          </p>
          <p>
            <span className="font-semibold">Cliente ID:</span> {contact.companies?.internal_code ?? "-"}
          </p>
          <p>
            <span className="font-semibold">RUT cliente:</span> {contact.companies?.rut ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Rol:</span> {contact.role || "-"}
          </p>
          <p>
            <span className="font-semibold">Area:</span> {contact.area || "-"}
          </p>
          <p>
            <span className="font-semibold">Telefono:</span> {contact.phone || "-"}
          </p>
          <p>
            <span className="font-semibold">Primario:</span> {contact.is_primary ? "Si" : "No"}
          </p>
          <p>
            <span className="font-semibold">Estado:</span> {contact.is_active ? "Activo" : "Inactivo"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
