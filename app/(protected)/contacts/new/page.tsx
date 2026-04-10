import Link from "next/link";
import { ContactForm } from "@/components/shared/contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createContactAction } from "@/modules/contacts/actions";
import { listCompanyOptions } from "@/services/contacts-service";

interface NewContactPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewContactPage({ searchParams }: NewContactPageProps) {
  const [params, companies] = await Promise.all([searchParams, listCompanyOptions()]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo contacto</h1>
        <Link href="/contacts" className="text-sm font-semibold text-[var(--tazki-blue-700)]">
          Volver a contactos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de contacto</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--tazki-danger)]">{params.error}</p>}
          <ContactForm action={createContactAction} companies={companies} submitLabel="Crear contacto" />
        </CardContent>
      </Card>
    </section>
  );
}
