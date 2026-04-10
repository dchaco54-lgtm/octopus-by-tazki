import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/shared/contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateContactAction } from "@/modules/contacts/actions";
import { getContactById, listCompanyOptions } from "@/services/contacts-service";

interface EditContactPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditContactPage({ params, searchParams }: EditContactPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [contact, companies] = await Promise.all([getContactById(id), listCompanyOptions()]);

  if (!contact) {
    notFound();
  }

  const boundAction = updateContactAction.bind(null, id);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Editar contacto</h1>
        <Link href={`/contacts/${id}`} className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Volver al detalle
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {contact.first_name} {contact.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{query.error}</p>}
          <ContactForm action={boundAction} companies={companies} submitLabel="Guardar cambios" defaultValues={contact} />
        </CardContent>
      </Card>
    </section>
  );
}
